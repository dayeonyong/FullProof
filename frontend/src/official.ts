/** UI adapter for official final-mentor-v11 @7998973. No client-side verdicts. */
import type {Case,Draft,Proof,System,Mapping,Scenario,Verification,VerificationRequest} from './api';
import {mappingMessage,reviewMessage,closeMessage} from './signing';
import {signedMessage,walletAccount} from './wallet';
import {sendWalletContractTransaction} from './walletTransaction';
import {computeIntegrity,type IntegrityData} from './integrity';
import {startVerification} from './verificationRequests';
const base=typeof window!=='undefined'&&window.location.hostname.endsWith('.vercel.app')?'/backend':(import.meta.env.VITE_API_BASE_URL||'/backend');
export async function request<T>(path:string,body?:unknown):Promise<T>{
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),150000);
 const method=body===undefined?'GET':'POST';
 try{
  const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
  const contentType=res.headers.get('content-type')||'';
  let out:unknown;
  try{
   const responseText=await res.text();
   if(!contentType.includes('json'))throw Error('INVALID_CONTENT_TYPE');
   out=JSON.parse(responseText);
  }catch{
   throw Object.assign(Error(`백엔드가 JSON 응답을 보내지 않았습니다 (HTTP ${res.status}). Render 서버 상태와 Vercel /backend 프록시를 확인해 주세요.`),{status:res.status||502,code:'INVALID_BACKEND_RESPONSE'});
  }
  const data=out as {success?:boolean;data?:unknown;error?:{message?:string;code?:string};detail?:unknown};
  if(!res.ok||data.success===false){
   const detail=data.error?.message||data.detail||'API 요청 실패';
   throw Object.assign(Error(`HTTP ${res.status}: ${typeof detail==='string'?detail:JSON.stringify(detail)}`),{status:res.status||502,code:data.error?.code||'OFFICIAL_API_ERROR'});
  }
  return (data.success===true?data.data:data) as T;
 }catch(e){
  if((e as {status?:number}).status)throw e;
  const message=e instanceof Error?e.message:'알 수 없는 네트워크 오류';
  if(e instanceof Error&&e.name==='AbortError')throw Object.assign(Error('백엔드 응답 시간이 초과됐습니다. Render 서비스 상태를 확인해 주세요.'),{code:'BACKEND_TIMEOUT',status:0});
  throw Object.assign(Error(method==='POST'
   ?'서버 응답을 확인하지 못했습니다. 중복 거래 방지를 위해 재전송 전에 기존 기록을 조회하세요. ('+message+')'
   :'백엔드 연결에 실패했습니다. Render 서비스 상태와 Vercel /backend 연결을 확인해 주세요. ('+message+')'),{code:method==='POST'?'CONNECTION_UNKNOWN':'CONNECTION_ERROR',status:0});
 }finally{clearTimeout(timeout)}
}
const getCase=(id:string)=>request<Case>('/api/v1/frontend/cases/'+encodeURIComponent(id));
async function getConfig():Promise<System>{
 const value=await request<System>('/api/v1/frontend/status');
 if(!value.chain||!value.ai||!value.capabilities)throw Error('frontend/status 응답 구조가 화면 규격과 다릅니다. 공식 백엔드 버전을 확인해 주세요.');
 return {...value,chain:{...value.chain,rpc_url:import.meta.env.VITE_PUBLIC_RPC_URL||value.chain.rpc_url||window.location.origin+'/rpc'}};
}
const time='2026-10-18T05:00:00Z';
export const scenarios:Scenario[]=['supported','contradicted','insufficient','ambiguous'].map(id=>({id,title:({supported:'정상 일치',contradicted:'결과 불일치',insufficient:'증빙 부족',ambiguous:'연결 근거 부족'} as Record<string,string>)[id],note:'가상 통신사 자료',claim_text:'2026년 10월 18일 14시에 P001과 통화에 성공했다.',result:id==='insufficient'?null:id==='contradicted'?'CALL_FAILED':'CALL_CONNECTED'}));
function scenarioClaim(c:Case){return scenarios[0].claim_text+(c.scenario_id==='ambiguous'?'':` CALL_REF[DEMO-TEL:CALL-${c.case_id}]`)}
function content(p:Proof){const keys='schema_version proof_id proof_version case_id step_id issuer_agency_id agency_address proof_type call_id target_id action_type proof_occurred_at proof_issued_at result source_sha256'.split(' ');return Object.fromEntries(keys.map(k=>[k,(p as unknown as Record<string,unknown>)[k]]))}
const drafts=new Map<string,{proof:Proof;typed_data:Draft['typed_data']}>();
let lastCase:Case|null=null;
export async function officialRequest<T>(path:string,body?:unknown):Promise<T>{
 const result=await dispatch(path,body as Record<string,unknown>|undefined);return result as T;
}
async function createSepoliaDemoCase(id:string,title:string,config:System):Promise<{case_id:string}>{
 const police='0xF28d8E3890918c9E2A21C3Ed5C59fb450c977494';
 const account=await walletAccount(police,11155111,config.chain.rpc_url);
 if(!window.ethereum)throw Error('MetaMask가 필요합니다.');
 const pendingKey='fullproof.sepolia.case.'+id;
 let txHash=sessionStorage.getItem(pendingKey);
 if(!txHash){
  const prepared=await request<{from:string;to:string;data:string;gas:string;value:string}>('/api/v1/browser-transactions/cases/prepare',{case_id:id,police_address:account});
  if(prepared.from.toLowerCase()!==account.toLowerCase()||prepared.to.toLowerCase()!==config.chain.contract_address?.toLowerCase())throw Error('계약 또는 지갑 주소 불일치');
  txHash=await sendWalletContractTransaction(window.ethereum,prepared);
  sessionStorage.setItem(pendingKey,txHash);
 }
 const confirmPath='/api/v1/browser-transactions/cases/confirm';
 for(let attempt=0;attempt<5;attempt++){
  try{
   const record=await request<{case_id:string}>(confirmPath,{case_id:id,title,police_address:account,tx_hash:txHash});
   sessionStorage.removeItem(pendingKey);
   return record;
  }catch(error){
   if((error as {status?:number}).status!==409||attempt===4)throw error;
   await new Promise<void>(resolve=>setTimeout(resolve,2500));
  }
 }
 throw Error('사건 거래 확인이 완료되지 않았습니다. 동일한 사건으로 재확인해 주세요.');
}

