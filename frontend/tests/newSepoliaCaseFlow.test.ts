import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('Backend-owned case list',()=>{
 const dashboard=readFileSync('src/Dashboard.tsx','utf8');
 const official=readFileSync('src/official.ts','utf8');
 it('shows cases returned by team backend instead of built-in fixture cards',()=>{
  expect(dashboard).toContain('cases.map(c=><Link');
  expect(dashboard).toContain('to={caseLink(role,c.case_id)}');
  expect(dashboard).not.toContain('caseCatalog');
  expect(dashboard).not.toContain('openScenario()');
 });
 it('does not silently create a transaction when browsing real cases',()=>{
  expect(dashboard).toContain("api<Case>('/api/v1/cases',{title:newCaseTitle.trim()");
  expect(dashboard).toContain('to={caseLink(role,c.case_id)}');
  expect(official).toContain("request<Case[]>('/api/v1/frontend/cases')");
 });
 it('has direct case creation without hardcoded mock cards',()=>{
  expect(dashboard).toContain('새 사건 등록');
  expect(dashboard).toContain("api<Case>('/api/v1/cases',{title:newCaseTitle.trim()");
  expect(dashboard).toContain('setError(e instanceof Error?e.message');
 });
 it('shows recovered local demo cases as read-only separate from server records',()=>{
  expect(dashboard).toContain('recoveredDemoCases.map(c=><div');
  expect(dashboard).toContain('로컬 시연 · 읽기 전용');
  expect(dashboard).toContain('현재 Sepolia에 등록된 사건이 아니며');
 });
 it('routes Vercel API calls through same-origin /backend proxy',()=>{
  expect(official).toContain("window.location.hostname.endsWith('.vercel.app')?'/backend'");
 });
 it('preserves MetaMask-backed creation code separately',()=>{
  expect(official).toContain('await createSepoliaDemoCase(id');
  expect(official).toContain('/api/v1/browser-transactions/cases/confirm');
 });
});
