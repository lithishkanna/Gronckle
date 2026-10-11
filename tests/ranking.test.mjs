import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankTool } from '../src/lib/recommendations.ts';

const baseTool = {
  id: 'tool-test',
  title: 'Supabase',
  slug: 'supabase',
  category: 'Database',
  description: 'The open source Firebase alternative.',
  tags: ['database', 'postgres', 'auth', 'storage'],
  use_cases: ['backend', 'relational-database'],
  languages: ['TypeScript', 'Go'],
  license: 'Apache-2.0',
  self_hostable: true,
  last_commit_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago (<90d)
  stars: 75000,
  likes_count: 850,
  url: 'https://supabase.com',
  created_at: new Date().toISOString(),
};

describe('Ranking Score Formula Unit Tests', () => {
  it('awards +30 for direct category match', () => {
    const intent = {
      categories_needed: ['Database'],
      constraints: [],
      primary_language: 'any',
      deployment_target: 'any',
    };
    const { score, reasons } = rankTool(baseTool, 'Database', intent);
    assert.ok(reasons.some(r => r.includes('+30')));
    assert.ok(score >= 30);
  });

  it('awards +20 for native primary language constraint match', () => {
    const intent = {
      categories_needed: ['Database'],
      constraints: [],
      primary_language: 'typescript',
      deployment_target: 'any',
    };
    const { reasons } = rankTool(baseTool, 'Database', intent);
    assert.ok(reasons.some(r => r.includes('+20') && r.includes('typescript')));
  });

  it('awards +10 for active maintenance within 90 days', () => {
    const intent = {
      categories_needed: ['Database'],
      constraints: [],
      primary_language: 'any',
      deployment_target: 'any',
    };
    const { reasons } = rankTool(baseTool, 'Database', intent);
    assert.ok(reasons.some(r => r.includes('Active maintenance within 90 days (+10)')));
  });

  it('awards popularity score based on log10 of stars', () => {
    const intent = {
      categories_needed: ['Database'],
      constraints: [],
      primary_language: 'any',
      deployment_target: 'any',
    };
    const { reasons } = rankTool(baseTool, 'Database', intent);
    assert.ok(reasons.some(r => r.includes('community adoption')));
  });

  it('awards +10 for permissive license when permissive required', () => {
    const intent = {
      categories_needed: ['Database'],
      constraints: ['permissive-license'],
      primary_language: 'any',
      deployment_target: 'any',
    };
    const { reasons } = rankTool(baseTool, 'Database', intent);
    assert.ok(reasons.some(r => r.includes('Permissive open-source license (+10)')));
  });

  it('penalizes copyleft license (-20) when permissive license is required', () => {
    const gplTool = {
      ...baseTool,
      license: 'GPL-3.0',
    };
    const intent = {
      categories_needed: ['Database'],
      constraints: ['permissive-license'],
      primary_language: 'any',
      deployment_target: 'any',
    };
    const { reasons } = rankTool(gplTool, 'Database', intent);
    assert.ok(reasons.some(r => r.includes('Copyleft license penalty (-20)')));
  });

  it('awards +15 for self-hostable match when constraint is requested', () => {
    const intent = {
      categories_needed: ['Database'],
      constraints: ['self-hostable'],
      primary_language: 'any',
      deployment_target: 'any',
    };
    const { reasons } = rankTool(baseTool, 'Database', intent);
    assert.ok(reasons.some(r => r.includes('Fully self-hostable (+15)')));
  });
});
