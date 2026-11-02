import type {Provider} from './wallet';

export interface UnsignedContractTransaction {
  from:string;
  to:string;
  data:string;
  value?:string;
  gas?:string;
}

function isAddress(v:string){return /^0x[0-9a-fA-F]{40}$/.test(v)}
function isHex(v:string){return /^0x(?:[0-9a-fA-F]{2})*$/.test(v)}

/** Ask MetaMask to sign AND broadcast a prepared Ethereum transaction.
 * The backend must verify the confirmed receipt before updating case state.
 * Never send private keys or claim completion from this function alone.
 */
export async function sendWalletContractTransaction(
  provider:Provider,
  tx:UnsignedContractTransaction,
  expectedChainId=11155111,
):Promise<string>{
  if(!isAddress(tx.from)||!isAddress(tx.to)||!isHex(tx.data))throw Error('잘못된 거래 요청입니다.');
  if(expectedChainId!==11155111)throw Error('Sepolia 이외의 네트워크는 지원하지 않습니다.');
  const activeChain=await provider.request({method:'eth_chainId'});
  if(activeChain!=='0xaa36a7')throw Error('MetaMask를 Sepolia 네트워크로 전환해 주세요.');
  const accounts=await provider.request({method:'eth_requestAccounts'}) as string[];
  if(accounts[0]?.toLowerCase()!==tx.from.toLowerCase())throw Error('거래를 승인할 지갑 계정이 다릅니다.');
  // Reject unrecognized fields by constructing an allowlisted transaction.
  const params:UnsignedContractTransaction={from:tx.from,to:tx.to,data:tx.data};
  if(tx.value!==undefined)params.value=tx.value;
  if(tx.gas!==undefined)params.gas=tx.gas;
  const hash=await provider.request({method:'eth_sendTransaction',params:[params]});
  if(typeof hash!=='string'||!/^0x[0-9a-fA-F]{64}$/.test(hash))throw Error('거래 해시를 확인할 수 없습니다.');
  return hash;
}

export interface TransactionReceipt {
  transactionHash:string;
  status:string;
  to:string|null;
  from:string;
}

/** Verify receipt on Sepolia before treating an admin action as recorded.
 * A confirmed receipt alone does not replace backend business validation.
 */
export async function verifyContractReceipt(
  provider:Provider,
  txHash:string,
  expectedContract:string,
  expectedSender:string,
):Promise<TransactionReceipt|null>{
  if(!/^0x[0-9a-fA-F]{64}$/.test(txHash))throw Error('거래 해시가 올바르지 않습니다.');
  if(!isAddress(expectedContract)||!isAddress(expectedSender))throw Error('지갑 또는 계약 주소가 올바르지 않습니다.');
  if(await provider.request({method:'eth_chainId'})!=='0xaa36a7')throw Error('Sepolia 네트워크를 선택해 주세요.');
  const result=await provider.request({method:'eth_getTransactionReceipt',params:[txHash]}) as TransactionReceipt|null;
  if(result===null)return null;
  if(result.transactionHash.toLowerCase()!==txHash.toLowerCase()||
     result.to?.toLowerCase()!==expectedContract.toLowerCase()||
     result.from.toLowerCase()!==expectedSender.toLowerCase())throw Error('예상한 스마트 계약의 거래가 아닙니다.');
  if(result.status!=='0x1')throw Error('블록체인 거래가 실패했습니다.');
  return result;
}
