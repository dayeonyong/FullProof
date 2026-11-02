import {describe,it,expect,vi} from 'vitest';
import {sendWalletContractTransaction,verifyContractReceipt} from '../src/walletTransaction';
import type {Provider} from '../src/wallet';

const from='0xF28d8E3890918c9E2A21C3Ed5C59fb450c977494';
const to='0x2f68D6252ABb893f07DbFcEe9e2d924786558669';
const hash='0x'+'a'.repeat(64);

describe('MetaMask Sepolia transaction submission',()=>{
 it('requests approval using the selected matching account',async()=>{
  const request=vi.fn(async({method}:{method:string})=>{
   if(method==='eth_chainId')return '0xaa36a7';
   if(method==='eth_requestAccounts')return [from];
   if(method==='eth_sendTransaction')return hash;
   throw Error('Unexpected call');
  });
  const result=await sendWalletContractTransaction({request} as Provider,{from,to,data:'0x1234'});
  expect(result).toBe(hash);
  expect(request).toHaveBeenCalledWith({method:'eth_sendTransaction',params:[{from,to,data:'0x1234'}]});
 });
 it('never sends a transaction on the wrong network',async()=>{
  const request=vi.fn(async({method}:{method:string})=>method==='eth_chainId'?'0x1':[from]);
  await expect(sendWalletContractTransaction({request} as Provider,{from,to,data:'0x'})).rejects.toThrow('Sepolia');
  expect(request).not.toHaveBeenCalledWith(expect.objectContaining({method:'eth_sendTransaction'}));
 });
 it('rejects an unexpected active wallet',async()=>{
  const request=vi.fn(async({method}:{method:string})=>method==='eth_chainId'?'0xaa36a7':['0x0000000000000000000000000000000000000001']);
  await expect(sendWalletContractTransaction({request} as Provider,{from,to,data:'0x'})).rejects.toThrow('계정');
  expect(request).not.toHaveBeenCalledWith(expect.objectContaining({method:'eth_sendTransaction'}));
 });
 it('rejects malformed destination or calldata before requesting a wallet',async()=>{
  const request=vi.fn();
  await expect(sendWalletContractTransaction({request} as Provider,{from,to:'bad',data:'0x1234'})).rejects.toThrow('잘못된');
  expect(request).not.toHaveBeenCalled();
 });
 it('checks transaction receipt sender, contract, and success status',async()=>{
  const request=vi.fn(async({method}:{method:string})=>method==='eth_chainId'?'0xaa36a7':{
   transactionHash:hash,status:'0x1',from,to
  });
  const receipt=await verifyContractReceipt({request} as Provider,hash,to,from);
  expect(receipt?.status).toBe('0x1');
 });
 it('does not treat a pending transaction as confirmed',async()=>{
  const request=vi.fn(async({method}:{method:string})=>method==='eth_chainId'?'0xaa36a7':null);
  expect(await verifyContractReceipt({request} as Provider,hash,to,from)).toBeNull();
 });
 it('rejects a receipt for the wrong contract',async()=>{
  const request=vi.fn(async({method}:{method:string})=>method==='eth_chainId'?'0xaa36a7':{
   transactionHash:hash,status:'0x1',from,to:'0x0000000000000000000000000000000000000001'
  });
  await expect(verifyContractReceipt({request} as Provider,hash,to,from)).rejects.toThrow('예상한');
 });

});