async function createSepoliaDemoStep(id:string,config:System):Promise<void>{
 const police='0xF28d8E3890918c9E2A21C3Ed5C59fb450c977494';
 const account=await walletAccount(police,11155111,config.chain.rpc_url);
 if(!window.ethereum)throw Error('MetaMask가 필요합니다.');
 const stepName='통화 사실 확인';
 const pendingKey='fullproof.sepolia.step.'+id;
 let hash=sessionStorage.getItem(pendingKey);
 if(!hash){
  const prepared=await request<{from:string;to:string;data:string;gas:string;value:string}>(
   '/api/v1/browser-transactions/cases/'+encodeURIComponent(id)+'/steps/prepare',
   {police_address:account,step_name:stepName,is_required:true});
  if(prepared.from.toLowerCase()!==account.toLowerCase()||prepared.to.toLowerCase()!==config.chain.contract_address?.toLowerCase())throw Error('수사 단계 거래 주소 불일치');
  hash=await sendWalletContractTransaction(window.ethereum,prepared);
  sessionStorage.setItem(pendingKey,hash);
 }
 const confirmPath='/api/v1/browser-transactions/cases/'+encodeURIComponent(id)+'/steps/confirm';
 for(let attempt=0;attempt<5;attempt++){
  try{
   await request(confirmPath,{police_address:account,step_name:stepName,is_required:true,tx_hash:hash});
   sessionStorage.removeItem(pendingKey);
   return;
  }catch(error){
   if((error as {status?:number}).status!==409||attempt===4)throw error;
   await new Promise<void>(resolve=>setTimeout(resolve,2500));
  }
 }
}

