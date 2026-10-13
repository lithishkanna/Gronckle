import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── Cache & Rate Limiting ─────────────────────────────────────────────
const REPO_CACHE = new Map<string, { result: Record<string, unknown>; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

const RATE_MAP = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = RATE_MAP.get(ip);
  if (!rec || now - rec.windowStart > RATE_LIMIT_WINDOW_MS) {
    RATE_MAP.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (rec.count >= RATE_LIMIT_MAX) return false;
  rec.count++;
  return true;
}

// ─── Known Legacy / Risky Packages Catalog ─────────────────────────────
const LEGACY_CATALOG: Record<string, { issue: string; risk: 'low' | 'medium' | 'high'; searchCategory: string }> = {
  'moment': { issue: 'Legacy date library: mutable and adds ~300kB to bundle.', risk: 'high', searchCategory: 'date' },
  'request': { issue: 'Deprecated package: no longer maintained since 2020.', risk: 'high', searchCategory: 'http' },
  'axios': { issue: 'Heavy HTTP client: modern fetch or lightweight alternatives are often faster.', risk: 'low', searchCategory: 'http' },
  'lodash': { issue: 'Monolithic utility bundle: modern JS provides native alternatives or modular exports.', risk: 'low', searchCategory: 'utility' },
  'webpack': { issue: 'Complex bundler: modern Vite/Rspack builds are up to 20x faster.', risk: 'medium', searchCategory: 'tooling' },
  'redux': { issue: 'Heavy boilerplate state manager: consider Zustand, Jotai, or Nanostores.', risk: 'medium', searchCategory: 'state' },
  'express': { issue: 'Minimal updates and callback-centric: modern Hono or Fastify deliver much higher throughput.', risk: 'medium', searchCategory: 'backend' },
  'bcrypt': { issue: 'Native C++ bindings can cause cross-platform build friction: consider bcryptjs or argon2.', risk: 'low', searchCategory: 'auth' },
  'faker': { issue: 'Deprecated upstream repo: ensure using @faker-js/faker instead of original abandoned package.', risk: 'high', searchCategory: 'testing' },
};

export function parseManifest(content: string, filename = 'package.json'): { dependencies: string[]; primaryLang: string } {
  const deps: string[] = [];
  let primaryLang = 'javascript';

  if (filename.endsWith('.json') || filename.includes('package')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.dependencies) deps.push(...Object.keys(parsed.dependencies));
      if (parsed.devDependencies) deps.push(...Object.keys(parsed.devDependencies));
      primaryLang = deps.includes('typescript') || parsed.devDependencies?.typescript ? 'typescript' : 'javascript';
    } catch {
      // invalid json
    }
  } else if (filename.endsWith('.txt') || filename.includes('requirements')) {
    primaryLang = 'python';
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim().split(/[=><~#]/)[0].trim();
      if (trimmed && !trimmed.startsWith('-')) deps.push(trimmed);
    }
  } else if (filename.endsWith('.mod') || filename.includes('go')) {
    primaryLang = 'go';
    const matches = content.matchAll(/^\s*([a-zA-Z0-9.\-_/]+)\s+v/gm);
    for (const m of matches) {
      deps.push(m[1]);
    }
  }

  return { dependencies: Array.from(new Set(deps)), primaryLang };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'anon';
    if (!checkRateLimit(clientIp)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded for repository analysis (15 req/min).' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as {
      repo_url?: string;
      manifest_content?: string;
      manifest_filename?: string;
    };

    let manifestText = body.manifest_content || '';
    let filename = body.manifest_filename || 'package.json';
    let repoName = 'Uploaded Manifest';

    // If repo_url provided, fetch from GitHub
    if (body.repo_url) {
      const cleanUrl = body.repo_url.trim().replace(/\/$/, '');
      const match = cleanUrl.match(/^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
      if (!match) {
        return new Response(JSON.stringify({ error: 'Invalid GitHub URL. Must be https://github.com/owner/repo' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const owner = match[1];
      const repo = match[2];
      repoName = `${owner}/${repo}`;

      // Check cache
      const cached = REPO_CACHE.get(cleanUrl);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return new Response(JSON.stringify(cached.result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        });
      }

      // Try fetching manifest files
      const candidateFiles = ['package.json', 'requirements.txt', 'go.mod'];
      const branches = ['main', 'master'];
      let fetched = false;

      const headers: Record<string, string> = {};
      if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;

      for (const branch of branches) {
        if (fetched) break;
        for (const file of candidateFiles) {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file}`;
          try {
            const res = await fetch(rawUrl, { headers });
            if (res.ok) {
              manifestText = await res.text();
              filename = file;
              fetched = true;
              break;
            }
          } catch {
            // continue
          }
        }
      }

      if (!fetched) {
        return new Response(JSON.stringify({
          error: `Could not find a public package.json, requirements.txt, or go.mod in https://github.com/${owner}/${repo}. Please paste the manifest contents directly.`,
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!manifestText.trim()) {
      return new Response(JSON.stringify({ error: 'No manifest content provided or found.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { dependencies, primaryLang } = parseManifest(manifestText, filename);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Analyze dependencies for flagged items
    const flaggedDependencies: Array<{
      name: string;
      issue: string;
      risk: 'low' | 'medium' | 'high';
      suggested_alternatives: Array<{ id: string; title: string; slug: string; description: string; url: string; stars?: number }>;
    }> = [];

    for (const dep of dependencies) {
      const cleanDep = dep.toLowerCase().replace(/^@types\//, '');
      const legacyInfo = LEGACY_CATALOG[cleanDep];

      if (legacyInfo) {
        // Query Gronckle DB for modern alternatives
        const { data: alternatives } = await supabase.rpc('hybrid_search_tools', {
          search_query: `${legacyInfo.searchCategory} lightweight modern`,
          match_limit: 3,
        });

        flaggedDependencies.push({
          name: dep,
          issue: legacyInfo.issue,
          risk: legacyInfo.risk,
          suggested_alternatives: (alternatives || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            description: a.description,
            url: a.url,
            stars: a.stars,
          })),
        });
      }
    }

    // Detect missing layers / vault recommendations
    const vaultRecommendations: Array<{
      layer: string;
      observation: string;
      suggested_tool: { id: string; title: string; slug: string; description: string; url: string };
    }> = [];

    // Check testing framework
    const hasTesting = dependencies.some(d => /test|jest|vitest|playwright|cypress|pytest/i.test(d));
    if (!hasTesting) {
      const { data: testTools } = await supabase.rpc('hybrid_search_tools', {
        search_query: 'testing automation',
        match_limit: 1,
      });
      if (testTools && testTools[0]) {
        vaultRecommendations.push({
          layer: 'Testing & QA',
          observation: 'No automated testing or visual regression framework detected in manifest.',
          suggested_tool: testTools[0],
        });
      }
    }

    // Check monitoring / observability
    const hasMonitoring = dependencies.some(d => /sentry|datadog|log|telemetry|monitor/i.test(d));
    if (!hasMonitoring) {
      const { data: monTools } = await supabase.rpc('hybrid_search_tools', {
        search_query: 'monitoring uptime errors',
        match_limit: 1,
      });
      if (monTools && monTools[0]) {
        vaultRecommendations.push({
          layer: 'Observability & Monitoring',
          observation: 'No error-tracking or monitoring SDK detected for production visibility.',
          suggested_tool: monTools[0],
        });
      }
    }

    const result = {
      repo: repoName,
      manifest_filename: filename,
      primary_language: primaryLang,
      dependencies_count: dependencies.length,
      detected_dependencies: dependencies.slice(0, 50),
      flagged_dependencies: flaggedDependencies,
      vault_recommendations: vaultRecommendations,
      health_score: Math.max(20, 100 - (flaggedDependencies.filter(f => f.risk === 'high').length * 25) - (flaggedDependencies.filter(f => f.risk === 'medium').length * 15)),
      analyzed_at: new Date().toISOString(),
    };

    if (body.repo_url) {
      REPO_CACHE.set(body.repo_url.trim(), { result, timestamp: Date.now() });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
