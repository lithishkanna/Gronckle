import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateStackFromDatabase,
  detectCompatibilityWarnings,
  swapToolWithAlternative,
} from '../src/lib/recommendations.ts';

const mockDbTools = [
  {
    id: 'db-react',
    title: 'React',
    name: 'React',
    slug: 'react',
    category: 'Frontend Framework',
    description: 'UI library for component-driven web applications.',
    tags: ['frontend', 'ui', 'components'],
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['React'],
    license: 'MIT',
    stars: 220000,
    likes_count: 500,
    url: 'https://react.dev',
    created_at: new Date().toISOString(),
  },
  {
    id: 'db-vue',
    title: 'Vue.js',
    name: 'Vue',
    slug: 'vue',
    category: 'Frontend Framework',
    description: 'Progressive JavaScript framework for building user interfaces.',
    tags: ['frontend', 'ui', 'reactive'],
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['Vue'],
    license: 'MIT',
    stars: 205000,
    likes_count: 420,
    url: 'https://vuejs.org',
    created_at: new Date().toISOString(),
  },
  {
    id: 'db-postgres',
    title: 'PostgreSQL',
    name: 'PostgreSQL',
    slug: 'postgresql',
    category: 'Database',
    description: 'Open source relational database system.',
    tags: ['database', 'sql', 'relational'],
    languages: ['C'],
    frameworks: [],
    license: 'PostgreSQL',
    stars: 15000,
    likes_count: 350,
    url: 'https://www.postgresql.org',
    created_at: new Date().toISOString(),
  },
  {
    id: 'db-gpl-tool',
    title: 'Copyleft Suite',
    name: 'Copyleft Suite',
    slug: 'copyleft-suite',
    category: 'Backend & API',
    description: 'AGPL backend suite.',
    tags: ['backend'],
    languages: ['Python'],
    license: 'AGPL-3.0',
    stars: 1200,
    likes_count: 40,
    url: 'https://example.com',
    created_at: new Date().toISOString(),
  },
];

describe('Recommendation Pipeline & Validator Unit Tests', () => {
  it('returns empty tool recommendations when database is empty (Zero Hallucinations)', () => {
    const result = generateStackFromDatabase('I want to build a realtime figma clone', []);
    assert.deepEqual(result.tools, []);
    assert.equal(result.tools.length, 0);
  });

  it('guarantees every recommended tool and alternative exists in the database', () => {
    const result = generateStackFromDatabase('Modern web app with relational database', mockDbTools);
    const validDbIds = new Set(mockDbTools.map(t => t.id));

    assert.ok(result.tools.length > 0);
    for (const tool of result.tools) {
      assert.ok(validDbIds.has(tool.id), `Tool ID ${tool.id} was not found in mock DB!`);
      for (const alt of tool.alternatives) {
        assert.ok(validDbIds.has(alt.id), `Alternative ID ${alt.id} was not found in mock DB!`);
      }
    }
  });

  it('preserves user-locked tools across stack generation', () => {
    const lockedId = 'db-react';
    const result = generateStackFromDatabase(
      'Web application with database',
      mockDbTools,
      [lockedId]
    );

    const frontendPick = result.tools.find(t => t.id === lockedId);
    assert.ok(frontendPick, 'Locked tool must be included in recommendation');
    assert.equal(frontendPick.is_locked, true);
    assert.match(frontendPick.reason, /Locked by user/i);
  });

  it('swaps tool with selected alternative and updates alternatives list', () => {
    const initial = generateStackFromDatabase('Frontend application', mockDbTools);
    const category = 'Frontend Framework';

    // Swap React with Vue.js
    const updated = swapToolWithAlternative(initial, category, 'db-vue', mockDbTools);
    const newPick = updated.tools.find(t => t.category === category);

    assert.equal(newPick.id, 'db-vue');
    assert.equal(newPick.title, 'Vue.js');
    assert.ok(newPick.alternatives.some(a => a.id === 'db-react'), 'Previous tool must become an alternative');
  });

  it('detects copyleft license compatibility clash in proprietary projects', () => {
    const clashTools = [mockDbTools[0], mockDbTools[3]]; // React (MIT) + Copyleft Suite (AGPL-3.0)
    const warnings = detectCompatibilityWarnings(clashTools, ['commercial', 'proprietary']);

    assert.ok(warnings.length > 0);
    assert.equal(warnings[0].severity, 'warning');
    assert.match(warnings[0].title, /Copyleft License Restriction/);
  });

  it('detects multiple frontend presentation framework clash', () => {
    const multiFrontend = [mockDbTools[0], mockDbTools[1]]; // React + Vue
    const warnings = detectCompatibilityWarnings(multiFrontend, []);

    assert.ok(warnings.some(w => w.title.includes('Multiple Frontend Frameworks')));
  });
});
