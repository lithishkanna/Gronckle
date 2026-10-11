import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FILTER_STATE,
  parseFiltersFromUrl,
  serializeFiltersToUrl,
  getMaintenanceStatus,
  applyFiltersAndSort,
  computeFilterCounts,
} from '../src/lib/filters.ts';

const mockTools = [
  {
    id: 'tool-1',
    title: 'React',
    name: 'React',
    slug: 'react',
    type: 'library',
    category: 'Frontend Framework',
    subcategories: ['UI', 'SPA'],
    description: 'The library for web and native user interfaces.',
    tags: ['react', 'ui', 'frontend'],
    languages: ['TypeScript', 'JavaScript'],
    frameworks: ['React'],
    license: 'MIT',
    pricing: 'open source',
    self_hostable: true,
    last_commit_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    stars: 220000,
    likes_count: 500,
    created_at: new Date().toISOString(),
    url: 'https://react.dev',
  },
  {
    id: 'tool-2',
    title: 'PostgreSQL',
    name: 'PostgreSQL',
    slug: 'postgresql',
    type: 'service',
    category: 'Database',
    subcategories: ['SQL', 'Relational'],
    description: 'Powerful, open source object-relational database system.',
    tags: ['sql', 'database', 'postgres'],
    languages: ['C'],
    frameworks: [],
    license: 'PostgreSQL',
    pricing: 'open source',
    self_hostable: true,
    last_commit_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    stars: 15000,
    likes_count: 350,
    created_at: new Date().toISOString(),
    url: 'https://www.postgresql.org',
  },
  {
    id: 'tool-3',
    title: 'Old Abandoned Tool',
    name: 'Old Tool',
    slug: 'old-tool',
    type: 'library',
    category: 'Utilities',
    subcategories: [],
    description: 'An unmaintained package.',
    tags: ['legacy'],
    languages: ['Python'],
    frameworks: [],
    license: 'GPL-3.0',
    pricing: 'paid',
    self_hostable: false,
    last_commit_date: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(), // >1 year ago
    stars: 120,
    likes_count: 5,
    created_at: new Date().toISOString(),
    url: 'https://example.com/old',
  },
];

describe('Filter Logic Unit Tests', () => {
  it('parses empty search params to default filter state', () => {
    const params = new URLSearchParams('');
    const state = parseFiltersFromUrl(params);
    assert.deepEqual(state, DEFAULT_FILTER_STATE);
  });

  it('parses weird and complex query parameters accurately', () => {
    const params = new URLSearchParams(
      'q=search%20term&cat=Frontend%20Framework&lang=TypeScript,JavaScript&selfhost=true&stars=1000&sort=stars_desc'
    );
    const state = parseFiltersFromUrl(params);
    assert.equal(state.search, 'search term');
    assert.equal(state.category, 'Frontend Framework');
    assert.deepEqual(state.languages, ['TypeScript', 'JavaScript']);
    assert.equal(state.selfHostable, true);
    assert.equal(state.minStars, 1000);
    assert.equal(state.sort, 'stars_desc');
  });

  it('serializes filter state to clean URL query string without defaults', () => {
    const customState = {
      ...DEFAULT_FILTER_STATE,
      category: 'Database',
      selfHostable: true,
      minStars: 500,
    };
    const serialized = serializeFiltersToUrl(customState);
    assert.match(serialized, /cat=Database/);
    assert.match(serialized, /selfhost=true/);
    assert.match(serialized, /stars=500/);
    assert.doesNotMatch(serialized, /sort=/); // default 'best' omitted
  });

  it('calculates maintenance status correctly based on commit timestamps', () => {
    const recent = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const mid = new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString();
    const old = new Date(Date.now() - 450 * 24 * 60 * 60 * 1000).toISOString();

    assert.equal(getMaintenanceStatus(recent), 'active');
    assert.equal(getMaintenanceStatus(mid), 'slowing');
    assert.equal(getMaintenanceStatus(old), 'abandoned');
    assert.equal(getMaintenanceStatus(null), 'active'); // fallback
  });

  it('filters tools by category correctly', () => {
    const filtered = applyFiltersAndSort(mockTools, {
      ...DEFAULT_FILTER_STATE,
      category: 'Frontend Framework',
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].title, 'React');
  });

  it('filters tools by self-hostable flag and minimum stars', () => {
    const filtered = applyFiltersAndSort(mockTools, {
      ...DEFAULT_FILTER_STATE,
      selfHostable: true,
      minStars: 20000,
    });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].slug, 'react');
  });

  it('filters tools by maintenance status', () => {
    const filtered = applyFiltersAndSort(mockTools, {
      ...DEFAULT_FILTER_STATE,
      maintenance: 'active',
    });
    assert.equal(filtered.length, 2); // React (5d ago) and Postgres (60d ago) are <= 90d
  });

  it('sorts tools by stars in descending order', () => {
    const sorted = applyFiltersAndSort(mockTools, {
      ...DEFAULT_FILTER_STATE,
      sort: 'stars_desc',
    });
    assert.equal(sorted[0].slug, 'react'); // 220,000
    assert.equal(sorted[1].slug, 'postgresql'); // 15,000
    assert.equal(sorted[2].slug, 'old-tool'); // 120
  });

  it('computes filter facet counts accurately', () => {
    const counts = computeFilterCounts(mockTools);
    assert.equal(counts.categories['frontend framework'], 1);
    assert.equal(counts.categories['database'], 1);
    assert.equal(counts.pricing['open source'], 2);
    assert.equal(counts.pricing['paid'], 1);
    assert.equal(counts.maintenance.active, 2);
    assert.equal(counts.maintenance.abandoned, 1);
  });
});
