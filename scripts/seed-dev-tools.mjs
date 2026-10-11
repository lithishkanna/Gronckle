/**
 * DEV-ONLY SCRIPT: Seed fake tools for local testing
 * Clearly marked test data for validating search, recommendations, and filters.
 *
 * Usage:
 *   node scripts/seed-dev-tools.mjs
 * Or to clean them up:
 *   node scripts/seed-dev-tools.mjs --clean
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read .env if present
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...values] = trimmed.split('=');
    env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or Supabase Key in .env. Exiting.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 10 fake tools clearly flagged as test data
const DEV_FAKE_TOOLS = [
  {
    title: '[TEST DATA] MockKV Cache Engine',
    name: 'MockKV Cache Engine',
    slug: 'mockkv-cache-engine-dev-test',
    type: 'library',
    category: 'database',
    subcategories: ['caching', 'key-value'],
    description: '[TEST DATA - DEV ONLY] In-memory lightweight LRU key-value store designed for rapid microservice caching.',
    use_cases: ['session storage', 'rate limiting', 'low-latency caching'],
    tags: ['caching', 'kv', 'database', 'in-memory', 'dev-test'],
    languages: ['TypeScript', 'Rust'],
    frameworks: ['Node', 'Deno'],
    runtime: ['node', 'deno'],
    deploy_targets: ['docker', 'serverless'],
    license: 'MIT',
    pricing: 'open source',
    self_hostable: true,
    maturity: 'stable',
    last_commit_date: new Date().toISOString(),
    stars: 1240,
    open_issues: 4,
    url: 'https://github.com/example/mockkv-dev-test',
    security_grade: 'A',
    likes_count: 42,
  },
  {
    title: '[TEST DATA] NeoAuth Guard',
    name: 'NeoAuth Guard',
    slug: 'neoauth-guard-dev-test',
    type: 'service',
    category: 'auth',
    subcategories: ['oauth', 'sso'],
    description: '[TEST DATA - DEV ONLY] Passwordless and passkey authentication service with multi-tenant SSO support.',
    use_cases: ['user authentication', 'single sign-on', 'mfa'],
    tags: ['auth', 'authentication', 'security', 'oauth', 'dev-test'],
    languages: ['TypeScript', 'Go'],
    frameworks: ['Next.js', 'React', 'FastAPI'],
    runtime: ['node', 'browser'],
    deploy_targets: ['cloud', 'docker'],
    license: 'Apache-2.0',
    pricing: 'free tier',
    self_hostable: true,
    maturity: 'mature',
    last_commit_date: new Date().toISOString(),
    stars: 3820,
    open_issues: 12,
    url: 'https://github.com/example/neoauth-dev-test',
    security_grade: 'A+',
    likes_count: 88,
  },
  {
    title: '[TEST DATA] EmberPulse Realtime Hub',
    name: 'EmberPulse Realtime Hub',
    slug: 'emberpulse-realtime-hub-dev-test',
    type: 'service',
    category: 'backend',
    subcategories: ['websockets', 'pubsub'],
    description: '[TEST DATA - DEV ONLY] Scalable WebSocket server and real-time state synchronization bus.',
    use_cases: ['collaborative whiteboards', 'live chat', 'gaming multiplayer'],
    tags: ['realtime', 'websockets', 'pubsub', 'collaborative', 'dev-test'],
    languages: ['Rust', 'TypeScript'],
    frameworks: ['React', 'Vue', 'Svelte'],
    runtime: ['node', 'browser'],
    deploy_targets: ['docker', 'kubernetes'],
    license: 'MIT',
    pricing: 'open source',
    self_hostable: true,
    maturity: 'stable',
    last_commit_date: new Date().toISOString(),
    stars: 5210,
    open_issues: 18,
    url: 'https://github.com/example/emberpulse-dev-test',
    security_grade: 'A',
    likes_count: 110,
  },
  {
    title: '[TEST DATA] VeloceUI Component Kit',
    name: 'VeloceUI Component Kit',
    slug: 'veloceui-kit-dev-test',
    type: 'library',
    category: 'frontend',
    subcategories: ['ui-components', 'design-system'],
    description: '[TEST DATA - DEV ONLY] Accessible, headless UI component kit built for maximum rendering speed.',
    use_cases: ['dashboards', 'responsive websites', 'design systems'],
    tags: ['frontend', 'react', 'ui', 'components', 'tailwind', 'dev-test'],
    languages: ['TypeScript'],
    frameworks: ['React', 'Next.js'],
    runtime: ['browser'],
    deploy_targets: ['vercel', 'cloudflare-pages'],
    license: 'MIT',
    pricing: 'open source',
    self_hostable: true,
    maturity: 'mature',
    last_commit_date: new Date().toISOString(),
    stars: 8400,
    open_issues: 22,
    url: 'https://github.com/example/veloceui-dev-test',
    security_grade: 'A',
    likes_count: 245,
  },
  {
    title: '[TEST DATA] DragonQueue Worker Engine',
    name: 'DragonQueue Worker Engine',
    slug: 'dragonqueue-worker-dev-test',
    type: 'library',
    category: 'backend',
    subcategories: ['background-jobs', 'message-queue'],
    description: '[TEST DATA - DEV ONLY] High-throughput distributed background worker and message queue engine.',
    use_cases: ['video processing', 'email queuing', 'cron schedules'],
    tags: ['queues', 'background-jobs', 'worker', 'backend', 'dev-test'],
    languages: ['Python', 'TypeScript'],
    frameworks: ['FastAPI', 'Node'],
    runtime: ['python', 'node'],
    deploy_targets: ['docker', 'aws'],
    license: 'Apache-2.0',
    pricing: 'open source',
    self_hostable: true,
    maturity: 'stable',
    last_commit_date: new Date().toISOString(),
    stars: 2190,
    open_issues: 9,
    url: 'https://github.com/example/dragonqueue-dev-test',
    security_grade: 'A',
    likes_count: 67,
  },
  {
    title: '[TEST DATA] ForgeDeploy CLI',
    name: 'ForgeDeploy CLI',
    slug: 'forgedeploy-cli-dev-test',
    type: 'library',
    category: 'devops',
    subcategories: ['cli', 'deployment'],
    description: '[TEST DATA - DEV ONLY] Zero-configuration deployment CLI that spins up preview environments on bare metal.',
    use_cases: ['preview deploys', 'ci-cd pipelines', 'cloud orchestration'],
    tags: ['devops', 'cli', 'deployment', 'docker', 'dev-test'],
    languages: ['Go'],
    frameworks: [],
    runtime: ['node', 'deno'],
    deploy_targets: ['docker', 'bare-metal'],
    license: 'MIT',
    pricing: 'open source',
    self_hostable: true,
    maturity: 'beta',
    last_commit_date: new Date().toISOString(),
    stars: 940,
    open_issues: 14,
    url: 'https://github.com/example/forgedeploy-dev-test',
    security_grade: 'B+',
    likes_count: 31,
  },
  {
    title: '[TEST DATA] PyGronk Analytics',
    name: 'PyGronk Analytics',
    slug: 'pygronk-analytics-dev-test',
    type: 'service',
    category: 'analytics',
    subcategories: ['event-tracking', 'telemetry'],
    description: '[TEST DATA - DEV ONLY] Privacy-first, cookieless web analytics server with instant dashboard exports.',
    use_cases: ['privacy analytics', 'product telemetry', 'pageview counting'],
    tags: ['analytics', 'privacy', 'telemetry', 'dev-test'],
    languages: ['Python', 'JavaScript'],
    frameworks: ['Django', 'React'],
    runtime: ['python', 'browser'],
    deploy_targets: ['self-hosted', 'cloud'],
    license: 'GPL-3.0',
    pricing: 'open source',
    self_hostable: true,
    maturity: 'stable',
    last_commit_date: new Date().toISOString(),
    stars: 1650,
    open_issues: 7,
    url: 'https://github.com/example/pygronk-dev-test',
    security_grade: 'A',
    likes_count: 53,
  },
  {
    title: '[TEST DATA] ScribeDoc Generator',
    name: 'ScribeDoc Generator',
    slug: 'scribedoc-generator-dev-test',
    type: 'website',
    category: 'documentation',
    subcategories: ['static-site-generator', 'api-docs'],
    description: '[TEST DATA - DEV ONLY] Instant markdown and OpenAPI documentation portal builder with live search.',
    use_cases: ['api documentation', 'developer portals', 'changelogs'],
    tags: ['documentation', 'openapi', 'markdown', 'dev-test'],
    languages: ['TypeScript'],
    frameworks: ['Next.js', 'Astro'],
    runtime: ['node', 'browser'],
    deploy_targets: ['vercel', 'cloudflare-pages', 'github-pages'],
    license: 'MIT',
    pricing: 'free tier',
    self_hostable: true,
    maturity: 'mature',
    last_commit_date: new Date().toISOString(),
    stars: 4320,
    open_issues: 11,
    url: 'https://github.com/example/scribedoc-dev-test',
    security_grade: 'A',
    likes_count: 94,
  },
  {
    title: '[TEST DATA] CypherShield Secret Vault',
    name: 'CypherShield Secret Vault',
    slug: 'cyphershield-secret-vault-dev-test',
    type: 'service',
    category: 'security',
    subcategories: ['secret-management', 'encryption'],
    description: '[TEST DATA - DEV ONLY] Client-side encrypted environment variable and secret manager with audit logging.',
    use_cases: ['env secrets', 'api key rotation', 'end-to-end encryption'],
    tags: ['security', 'encryption', 'secrets', 'privacy', 'dev-test'],
    languages: ['Rust', 'TypeScript'],
    frameworks: ['Node', 'React'],
    runtime: ['node', 'browser'],
    deploy_targets: ['docker', 'kubernetes'],
    license: 'Apache-2.0',
    pricing: 'paid',
    self_hostable: true,
    maturity: 'mature',
    last_commit_date: new Date().toISOString(),
    stars: 6710,
    open_issues: 15,
    url: 'https://github.com/example/cyphershield-dev-test',
    security_grade: 'A+',
    likes_count: 180,
  },
  {
    title: '[TEST DATA] FormMatrix Validator',
    name: 'FormMatrix Validator',
    slug: 'formmatrix-validator-dev-test',
    type: 'library',
    category: 'frontend',
    subcategories: ['forms', 'validation'],
    description: '[TEST DATA - DEV ONLY] Isomorphic schema-based form management and validation library for web apps.',
    use_cases: ['form validation', 'dynamic inputs', 'multi-step wizards'],
    tags: ['forms', 'validation', 'typescript', 'frontend', 'dev-test'],
    languages: ['TypeScript'],
    frameworks: ['React', 'Vue', 'Svelte'],
    runtime: ['node', 'browser'],
    deploy_targets: ['npm'],
    license: 'MIT',
    pricing: 'open source',
    self_hostable: true,
    maturity: 'stable',
    last_commit_date: new Date().toISOString(),
    stars: 3100,
    open_issues: 8,
    url: 'https://github.com/example/formmatrix-dev-test',
    security_grade: 'A',
    likes_count: 76,
  },
];

async function main() {
  const isClean = process.argv.includes('--clean');

  if (isClean) {
    console.log('Cleaning up test data...');
    const { error } = await supabase
      .from('tools')
      .delete()
      .ilike('title', '[TEST DATA]%');
    if (error) {
      console.error('Failed to clean test tools:', error.message);
    } else {
      console.log('Successfully removed all [TEST DATA] tools.');
    }
    return;
  }

  console.log('Seeding 10 fake tools clearly marked as [TEST DATA]...');
  for (const tool of DEV_FAKE_TOOLS) {
    // Check if table supports extended columns or base columns
    const { error } = await supabase.from('tools').upsert(tool, { onConflict: 'title' });
    if (error) {
      // Fallback for pre-Phase 1 schema
      const baseTool = {
        title: tool.title,
        description: tool.description,
        url: tool.url,
        tags: tool.tags,
        likes_count: tool.likes_count,
        security_grade: tool.security_grade,
      };
      const { error: baseError } = await supabase.from('tools').upsert(baseTool, { onConflict: 'title' });
      if (baseError) {
        console.warn(`Could not insert ${tool.title}:`, baseError.message);
      } else {
        console.log(`Inserted (base fields): ${tool.title}`);
      }
    } else {
      console.log(`Inserted: ${tool.title}`);
    }
  }
  console.log('Done seeding test tools.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
