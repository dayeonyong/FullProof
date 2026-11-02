import {useEffect,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {api} from './api';

export interface TeamDraft {draft_id:string;title:string;claim_text:string;proof_text:string;created_at:string;updated_at:string;status:'DRAFT_NOT_ONCHAIN';is_onchain:false}
export const teamDraftPath=(id:string)=>'/team-drafts/'+encodeURIComponent(id);

export default function TeamDraftWorkspace(){
 const {id}=useParams(),navigate=useNavigate();
 const [draft,setDraft]=useState<TeamDraft|null>(null),[claim,setClaim]=useState(''),[proof,setProof]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{if(!id)return;void api<TeamDraft>('/api/v1/frontend/team-drafts/'+encodeURIComponent(id)).then(x=>{setDraft(x);setClaim(x.claim_text);setProof(x.proof_text)}).catch(e=>setError(e instanceof Error?e.message:'초안을 불러올 수 없습니다.'))},[id]);
 async function save(kind:'claim'|'proof'){
  if(!id||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const value=kind==='claim'?claim:proof;
   const result=await api<TeamDraft>('/api/v1/frontend/team-drafts/'+encodeURIComponent(id)+'/'+kind,{text:value});
   setDraft(result);
   setNotice(kind==='claim'?'Claim 초안 저장 완료 — 블록체인 미기록':'Proof 초안 저장 완료 — 기관 서명 및 블록체인 미기록');
  }catch(e){setError(e instanceof Error?e.message:'저장 실패')}finally{setBusy(false)}
 }
 return <div className="panel" style={{padding:24,maxWidth:860}}>
  <div className="eyebrow">TEAM DEMO DRAFT / NOT ONCHAIN</div>
  <h1>{draft?.title||'팀 시연 사건 불러오는 중'}</h1>
  <p className="muted">팀원들이 함께 작성하는 가상 사건 초안입니다. 여기서 저장해도 MetaMask 서명이나 Sepolia 거래는 발생하지 않습니다.</p>
  <p><strong>사건 ID:</strong> {draft?.draft_id||id}</p>
  <p><strong>상태:</strong> 작성 중 · 블록체인 미등록</p>
  {error&&<p role="alert" style={{color:'crimson'}}>{error}</p>}
  {notice&&<p role="status">{notice}</p>}
  <div style={{marginTop:18}}><label htmlFor="team-claim"><strong>수사담당자 Claim 원문</strong></label>
  <textarea id="team-claim" value={claim} onChange={e=>setClaim(e.target.value)} rows={5} maxLength={10000} style={{display:'block',width:'100%',padding:12,marginTop:8}}/>
  <button type="button" className="primary" disabled={busy||!claim.trim()} onClick={()=>void save('claim')}>Claim 임시 저장</button></div>
  <div style={{marginTop:26}}><label htmlFor="team-proof"><strong>원천기관 Proof 초안</strong></label>
  <textarea id="team-proof" value={proof} onChange={e=>setProof(e.target.value)} rows={5} maxLength={10000} style={{display:'block',width:'100%',padding:12,marginTop:8}}/>
  <button type="button" className="primary" disabled={busy||!proof.trim()} onClick={()=>void save('proof')}>Proof 임시 저장</button></div>
  <p className="muted" style={{marginTop:22}}>이 초안은 실제 Gemini 검증 결과나 기관 서명, 온체인 Proof로 간주하지 않습니다. Sepolia 확정 기록 기능은 기존 실제 사건 워크플로에서 별도로 유지됩니다.</p>
  <button type="button" onClick={()=>navigate('/workspace')}>사건 목록으로 돌아가기</button>
  <p><Link to="/workspace">대시보드</Link></p>
 </div>;
}