async function completeSepoliaVerification(job:VerificationRequest,config:System):Promise<VerificationRequest>{
 if(job.request_state!=='AWAITING_WALLET')return job;
 if(!window.ethereum)throw Error('AI 검증 결과를 기록하려면 MetaMask가 필요합니다.');
 const recorder=await walletAccount('0xF28d8E3890918c9E2A21C3Ed5C59fb450c977494',11155111,config.chain.rpc_url);
 const endpoint='/api/v1/browser-transactions/verifications/'+encodeURIComponent(job.verification_id)+'/';
 const pendingKey='fullproof.sepolia.verification.'+job.verification_id;
 let hash=sessionStorage.getItem(pendingKey);
 if(!hash){
  const prepared=await request<{from:string;to:string;data:string;gas:string;value:string}>(endpoint+'prepare',{recorder_address:recorder});
  if(prepared.from.toLowerCase()!==recorder.toLowerCase()||prepared.to.toLowerCase()!==config.chain.contract_address?.toLowerCase())throw Error('검증 결과 거래 주소 불일치');
  hash=await sendWalletContractTransaction(window.ethereum,prepared);
  sessionStorage.setItem(pendingKey,hash);
 }
 for(let attempt=0;attempt<5;attempt++){
  try{
   await request(endpoint+'confirm',{recorder_address:recorder,tx_hash:hash});
   sessionStorage.removeItem(pendingKey);
   return request<VerificationRequest>('/api/v1/verification-requests/'+encodeURIComponent(job.verification_id));
  }catch(error){
   if((error as {status?:number}).status!==409||attempt===4)throw error;
   await new Promise<void>(resolve=>setTimeout(resolve,2500));
  }
 }
 throw Error('검증 결과 거래 확인 실패. 기존 거래 해시로 다시 확인해 주세요.');
}

