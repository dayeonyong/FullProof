import {useEffect,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {api} from './api';

interface LocalClaim {claim_id:string;claim_text:string;claim_hash:string;claim_created_at:string;extraction_status:string;action_result:string|null}
interface LocalCase {case_id:string;title:string;network:string;steps:{step_id:number;step_name:string;status:string}[];claims:LocalClaim[];proofs:unknown[];verifications:unknown[]}
type Tab='overview'|'claims'|'proofs'|'verification';
export default function LocalCaseWorkspace(){
 const {id}=useParams(),[record,setRecord]=useState<LocalCase|null>(null),[error,setError]=useState(''),[tab,setTab]=useState<Tab>('overview');
 useEffect(()=>{if(!id)return;setError('');void api<LocalCase>('/api/v1/frontend/recovered-demo-cases/'+encodeURIComponent(id)).then(setRecord).catch(e=>setError(e instanceof Error?e.message:'사건 조회 실패'))},[id]);
 if(error)return <section className="panel" style={{padding:24}} role="alert">{error} <Link to="/workspace">목록으로</Link></section>;
 if(!record)return <p>등록 사건 불러오는 중…</p>;
 return <section className="panel" style={{padding:24,maxWidth:950}}>
  <p className="eyebrow">REGISTERED LOCAL CASE · HARDHAT</p>
  <h1>{record.title}</h1><p><strong>사건 ID:</strong> {record.case_id}</p>
  <p className="muted">백엔드 팀의 로컬 SQLite에서 실제 생성한 사건입니다. 현재 Sepolia에는 재등록되지 않았으며, 이 화면은 기존 기록 조회 및 흐름 검토용입니다.</p>
  <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'20px 0'}}>
   {([['overview','사건 개요'],['claims','Claim 및 AI 구조화'],['proofs','기관 Proof'],['verification','검증 이력']] as const).map(([key,label])=><button type="button" key={key} aria-pressed={tab===key} className={tab===key?'primary':''} onClick={()=>setTab(key)}>{label}</button>)}
  </div>
  {tab==='overview'&&<div><h2>등록된 수사 단계</h2>{record.steps.map(x=><p key={x.step_id}>단계 {x.step_id+1} · {x.step_name} · {x.status}</p>)}<p>Claim {record.claims.length}건 · Proof {record.proofs.length}건 · 검증 기록 {record.verifications.length}건 (복구된 DB 기준)</p></div>}
  {tab==='claims'&&<div><h2>수사관 Claim</h2>{record.claims.map(c=><div key={c.claim_id}><p><strong>원문:</strong> {c.claim_text}</p><p>AI 구조화 상태: {c.extraction_status}</p><p>추출된 행동 결과: {c.action_result||'미확인'}</p><p>Claim ID: {c.claim_id}</p><p style={{overflowWrap:'anywhere'}}>원문 해시: {c.claim_hash}</p></div>)}</div>}
  {tab==='proofs'&&<div><h2>원천기관 Proof</h2>{record.proofs.length?<pre>{JSON.stringify(record.proofs,null,2)}</pre>:<p>이 복구 DB에는 기관 Proof 원본이 포함되지 않았습니다. 별도 저장된 기관 기록을 확보해야 이 사건에 정확히 연결할 수 있습니다.</p>}</div>}
  {tab==='verification'&&<div><h2>검증 결과</h2>{record.verifications.length?<pre>{JSON.stringify(record.verifications,null,2)}</pre>:<p>이 사건 ID에 연결된 검증 결과가 복구 DB에 없습니다. 팀원이 제공한 Hardhat 검증 JSON은 다른 사건 ID이므로 임의 연결하지 않았습니다.</p>}</div>}
  <p style={{marginTop:24}}><Link to="/workspace">사건 선택 목록으로 돌아가기</Link></p>
 </section>;
}
