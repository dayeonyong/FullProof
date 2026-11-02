import {OperationError} from './Details';
import {teamDraftPath} from './TeamDraftWorkspace';
import type {TeamDraft} from './TeamDraftWorkspace';
import {recoveredDemoCases} from './recoveredDemoCases';
import {caseTitle,caseReference} from './presentation';
import {useContext,useEffect,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,CheckCircle2,ChevronRight,FileCheck2,FileText,Fingerprint,FolderOpen,Layers3,RefreshCw,Search,ShieldCheck,UploadCloud,Clock3} from 'lucide-react';
import {api,fmt,isRecorded,short} from './api';
import type {Case,Role} from './api';
import {Session} from './session';
import {caseLink,latestVerifications,roleInfo} from './roles';
import {Badge,Empty,Loading,Notice} from './ui';

type RecoveredDemoRecord={case_id:string;title:string;source:string;network:string;read_only:boolean;steps:{step_id:number;step_name:string;status:string}[];claims:{claim_id:string;claim_text:string;claim_hash:string;claim_created_at:string;extraction_status:string;action_result:string|null}[];proofs:unknown[];verifications:unknown[]};
function statusFor(c:Case,role:Role){
 if(c.status==='CLOSED')return {title:'종결',note:'기록·증빙 이력 보존',value:'CLOSED'};
 const v=c.verifications.at(-1);
 if(role==='AGENCY')return c.proofs.some(p=>isRecorded(p.chain_status))?{title:'증빙 제공 완료',note:'서명된 원천 증빙 보관',value:'CONFIRMED'}:{title:c.proofs.length?'서명 대기':'증빙 준비',note:c.proofs.length?'기존 초안을 이어서 서명':'기관 증빙 발급 준비',value:'PENDING'};
 if(role==='ADMIN')return !v?{title:'검증 전',note:'수사담당자 검증 요청 대기',value:'PENDING'}:v.freshness_status!=='CURRENT'?{title:'재검증 필요',note:'최신 입력 기준 재확인',value:'NEEDS_REVERIFICATION'}:v.review_status==='ACCEPTED'?{title:'승인 완료',note:c.close_eligible?'종결 조건 충족':'나머지 종결 조건 확인',value:'ACCEPTED'}:{title:'검토 필요',note:'판정과 원천 근거 확인',value:v.verdict||'PENDING'};
 return !c.claims.length?{title:'원문 등록',note:'수사 진행 기록부터 시작',value:'PENDING'}:!c.claims.at(-1)?.structured_claim?{title:'AI 구조화',note:'행동·대상·시각 추출',value:'PENDING'}:!v?{title:'증빙 연결·검증',note:'원천기관 자료 비교',value:'PENDING'}:{title:'검증 결과 확인',note:v.freshness_status==='CURRENT'?'최신 입력 기준':'입력 변경·재검증 필요',value:v.freshness_status==='CURRENT'?v.verdict||'PENDING':'NEEDS_REVERIFICATION'};
}
export default function Dashboard(){
 const {role,system}=useContext(Session),info=roleInfo[role],navigate=useNavigate();
 const [cases,setCases]=useState<Case[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[newCaseTitle,setNewCaseTitle]=useState(''),[creating,setCreating]=useState(false),[query,setQuery]=useState(''),[filter,setFilter]=useState('ALL'),[region,setRegion]=useState('ALL'),[workOnly,setWorkOnly]=useState(false);
 const [teamDrafts,setTeamDrafts]=useState<TeamDraft[]>([]),[teamDraftTitle,setTeamDraftTitle]=useState(''),[teamDraftBusy,setTeamDraftBusy]=useState(false),[teamDraftError,setTeamDraftError]=useState('');
 const [archived,setArchived]=useState<RecoveredDemoRecord[]>([]),[archiveError,setArchiveError]=useState('');
 async function refresh(){setLoading(true);setError('');try{setCases(await api<Case[]>('/api/v1/cases'))}catch(e){setError(e instanceof Error?e.message:'사건 조회 실패')}finally{setLoading(false)}}
 async function refreshTeamDrafts(){try{setTeamDrafts(await api<TeamDraft[]>('/api/v1/frontend/team-drafts'));setTeamDraftError('')}catch(e){setTeamDraftError(e instanceof Error?e.message:'시연 사건 조회 실패')}}
 async function createTeamDraft(){
  if(teamDraftBusy||!teamDraftTitle.trim())return;
  setTeamDraftBusy(true);setTeamDraftError('');
  try{const created=await api<TeamDraft>('/api/v1/frontend/team-drafts',{title:teamDraftTitle.trim()});setTeamDraftTitle('');await refreshTeamDrafts();navigate(teamDraftPath(created.draft_id))}
  catch(e){setTeamDraftError(e instanceof Error?e.message:'시연 사건 생성 실패')}finally{setTeamDraftBusy(false)}
 }
 async function refreshArchive(){try{setArchived(await api<RecoveredDemoRecord[]>('/api/v1/frontend/recovered-demo-cases'));setArchiveError('')}catch(e){setArchiveError(e instanceof Error?e.message:'복구 기록 조회 실패')}}
 useEffect(()=>{setWorkOnly(false);void refresh();void refreshArchive();void refreshTeamDrafts()},[role]); 
 async function createNewCase(){
  if(creating)return;
  if(!newCaseTitle.trim()){setError('사건명을 입력해 주세요.');return}
  if(system?.chain.chain_id===11155111&&!window.ethereum){setError('Sepolia 사건 등록에는 MetaMask가 필요합니다. 보안 경고가 해결되기 전에는 거래를 승인하지 마세요.');return}
  setCreating(true);setError('');
  try{
   if(system?.chain.chain_id===11155111){
    const preflight=await api<{ready:boolean;police_registered?:boolean;verification_recorder_registered?:boolean;reason?:string}>('/api/v1/frontend/sepolia-preflight');
    if(!preflight.ready)throw Error('Sepolia 사전 점검 실패: '+(preflight.reason||'수사담당자 또는 검증 기록자 권한을 확인해 주세요.')+' MetaMask 거래는 실행하지 않았습니다.');
   }
   const created=await api<Case>('/api/v1/cases',{title:newCaseTitle.trim(),scenario_id:'supported'});
   await refresh();
   navigate(caseLink(role,created.case_id));
  }catch(e){setError(e instanceof Error?e.message:'사건 등록 실패')}
  finally{setCreating(false)}
 }

 const latest=latestVerifications(cases),proofs=cases.flatMap(c=>c.proofs),pendingReviews=latest.filter(v=>v.review_status==='PENDING'),openCases=cases.filter(c=>c.status!=='CLOSED');
 const stats=role==='OFFICER'?[
  {name:'전체 사건',count:cases.length,note:'현재 등록된 사건',icon:FolderOpen,unit:'건'},
  {name:'진행 중 사건',count:openCases.length,note:'종결 전 업무 대상 사건',icon:Clock3,unit:'건'},
  {name:'증빙이 뒷받침하는 검증',count:latest.filter(v=>v.verdict==='SUPPORTED').length,note:'최신 검증 기준 · 종결 사건 포함',icon:CheckCircle2,unit:'건'},
  {name:'추가 확인 필요 검증',count:latest.filter(v=>v.verdict==='CONTRADICTED'||v.verdict==='INSUFFICIENT').length,note:'충돌·근거 부족 · 종결 사건 포함',icon:Search,unit:'건'}
 ]:role==='AGENCY'?[
  {name:'증빙 제공 대상 사건',count:openCases.filter(c=>c.claims.length>0).length,note:'수사 기록이 등록된 사건',icon:FolderOpen,unit:'건'},
  {name:'서명 대기 초안',count:proofs.filter(p=>p.chain_status==='PENDING').length,note:'이미 만든 초안을 이어서 서명',icon:FileText,unit:'건'},
  {name:'제공 확인 증빙',count:proofs.filter(p=>isRecorded(p.chain_status)).length,note:'서명·기록 확인된 기관 Proof',icon:FileCheck2,unit:'건'},
  {name:'상태 확인 필요',count:proofs.filter(p=>['FAILED','UNKNOWN'].includes(p.chain_status)).length,note:'기존 기록 상태부터 확인',icon:Search,unit:'건'}
 ]:[
  {name:'검토 대기 검증',count:pendingReviews.length,note:'최신 검증 중 관리자 미확인',icon:Clock3,unit:'건'},
  {name:'보완 확인 필요',count:latest.filter(v=>v.verdict==='CONTRADICTED'||v.verdict==='INSUFFICIENT').length,note:'일치 여부와 근거를 함께 검토',icon:Search,unit:'건'},
  {name:'종결 가능 사건',count:openCases.filter(c=>c.close_eligible).length,note:'서버가 종결 조건 충족을 확인',icon:ShieldCheck,unit:'건'},
  {name:'종결 사건',count:cases.filter(c=>c.status==='CLOSED').length,note:'확인·승인 이력이 보존된 사건',icon:FileCheck2,unit:'건'}
 ];
 const rows=cases.filter(c=>(caseTitle(c.title)+' '+caseReference(c.case_id)+' '+c.case_id).toLowerCase().includes(query.toLowerCase())&&(filter==='ALL'||c.status===filter)&&(region==='ALL'||c.region===region)&&(!workOnly||(role==='AGENCY'?c.status!=='CLOSED'&&c.claims.length>0&&!c.proofs.some(p=>isRecorded(p.chain_status)):role==='ADMIN'?c.status!=='CLOSED'&&c.verifications.some(v=>v.freshness_status==='CURRENT'&&v.review_status!=='ACCEPTED'):c.status!=='CLOSED')));
 const activities=(role==='AGENCY'?cases.flatMap(c=>c.proofs.filter(p=>isRecorded(p.chain_status)).map(p=>({id:p.proof_id,case:c,title:'기관 증빙 제공',detail:p.call_id,date:p.proof_issued_at,value:p.chain_status}))):cases.flatMap(c=>c.verifications.map(v=>({id:v.verification_id,case:c,title:role==='ADMIN'?'검토 대상 검증':'수사행위 검증',detail:v.reason_text,date:v.created_at,value:v.verdict||v.processing_status})))).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,4);
 return <>
  <div className="page-title dashboard-title"><div><span className="eyebrow">WORKSPACE / {info.english}</span><h1 tabIndex={-1}>{info.title}</h1><p className="muted">{info.description}</p></div><button disabled={loading} onClick={()=>void refresh()}><RefreshCw size={15} className={loading?'spin':''}/>새로고침</button></div>
  <div className="workspace-intro"><div className="intro-copy"><span className="intro-kicker"><span/> {info.name} WORKSPACE</span><h2>{info.focus}</h2><p>{info.hint}</p><a href="#case-list" className="intro-link">{role==='AGENCY'?'제공 대상 확인':role==='ADMIN'?'검토 목록 확인':'사건 업무 시작'}<ArrowUpRight size={16}/></a></div><div className="workspace-art" aria-hidden="true"><img src={'/art/'+role.toLowerCase()+'.webp'} alt=""/></div></div>
  <div className="stats">{stats.map((s,i)=><div className={'stat stat-'+i} key={s.name}><div>{s.name}<s.icon size={18}/></div><strong>{s.count}<small>{s.unit}</small></strong><p>{s.note}</p></div>)}</div>
  {error&&<OperationError message={error}/>}
  <section className="panel" style={{padding:20,marginBottom:22}} aria-label="팀 시연 사건 임시 저장"><div className="section-title"><div><h2>팀 시연 사건 · 블록체인 기록 전</h2><p>사건과 Claim·Proof 초안을 먼저 입력합니다. MetaMask 없이 작성 가능하며, 실제 Sepolia 확정 기록과 구분됩니다.</p></div></div>
   {teamDraftError&&<p role="alert">{teamDraftError}</p>}
   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
    <input aria-label="팀 시연 사건명" placeholder="가상 사건명 입력" maxLength={120} value={teamDraftTitle} onChange={e=>setTeamDraftTitle(e.target.value)} style={{flex:'1 1 220px',padding:12}}/>
    <button type="button" className="primary" disabled={teamDraftBusy||!teamDraftTitle.trim()} onClick={()=>void createTeamDraft()}>{teamDraftBusy?'저장 중…':'사건 초안 생성 (MetaMask 불필요)'}</button>
   </div>
   {teamDrafts.length?<div className="scenario-cards">{teamDrafts.map(d=><Link className="scenario-card" key={d.draft_id} to={teamDraftPath(d.draft_id)}><strong>{d.title}</strong><p>{d.draft_id}</p><p>Claim {d.claim_text?'작성됨':'미작성'} · Proof {d.proof_text?'작성됨':'미작성'}</p><span>임시 저장 · Sepolia 미기록</span></Link>)}</div>:<p className="muted">저장된 팀 시연 사건 초안이 없습니다.</p>}
   <p className="caption">공개 시연 환경에는 가상 자료만 입력하세요. Render의 로컬 SQLite는 재배포 시 사라질 수 있어 영구 저장이 보장되지 않습니다.</p>
  </section>
  {role==='OFFICER'&&<details className="new-case scenario-picker" open><summary><Layers3 size={17}/>팀 API 등록 사건<span>서버에 저장된 사건만 표시<ChevronRight size={16}/></span></summary><div className="scenario-body"><div className="section-title"><div><h2>등록된 사건을 선택하세요.</h2><p>Render 백엔드에서 조회한 실제 사건 기록입니다. 선택만으로 새 블록체인 거래를 보내지 않습니다.</p></div></div>{loading?<Loading/>:cases.length?<div className="scenario-cards">{cases.map(c=><Link key={c.case_id} to={caseLink(role,c.case_id)} className="scenario-card"><div><FolderOpen size={17}/><span>{c.status==='CLOSED'?'종결':'진행 중'}</span></div><strong>{c.title}</strong><p>{c.case_id}</p></Link>)}</div>:<Empty>현재 백엔드에 등록된 사건이 없습니다. 이전에 로컬에서 만든 사건은 서버 데이터베이스에 없을 수 있습니다.</Empty>}<div className="scenario-footer"><label htmlFor="new-case-title">새 사건명</label><input id="new-case-title" aria-label="새 사건명" value={newCaseTitle} onChange={e=>setNewCaseTitle(e.target.value)} placeholder="새 사건 이름을 입력하세요" maxLength={120} disabled={creating}/><button type="button" className="primary" onClick={()=>void createNewCase()} disabled={creating||!newCaseTitle.trim()||!system?.chain.available}>{creating?'사건 등록 중…':'새 사건 등록'}</button></div><p className="caption">기존 사건은 팀 API에서 불러옵니다. 신규 사건은 Sepolia 등록 절차가 필요하며, 보안 경고가 있다면 MetaMask 거래를 승인하지 마세요.</p></div></details>}
  {role==='OFFICER'&&<section className="panel" aria-label="복구된 로컬 시연 사건"><div className="panel-heading"><div><span className="eyebrow">RECOVERED LOCAL ARCHIVE</span><h2>복구된 로컬 시연 사건 <span className="count-chip">{recoveredDemoCases.length}</span></h2><p className="muted">업로드한 SQLite 복구본에서 확인된 실제 로컬 시연 기록입니다. 현재 Sepolia에 등록된 사건이 아니며, 열람 전용 목록입니다.</p></div></div>{archiveError&&<p className="muted">복구 백엔드 API가 아직 배포되지 않았습니다. {archiveError}</p>}<div className="scenario-cards">{archived.length?archived.map(c=><details key={c.case_id} className="scenario-card" aria-label={c.title+' 로컬 시연 사건'}><summary><FolderOpen size={17}/> <strong>{c.title}</strong><p>{c.case_id}</p><p>수사 단계 {c.steps.length}개 · Claim {c.claims.length}건 · 읽기 전용</p></summary><div><strong>기존 수사 단계</strong>{c.steps.map(step=><p key={step.step_id}>{step.step_name} · {step.status}</p>)}<strong>복구된 Claim 원문</strong>{c.claims.map(claim=><div key={claim.claim_id}><p>{claim.claim_text}</p><p>추출 상태: {claim.extraction_status}</p><p>Claim ID: {claim.claim_id}</p><p>Claim 해시: <code>{claim.claim_hash}</code></p></div>)}<p>기존 로컬 DB의 Claim 원문입니다. Sepolia 검증이나 증빙 기록을 의미하지 않습니다.</p></div></details>):recoveredDemoCases.map(c=><div key={c.case_id} className="scenario-card"><div><FolderOpen size={17}/><span>로컬 시연 · API 배포 대기</span></div><strong>{c.title}</strong><p>{c.case_id}</p></div>)}</div><p className="caption">이 목록은 Render 사건 데이터베이스와 별개입니다. 블록체인 검증·증빙 등록·관리자 종결을 여기서 실행할 수 없습니다.</p></section>}
  <div className="dashboard-columns"><section className="panel case-list-panel" id="case-list"><div className="panel-heading"><div><span className="eyebrow">{role==='AGENCY'?'EVIDENCE QUEUE':role==='ADMIN'?'REVIEW QUEUE':'CASE DIRECTORY'}</span><h2>{role==='AGENCY'?'증빙 요청 대상 사건':role==='ADMIN'?'검토 대상 사건':'사건 목록'} <span className="count-chip">{rows.length}</span></h2></div><div className="list-switch"><button aria-pressed={!workOnly} onClick={()=>setWorkOnly(false)}>전체</button><button aria-pressed={workOnly} onClick={()=>setWorkOnly(true)}>{role==='AGENCY'?'제공 대기':role==='ADMIN'?'검토 필요':'진행 중'}</button></div></div><div className="filters"><div className="search"><Search size={16}/><input aria-label="사건 검색" placeholder="사건명 또는 사건 ID 검색" value={query} onChange={e=>setQuery(e.target.value)}/></div><select aria-label="지역 필터" value={region} onChange={e=>setRegion(e.target.value)}><option value="ALL">전체 지역</option>{[...new Set(cases.map(c=>c.region).filter(Boolean))].map(r=><option key={r} value={r}>{r}</option>)}</select><select aria-label="진행 상태" value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">전체 상태</option><option value="OPEN">진행 중</option><option value="CLOSED">종결</option></select></div>
   {loading?<Loading/>:!rows.length?<Empty>{role==='OFFICER'?'등록된 사건이 없습니다. 사건을 선택해 업무를 시작하세요.':'배정된 사건이 없습니다. 수사담당자의 사건 등록을 확인하세요.'}</Empty>:<div className="table-wrap"><table><thead><tr><th>사건 정보</th><th>사건 상태</th><th>{role==='AGENCY'?'증빙 제공 업무':role==='ADMIN'?'검토 업무':'다음 업무'}</th><th>열기</th></tr></thead><tbody>{rows.map(c=>{const state=statusFor(c,role);return <tr key={c.case_id}><td><Link className="case-name" to={caseLink(role,c.case_id)}><span className="case-folder">{role==='OFFICER'?<FolderOpen size={17}/>:<FileText size={17}/>}</span>{caseTitle(c.title)}</Link><p className="case-id">{caseReference(c.case_id)}</p></td><td><Badge value={c.status}/></td><td><span className="next-work">{state.title}</span><p>{state.note}</p></td><td><Link className="open-case" aria-label={caseTitle(c.title)+' 열기'} to={caseLink(role,c.case_id)}><ArrowUpRight size={17}/></Link></td></tr>})}</tbody></table></div>}
  </section><aside className="dashboard-rail"><section className="panel"><div className="panel-heading"><h2>{role==='AGENCY'?'최근 제공 활동':'최근 검증 활동'}</h2><span className="live-dot"/></div>{!activities.length?<div className="rail-empty"><Clock3 size={21}/><strong>아직 처리 이력이 없습니다</strong><p>업무를 진행하면 최근 활동이 여기에 표시됩니다.</p></div>:activities.map(a=><Link className="activity-item" key={a.id} to={caseLink(role,a.case.case_id)}><span className="activity-point"/><div><strong>{a.title}</strong><p>{caseTitle(a.case.title)}</p><Badge value={a.value}/><small>{fmt(a.date)}</small></div></Link>)}</section><div className="guide-note"><ShieldCheck size={22}/><strong>{role==='AGENCY'?'기관은 증빙에만 서명합니다':role==='ADMIN'?'판정과 승인은 별도입니다':'검증은 판단을 돕는 근거입니다'}</strong><p>{role==='AGENCY'?'자료 제공은 실제 열람을 증명하지 않습니다. 증빙이 확인하는 행위의 범위만 기록하세요.':role==='ADMIN'?'SUPPORTED는 자동 승인이 아닙니다. 최신 원문과 증빙, 검증 근거를 확인하세요.':'AI는 기록을 구조화하고 Rule Engine은 증빙을 비교합니다. 최종 업무 판단은 담당자가 수행합니다.'}</p><span>FULLPROOF PRINCIPLE</span></div></aside></div>
 </>;
}

