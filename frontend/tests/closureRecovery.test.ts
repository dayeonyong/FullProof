import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('Sepolia closure recovery path',()=>{
 const source=readFileSync('src/official.ts','utf8');
 it('checks saved hash before attempting a new transaction',()=>{
  const pending=source.indexOf('const stored=sessionStorage.getItem(pendingKey)');
  const sending=source.indexOf('txHash=await sendWalletContractTransaction(');
  expect(pending).toBeGreaterThan(0);
  expect(sending).toBeGreaterThan(pending);
  expect(source).toContain('if(!txHash){');
 });
 it('retries receipt confirmation without sending another wallet transaction',()=>{
  const retry=source.indexOf('for(let attempt=0;attempt<5;attempt++)');
  const confirmation=source.indexOf('await request(confirmationPath,');
  expect(retry).toBeGreaterThan(0);
  expect(confirmation).toBeGreaterThan(retry);
  expect(source).toContain('if(status!==409||attempt===4)throw error;');
  expect(source).toContain('sessionStorage.removeItem(pendingKey)');
 });
 it('only removes pending record after backend confirms',()=>{
  const confirmed=source.indexOf("const result=await request('/api/v1/browser-transactions/cases/'");
  const removed=source.indexOf('sessionStorage.removeItem(pendingKey)');
  expect(removed).toBeGreaterThan(confirmed);
 });
});
