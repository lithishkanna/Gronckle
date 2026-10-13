import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateUnderratedScore,
  estimateToolCost,
  applyPresetReRanking,
  generateArchitectureDiagram,
  exportPackageJson,
  exportReadme,
  exportInstallCommands,
} from '../src/lib/recommendations.ts';

const mockToolGem = {
  id: 'tool-gem',
  title: 'PocketDB',
  slug: 'pocket-db',
  category: 'Database',
  description: 'Ultra-fast embedded document database with vector indexes.',
  stars: 3200,
  likes_count: 85,
  license: 'MIT',
  pricing: 'open source',
  self_hostable: true,
  last_commit_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  install_command: 'npm install pocket-db',
  npm_package: 'pocket-db',
  languages: ['TypeScript'],
  tags: ['database', 'embedded'],
};

const mockToolGiant = {
  id: 'tool-giant',
  title: 'GiantSQL',
  slug: 'giant-sql',
  category: 'Database',
  description: 'Massive industry database standard.',
  stars: 180000,
  likes_count: 200,
  license: 'PostgreSQL',
  pricing: 'open source',
  self_hostable: true,
  last_commit_date: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
  languages: ['C'],
  tags: ['database'],
};

const mockStackResult = {
  query: 'Build an internal dashboard',
  understanding: {
    categories_needed: ['Frontend Framework', 'Database'],
    constraints: [],
    primary_language: 'typescript',
    deployment_target: 'any',
  },
  tools: [
    {
      id: 'tool-react',
      title: 'React',
      slug: 'react',
      category: 'Frontend Framework',
      description: 'The library for web UIs.',
      url: 'https://react.dev',
      tags: ['react'],
      score: 80,
      reason: 'Top frontend library',
      npm_package: 'react',
      install_command: 'npm install react',
      license: 'MIT',
      stars: 220000,
      likes_count: 500,
      is_locked: false,
      alternatives: [],
    },
    {
      id: 'tool-giant',
      title: 'GiantSQL',
      slug: 'giant-sql',
      category: 'Database',
      description: 'Database',
      url: 'https://giantsql.org',
      tags: ['db'],
      score: 75,
      reason: 'Standard DB',
      license: 'PostgreSQL',
      stars: 180000,
      likes_count: 200,
      is_locked: false,
      alternatives: [
        {
          id: 'tool-gem',
          title: 'PocketDB',
          slug: 'pocket-db',
          description: 'PocketDB',
          license: 'MIT',
          stars: 3200,
          score: 70,
          url: 'https://pocketdb.io',
          install_command: 'npm install pocket-db',
          npm_package: 'pocket-db',
        },
      ],
    },
  ],
  warnings: [],
  setup_commands: ['npm create vite@latest', 'npm install react', 'npm run dev'],
  source: 'db_fallback',
};

describe('Recommendation Pipeline v2 Features Unit Tests', () => {
  it('calculates higher underrated score for lean active gem than incumbent giant', () => {
    const gemScore = calculateUnderratedScore(mockToolGem);
    const giantScore = calculateUnderratedScore(mockToolGiant);

    assert.ok(gemScore.score > giantScore.score, 'Gem should have higher underrated score than giant');
    assert.ok(gemScore.score >= 75, `Gem score was ${gemScore.score}`);
    assert.ok(gemScore.reason.length > 0);
  });

  it('estimates zero cost for open source / self-hostable tools', () => {
    const costHobby = estimateToolCost(mockToolGem, 'hobby');
    const costLarge = estimateToolCost(mockToolGem, 'large');

    assert.equal(costHobby.isFree, true);
    assert.equal(costLarge.isFree, true);
    assert.match(costHobby.costText, /\$0/);
  });

  it('estimates costs across scale tiers for tools with free_tier_note', () => {
    const serviceTool = {
      title: 'HostedSaaS',
      pricing: 'free tier',
      free_tier_note: '1,000 active users free per month',
      self_hostable: false,
      license: 'Proprietary',
    };

    const costHobby = estimateToolCost(serviceTool, 'hobby');
    const costStartup = estimateToolCost(serviceTool, 'startup');
    const costLarge = estimateToolCost(serviceTool, 'large');

    assert.equal(costHobby.isFree, true);
    assert.equal(costStartup.isFree, false);
    assert.match(costStartup.costText, /Estimated/);
    assert.match(costLarge.costText, /Estimated/);
  });

  it('re-ranks recommendations using presets (e.g. cheapest/fastest)', () => {
    const reRanked = applyPresetReRanking(mockStackResult, 'cheapest');

    assert.equal(reRanked.preset, 'cheapest');
    assert.equal(reRanked.tools.length, 2);
    assert.ok(reRanked.mermaid_diagram.includes('graph TD'));
  });

  it('generates valid Mermaid diagram with layered nodes', () => {
    const diagram = generateArchitectureDiagram(mockStackResult.tools);

    assert.ok(diagram.includes('graph TD'));
    assert.ok(diagram.includes('react'));
    assert.ok(diagram.includes('giant_sql'));
    assert.ok(diagram.includes('-->'));
  });

  it('exports package.json containing only valid npm packages', () => {
    const pkgJsonStr = exportPackageJson(mockStackResult.tools, 'test-project');
    const pkg = JSON.parse(pkgJsonStr);

    assert.equal(pkg.name, 'test-project');
    assert.ok(pkg.dependencies.react);
  });

  it('exports README with markdown table, diagram, and setup commands', () => {
    const readme = exportReadme(mockStackResult);

    assert.ok(readme.includes('# Recommended Stack'));
    assert.ok(readme.includes('```mermaid'));
    assert.ok(readme.includes('## Setup Commands'));
    assert.ok(readme.includes('| **Frontend Framework** |'));
  });

  it('exports install commands without non-npm junk', () => {
    const cmds = exportInstallCommands(mockStackResult.tools);
    assert.ok(cmds.includes('npm install react'));
  });
});
