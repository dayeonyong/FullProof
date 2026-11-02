import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

describe('Sepolia case creation recovery',()=>{
 const source=readFileSync('src/official.ts','utf8');
 it('remembers the generated case ID across attempts',()=>{
  expect(source).toContain("const casePendingKey='fullproof.sepolia.pendingCase'");
  expect(source).toContain('savedCaseId||');
  expect(source).toContain('sessionStorage.setItem(casePendingKey,id)');
 });
 it('resumes an existing case rather than creating it again',()=>{
  expect(source).toContain('existingCase=await request');
  expect(source).toContain('const record=existingCase||');
 });
 it('skips already existing steps and clears pending ID after success',()=>{
  expect(source).toContain('if(!state.steps?.length)');
  expect(source).toContain('sessionStorage.removeItem(casePendingKey)');
 });
});