export function AgencyHistory(){
 const [cases,setCases]=useState<Case[]>([]),[error,setError]=useState('');
 useEffect(()=>{void api<Case[]>('/api/v1/cases').then(setCases).catch(e=>setError(e.message))},[]);
 const rows=cases.flatMap(c=>c.proofs.map(p=>({c,p})));
 return <><div className="page-title"><div><span className="eyebrow">EVIDENCE / AUDIT TRAIL</span><h1 tabIndex={-1}>기관 증빙 제공 이력</h1><p className="muted">기관 증빙의 발급·서명·기록 상태를 확인합니다.</p></div></div>{error&&<OperationError message={error}/>}<section className="panel"><div className="panel-heading"><h2>증빙 목록</h2><span className="count-chip">{rows.length}</span></div>{!rows.length?<Empty>제공한 증빙이 없습니다.</Empty>:<div className="table-wrap"><table><thead><tr><th>사건·통화</th><th>발급 시각</th><th>기관 결과</th><th>기록 상태</th><th>열기</th></tr></thead><tbody>{rows.map(({c,p})=><tr key={p.proof_id+':'+p.proof_version}><td>{caseTitle(c.title)}<p>{p.call_id} · {short(p.proof_id)}</p></td><td>{fmt(p.proof_issued_at)}</td><td><Badge value={p.result}/></td><td><Badge value={p.chain_status}/></td><td><Link className="text-link" to={caseLink('AGENCY',c.case_id)}>증빙 열기<ArrowRight size={14}/></Link></td></tr>)}</tbody></table></div>}</section></>;
}
