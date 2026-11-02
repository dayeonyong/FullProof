import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('Sepolia case selection',()=>{
 const dashboard=readFileSync('src/Dashboard.tsx','utf8');
 const official=readFileSync('src/official.ts','utf8');
 it('starts in new case mode so example selection does not silently reuse an existing case',()=>{
  expect(dashboard).toContain('[fresh,setFresh]=useState(true)');
  expect(dashboard).toContain('if(existing&&!fresh)');
 });
 it('requires MetaMask for new Sepolia case transactions',()=>{
  expect(dashboard).toContain('system?.chain.chain_id===11155111&&!window.ethereum');
  expect(official).toContain('await createSepoliaDemoCase(id');
  expect(official).toContain('/api/v1/browser-transactions/cases/confirm');
 });
});