async function dispatch(path:string,b?:Record<string,unknown>):Promise<unknown>{
 if(path==='/api/v1/demo/session')return {token:'LOCAL_UI_ROLE_ONLY'}; // UI role is NOT authentication
 if(path==='/api/v1/system/status')return getConfig();
 if(path==='/api/v1/demo/scenarios')return scenarios.map(s=>({...s,claim_text:lastCase?scenarioClaim(lastCase):s.claim_text}));
 if(path==='/api/v1/cases'&&!b){const rows=await request<Case[]>('/api/v1/frontend/cases');return rows}
 if(path==='/api/v1/cases'&&b){
  const config=await getConfig();
  const casePendingKey='fullproof.sepolia.pendingCase';
  const savedCaseId=config.chain.chain_id===11155111?sessionStorage.getItem(casePendingKey):null;
  const id=savedCaseId||`FP-${b.scenario_id||'supported'}-${crypto.randomUUID().slice(0,8)}`;
  if(config.chain.chain_id===11155111&&!savedCaseId)sessionStorage.setItem(casePendingKey,id);
  let existingCase:{case_id:string}|null=null;
  if(savedCaseId){
   try{existingCase=await request<{case_id:string}>('/api/v1/cases/'+encodeURIComponent(id));}
   catch(error){if((error as {status?:number}).status!==404)throw error;}
  }
  const record=existingCase||(config.chain.chain_id===11155111
   ? await createSepoliaDemoCase(id,String(b.title||''),config)
   : await request<{case_id:string}>('/api/v1/cases',{case_id:id,title:b.title}));
  try{if(config.chain.chain_id===11155111){
       const state=await getCase(id);
       if(!state.steps?.length)await createSepoliaDemoStep(id,config);
      }else await request('/api/v1/cases/'+id+'/steps',{step_name:'통화 사실 확인',is_required:true})}catch(e){throw Error('사건은 생성되었지만 단계 생성 응답이 불명확합니다. 사건을 열어 단계 상태를 확인하세요. '+(e as Error).message)}
  const finished=await getCase(record.case_id);
  if(config.chain.chain_id===11155111)sessionStorage.removeItem(casePendingKey);
  return finished;
 }
 let match=path.match(/^\/api\/v1\/cases\/([^/]+)$/);
 if(match){lastCase=await getCase(match[1]);return lastCase}
 match=path.match(/^\/api\/v1\/cases\/([^/]+)\/claims$/);
 if(match&&b){
  const c=await getCase(match[1]),latest=c.claims.filter(x=>x.claim_id===b.claim_id).at(-1);
  const data={claim_id:String(b.claim_id||'CL-'+crypto.randomUUID()),claim_version:b.claim_id?(latest?.claim_version||0)+1:1,claim_text:String(b.claim_text||''),step_id:Number(b.step_id)};
  const config=await getConfig();
  if(config.chain.chain_id!==11155111)return request(path,data);
  const account=await walletAccount('0xF28d8E3890918c9E2A21C3Ed5C59fb450c977494',11155111,config.chain.rpc_url);
  if(!window.ethereum)throw Error('MetaMask가 필요합니다.');
  const endpoint='/api/v1/browser-transactions/cases/'+encodeURIComponent(match[1])+'/claims/';
  const pendingKey='fullproof.sepolia.claim.'+match[1]+'.'+data.step_id;
  type PendingClaim={claim_id:string;claim_version:number;claim_text:string;step_id:number;tx_hash:string;created_at:number};
  let pending:PendingClaim|null=null;
  const saved=sessionStorage.getItem(pendingKey);
  if(saved){try{pending=JSON.parse(saved) as PendingClaim}catch{throw Error('이전 Claim 거래 정보를 읽을 수 없습니다. 기록을 확인해 주세요.');}}
  if(pending){
   if(pending.claim_text!==data.claim_text||pending.step_id!==data.step_id)
    throw Error('처리 중인 Claim 거래가 있습니다. 기존 Claim을 먼저 확인해 주세요.');
   data.claim_id=pending.claim_id;
   data.claim_version=pending.claim_version;
  }else{
   const prep=await request<{from:string;to:string;data:string;gas:string;value:string;created_at:number}>(endpoint+'prepare',{...data,police_address:account});
   if(prep.to.toLowerCase()!==config.chain.contract_address?.toLowerCase()||prep.from.toLowerCase()!==account.toLowerCase())throw Error('Claim 계약 또는 경찰 지갑 주소 불일치');
   const hash=await sendWalletContractTransaction(window.ethereum,prep);
   pending={...data,tx_hash:hash,created_at:prep.created_at};
   sessionStorage.setItem(pendingKey,JSON.stringify(pending));
  }
  const result=await request(endpoint+'confirm',{...data,police_address:account,tx_hash:pending.tx_hash,created_at:pending.created_at});
  sessionStorage.removeItem(pendingKey);
  return result;
 }
 match=path.match(/^\/api\/v1\/claims\/([^/]+)\/extract$/);
 if(match&&b){const c=await findClaim(match[1]),claim=c.claims.find(x=>x.claim_id===match![1]&&x.claim_version===Number(b.claim_version||c.claims.at(-1)?.claim_version))!;const result=await request(path,{case_id:c.case_id,claim_version:claim.claim_version});return {...result as object,execution:{is_simulated:(await getConfig()).ai.is_simulated}}}
 if(path==='/api/v1/proofs/drafts'&&b){
  const c=await getCase(String(b.case_id)),config=await getConfig();
  if(!config.chain.agency_address||!config.chain.signer_address)throw Error('UI_AGENCY_ADDRESS와 기관 등록 지갑을 백엔드에 설정해 주세요.');
  const proofId=String(b.proof_id||'PR-'+crypto.randomUUID());
  const proof={schema_version:'1.1',proof_id:proofId,proof_version:1,case_id:c.case_id,step_id:Number(b.step_id||0),issuer_agency_id:'DEMO-TEL',agency_address:config.chain.agency_address,proof_type:'CALL_LOG',call_id:'CALL-'+c.case_id,target_id:'P001',action_type:'PHONE_CALL',proof_occurred_at:time,proof_issued_at:'2026-10-18T05:01:00Z',result:c.scenario_id==='contradicted'?'CALL_FAILED':'CALL_CONNECTED',source_sha256:'0x'+'0'.repeat(64)};
  const source=JSON.stringify({...proof,note:'가상 통신사 자료 · 실제 개인정보 없음'});
  const response=b.proof_id?await request<{proof_content:Proof;proof_hash:string;typed_data:Draft['typed_data']}>('/api/v1/frontend/drafts/'+c.case_id+'/'+proofId+'/'+String(b.proof_version||1)):await request<{proof_content:Proof;proof_hash:string;typed_data:Draft['typed_data']}>(path,{proof_content:proof,source_text:source,nonce:config.chain.agency_nonce,deadline:Math.floor(Date.now()/1000)+900});
  const p={...response.proof_content,proof_hash:response.proof_hash};drafts.set(proofId,{proof:p,typed_data:response.typed_data});
  return {draft_id:proofId,proof:p,typed_data:response.typed_data,signer_address:config.chain.signer_address,rpc_url:config.chain.rpc_url,domain_warning:'기관 Proof만 서명합니다. 이후 백엔드가 거래를 제출하며, 서명 자체는 온체인 저장 완료가 아닙니다.'};
 }
 if(path==='/api/v1/proofs/anchor'&&b){
  const draft=drafts.get(String(b.draft_id));if(!draft)throw Error('현재 화면에서 생성한 서명 초안이 없습니다. 저장된 증빙을 조회해 주세요.');
  const p=draft.proof,m=draft.typed_data.message;
  const payload={case_id:p.case_id,step_id:p.step_id,proof_id:p.proof_id,proof_version:p.proof_version,proof_hash:p.proof_hash,occurred_at:Number(m.occurredAt),issued_at:Number(m.issuedAt),agency:m.agency,nonce:Number(m.nonce),deadline:Number(m.deadline),signature:b.signature};
  const config=await getConfig();
  if(config.chain.chain_id!==11155111)return request(path,payload);
  if(!window.ethereum)throw Error('MetaMask가 필요합니다.');
  const payer=await walletAccount('0xF28d8E3890918c9E2A21C3Ed5C59fb450c977494',11155111,config.chain.rpc_url);
  const pendingKey='fullproof.sepolia.proof.'+p.case_id+'.'+p.proof_id+'.'+p.proof_version;
  type PendingProof={tx_hash:string;payload:typeof payload};
  let pending:PendingProof|null=null;
  const stored=sessionStorage.getItem(pendingKey);
  if(stored){try{pending=JSON.parse(stored) as PendingProof}catch{throw Error('Proof 거래 복구 기록을 읽을 수 없습니다.');}}
  if(pending){
   if(pending.payload.signature!==payload.signature)throw Error('기존 Proof 거래 처리 중입니다. 이전 서명 거래를 확인하세요.');
  }else{
   const prepared=await request<{from:string;to:string;data:string;gas:string;value:string}>('/api/v1/browser-transactions/proofs/prepare',{...payload,payer_address:payer});
   if(prepared.from.toLowerCase()!==payer.toLowerCase()||prepared.to.toLowerCase()!==config.chain.contract_address?.toLowerCase())throw Error('Proof 지갑 또는 계약 주소 불일치');
   const hash=await sendWalletContractTransaction(window.ethereum,prepared);
   pending={tx_hash:hash,payload};
   sessionStorage.setItem(pendingKey,JSON.stringify(pending));
  }
  const result=await request('/api/v1/browser-transactions/proofs/confirm',{...pending.payload,payer_address:payer,tx_hash:pending.tx_hash});
  sessionStorage.removeItem(pendingKey);
  return result;
 }
 match=path.match(/^\/api\/v1\/claims\/([^/]+)\/proof-mappings$/);
 if(match&&b){
  const c=await findClaim(match[1]),claim=c.claims.find(x=>x.claim_id===match![1]&&x.claim_version===b.claim_version)!,p=c.proofs.find(x=>x.proof_id===b.proof_id&&x.proof_version===b.proof_version)!;
  if(!p||!claim)throw Error('선택한 Claim·Proof 버전을 다시 조회해 주세요.');
  // Reuse a pending record after wallet rejection. Never create a duplicate CONFIRMED mapping.
  const existing=c.mappings.find(x=>x.claim_id===claim.claim_id&&x.claim_version===claim.claim_version&&x.proof_id===p.proof_id&&x.proof_version===p.proof_version&&['PENDING','CONFIRMED'].includes(x.mapping_status));
  if(existing?.mapping_status==='CONFIRMED')return existing;
  const m=existing||await request<Mapping>(path,{case_id:c.case_id,step_id:claim.step_id,claim_version:claim.claim_version,claim_text:claim.claim_text,proof_id:p.proof_id,proof_version:p.proof_version,issuer_agency_id:p.issuer_agency_id,call_id:p.call_id,mapping_method:'MANUAL_SELECTION',mapping_status:'PENDING'});
  const note=String(b.evidence_note||'선택한 통화 ID와 기관 원본을 확인하여 연결을 확정합니다.');
  const config=await getConfig();const signed=await signedMessage(config,'reviewer',()=>mappingMessage(c.case_id,m as unknown as Record<string,unknown>,claim.claim_hash,p.proof_hash,p.source_sha256,note));
  return request(path+'/'+m.mapping_id+'/confirm',{case_id:c.case_id,claim_text:claim.claim_text,evidence_source_sha256:p.source_sha256,evidence_note:note,signer_address:signed.account,signature:signed.signature});
 }
 if(path==='/api/v1/verifications'&&b){
  const c=await findClaim(String(b.claim_id)),claim=c.claims.find(x=>x.claim_id===b.claim_id&&x.claim_version===b.claim_version)!;
  const maps=c.mappings.filter(m=>m.claim_id===claim.claim_id&&m.claim_version===claim.claim_version&&m.mapping_status==='CONFIRMED');
  const proofs=c.proofs.filter(p=>maps.some(m=>m.proof_id===p.proof_id&&m.proof_version===p.proof_version));
  const config=await getConfig();
  const transport=async <T>(url:string,body?:unknown):Promise<T>=>{
   const job=await request<T>(url,body);
   if(config.chain.chain_id===11155111&&url.startsWith('/api/v1/verification-requests')&&job&&typeof job==='object'&&'request_state' in job&&job.request_state==='AWAITING_WALLET')
    return (await completeSepoliaVerification(job as unknown as VerificationRequest,config)) as T;
   return job;
  };
  return startVerification(transport,{claim:{case_id:c.case_id,claim_id:claim.claim_id,claim_version:claim.claim_version},proofs:proofs.map(content)});
 }
 match=path.match(/^\/api\/v1\/verifications\/([^/]+)$/);
 if(match&&!b){
  const job=await request<VerificationRequest>('/api/v1/verification-requests/'+encodeURIComponent(match[1]));
  if(job.request_state!=='CONFIRMED'||!job.result?.verification_tx_hash)throw Error('검증 요청 상태: '+job.request_state+' · 기존 요청 상태 조회에서 확인하세요.');
  return job.result;
 }
 match=path.match(/^\/api\/v1\/verifications\/([^/]+)\/reviews$/);
 if(match){
  const c=await findVerification(match[1]),v=c.verifications.find(x=>x.verification_id===match![1])!;
  if(!b)return {items:c.reviews?.filter(x=>x.verification_id===v.verification_id)||[]};
  const config=await getConfig();
  if(config.chain.chain_id===11155111){
   const admin=config.chain.admin_address;
   if(!admin||!config.chain.contract_address)throw Error('관리자 계정 설정을 확인해 주세요.');
   const account=await walletAccount(admin,11155111,config.chain.rpc_url);
   const provider=window.ethereum;
   if(!provider)throw Error('MetaMask가 필요합니다.');
   const reviewStatus=String(b.review_status);
   const reason=String(b.reason_text||'');
   const pendingKey='fullproof.sepolia.review.'+config.chain.contract_address.toLowerCase()+'.'+v.verification_id;
   let pending:{txHash:string;account:string;reviewStatus:string;reason:string}|null=null;
   const stored=sessionStorage.getItem(pendingKey);
   if(stored){
    try{pending=JSON.parse(stored) as {txHash:string;account:string;reviewStatus:string;reason:string}}
    catch{throw Error('이전 관리자 검토 기록을 읽지 못했습니다. 거래 기록을 확인해 주세요.')}
   }
   if(pending&&(pending.account.toLowerCase()!==account.toLowerCase()||pending.reviewStatus!==reviewStatus||pending.reason!==reason))
    throw Error('이미 제출한 관리자 검토 거래가 있습니다. 기존 처리 상태를 확인해 주세요.');
   let txHash=pending?.txHash;
   if(!txHash){
    const prepared=await request<{from:string;to:string;data:string;gas:string;value:string}>(
     '/api/v1/browser-transactions/verifications/'+encodeURIComponent(v.verification_id)+'/reviews/prepare',
     {admin_address:account,review_status:reviewStatus,reason_code:null,reason_text:reason});
    if(prepared.from.toLowerCase()!==account.toLowerCase()||
       prepared.to.toLowerCase()!==config.chain.contract_address.toLowerCase())throw Error('관리자 거래 계약이 일치하지 않습니다.');
    txHash=await sendWalletContractTransaction(provider,prepared);
    sessionStorage.setItem(pendingKey,JSON.stringify({txHash,account,reviewStatus,reason}));
   }
   const endpoint='/api/v1/browser-transactions/verifications/'+encodeURIComponent(v.verification_id)+'/reviews/confirm';
   for(let attempt=0;attempt<5;attempt++){
    try{
     const confirmed=await request(endpoint,{tx_hash:txHash,admin_address:account,review_status:reviewStatus,reason_code:null,reason_text:reason});
     sessionStorage.removeItem(pendingKey);
     return confirmed;
    }catch(error){
     if((error as {status?:number}).status!==409||attempt===4)throw error;
     await new Promise<void>(resolve=>setTimeout(resolve,2500));
    }
   }
   throw Error('관리자 거래 확인이 완료되지 않았습니다.');
  }
  const data:Record<string,unknown>={review_status:b.review_status,reason_code:null,reason_text:b.reason_text,nonce:crypto.randomUUID(),deadline:Math.floor(Date.now()/1000)+900};
  const signed=await signedMessage(config,'admin',account=>{data.signer_address=account;return reviewMessage(config.chain.chain_id!,config.chain.contract_address!,v.verification_id,v.verification_hash,data)});
  return request(path,{...data,signature:signed.signature});
 }
 match=path.match(/^\/api\/v1\/cases\/([^/]+)\/close$/);
 if(match&&b){
  const config=await getConfig();
  if(config.chain.chain_id===11155111){
   const admin=config.chain.admin_address;
   if(!admin||!config.chain.contract_address)throw Error('관리자 지갑 또는 컨트랙트 주소 설정이 없습니다.');
   const account=await walletAccount(admin,11155111,config.chain.rpc_url);
   const reason=String(b.reason_text||'').trim();
   const provider=window.ethereum;
   if(!provider)throw Error('MetaMask가 필요합니다.');
   const pendingKey='fullproof.sepolia.close.'+config.chain.contract_address.toLowerCase()+'.'+match[1];
   let pending: {txHash:string;account:string;reason:string}|null=null;
   try {
    const stored=sessionStorage.getItem(pendingKey);
    if(stored)pending=JSON.parse(stored) as {txHash:string;account:string;reason:string};
   } catch { throw Error('이전 종결 거래 정보를 확인할 수 없습니다. 기존 기록을 확인해 주세요.'); }
   if(pending&&(pending.account.toLowerCase()!==account.toLowerCase()||pending.reason!==reason))
    throw Error('확인 대기 중인 이전 종결 거래가 있습니다. 기존 종결 사유와 계정으로 결과를 확인해 주세요.');
   let txHash=pending?.txHash;
   if(!txHash){
    const prepared=await request<{from:string;to:string;data:string;gas:string;value:string}>(
     '/api/v1/browser-transactions/cases/'+encodeURIComponent(match[1])+'/close/prepare',
     {admin_address:account,reason});
    if(prepared.from.toLowerCase()!==account.toLowerCase()||
       prepared.to.toLowerCase()!==config.chain.contract_address.toLowerCase())throw Error('관리자 거래 대상이 일치하지 않습니다.');
    txHash=await sendWalletContractTransaction(provider,{
     from:prepared.from,to:prepared.to,data:prepared.data,gas:prepared.gas,value:prepared.value
    });
   }
   if(!pending)sessionStorage.setItem(pendingKey,JSON.stringify({txHash,account,reason}));
   const confirmationPath='/api/v1/browser-transactions/cases/'+encodeURIComponent(match[1])+'/close/confirm';
   for(let attempt=0;attempt<5;attempt++){
    try{
     const result=await request(confirmationPath,{tx_hash:txHash,admin_address:account,reason});
     sessionStorage.removeItem(pendingKey);
     return result;
    }catch(error){
     const status=(error as {status?:number}).status;
     if(status!==409||attempt===4)throw error;
     await new Promise<void>(resolve=>setTimeout(resolve,2500));
    }
   }
   throw Error('거래 상태를 확인하지 못했습니다. 다시 확인하면 기존 거래를 재사용합니다.');
  }
  const data:Record<string,unknown>={reason:b.reason_text,nonce:crypto.randomUUID(),deadline:Math.floor(Date.now()/1000)+900};
  const signed=await signedMessage(config,'admin',account=>{data.signer_address=account;return closeMessage(config.chain.chain_id!,config.chain.contract_address!,match![1],data)});
  return request(path,{...data,signature:signed.signature});
 }
 if(path==='/api/v1/blockchain/transactions'){
  const cases=await request<Case[]>('/api/v1/frontend/cases');return cases.flatMap(c=>[...c.claims.map(x=>({request_id:x.claim_tx_hash,tx_hash:x.claim_tx_hash,chain_status:x.chain_status,kind:'CLAIM'})),...c.proofs.filter(x=>x.proof_tx_hash).map(x=>({request_id:x.proof_tx_hash,tx_hash:x.proof_tx_hash,chain_status:x.chain_status,kind:'PROOF'})),...c.verifications.filter(x=>x.verification_tx_hash).map(x=>({request_id:x.verification_tx_hash,tx_hash:x.verification_tx_hash,chain_status:x.chain_status,kind:'VERIFICATION'})),...(c.reviews||[]).filter(x=>x.review_tx_hash).map(x=>({request_id:x.review_tx_hash,tx_hash:x.review_tx_hash,chain_status:x.chain_status,kind:'REVIEW'})),...(c.close_tx_hash?[{request_id:c.close_tx_hash,tx_hash:c.close_tx_hash,chain_status:'CONFIRMED',kind:'CLOSE'}]:[])]);
 }
 match=path.match(/^\/api\/v1\/blockchain\/transactions\/(.+)$/);if(match)return request('/api/v1/frontend/transactions/'+match[1]);
 if(path.endsWith('/integrity'))return computeIntegrity(await request<IntegrityData>(path+'-data'));

 return request(path,b);
}
async function findClaim(id:string){const rows=await request<Case[]>('/api/v1/frontend/cases');const c=rows.find(x=>x.claims.some(y=>y.claim_id===id));if(!c)throw Error('Claim을 찾지 못했습니다.');return c}
async function findVerification(id:string){const rows=await request<Case[]>('/api/v1/frontend/cases');const c=rows.find(x=>x.verifications.some(y=>y.verification_id===id));if(!c)throw Error('검증을 찾지 못했습니다.');return c}

