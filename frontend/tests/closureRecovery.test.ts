import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('Sepolia closure recovery path',()=>{
 const source=readFileSync(new URL('../src/official.ts',import.meta.url),'utf8');
 it('checks saved hash before attempting a new transaction',()=>{
  const pending=source.indexOf('const stored=sessionStorage.getItem(pendingKey)');
  const sending=source.indexOf('txHash=await sendWalletContractTransaction(');
  expect(pending).toBeGreaterThan(0);
  expect(sending).toBeGreaterThan(pending);
  expect(source).toContain('if(!txHash){');
 });
 it('only removes pending record after backend confirms',()=>{
  const confirmed=source.indexOf("const result=await request('/api/v1/browser-transactions/cases/'");
  const removed=source.indexOf('sessionStorage.removeItem(pendingKey)');
  expect(removed).toBeGreaterThan(confirmed);
 });
});
