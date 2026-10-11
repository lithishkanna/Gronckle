import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN') || '';
const UPSTASH_REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') || '';
const UPSTASH_REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '';
const CACHE_TTL = 3600; // 1 hour in seconds

interface GitHubRepo {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  description: string | null;
  updated_at: string;
  topics: string[];
  license: { spdx_id: string } | null;
}

interface CachedData {
  stars: number;
  forks: number;
  issues: number;
  language: string | null;
  description: string | null;
  updated_at: string;
  topics: string[];
  license: string | null;
  cached_at: number;
}

// ── Upstash Redis helpers ──
async function redisGet(key: string): Promise<string | null> {
  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) return null;
  try {
    const res = await fetch(`${UPSTASH_REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}` },
    });
    const data = await res.json();
    return data.result || null;
  } catch {
    return null;
  }
}

async function redisSet(key: string, value: string, ttl: number): Promise<void> {
  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) return;
  try {
    await fetch(`${UPSTASH_REDIS_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/ex/${ttl}`, {
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}` },
    });
  } catch {
    // silently fail
  }
}

// ── In-memory fallback cache ──
const memCache = new Map<string, { data: CachedData; expires: number }>();

function memGet(key: string): CachedData | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memCache.delete(key);
    return null;
  }
  return entry.data;
}

function memSet(key: string, data: CachedData, ttl: number): void {
  memCache.set(key, { data, expires: Date.now() + ttl * 1000 });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { repos } = await req.json() as { repos: Array<{ owner: string; repo: string }> };
    
    if (!repos || !Array.isArray(repos) || repos.length === 0) {
      return new Response(JSON.stringify({ error: 'repos array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Limit batch size
    const batch = repos.slice(0, 30);
    
    const results: Record<string, CachedData> = {};
    const toFetch: Array<{ owner: string; repo: string; key: string }> = [];

    // Check caches first
    for (const { owner, repo } of batch) {
      const key = `gh:${owner}/${repo}`;
      
      // Try in-memory first
      const memCached = memGet(key);
      if (memCached) {
        results[`${owner}/${repo}`] = memCached;
        continue;
      }

      // Try Redis
      const redisCached = await redisGet(key);
      if (redisCached) {
        try {
          const parsed = JSON.parse(redisCached) as CachedData;
          results[`${owner}/${repo}`] = parsed;
          memSet(key, parsed, CACHE_TTL);
          continue;
        } catch {
          // invalid cache, refetch
        }
      }

      toFetch.push({ owner, repo, key });
    }

    // Fetch uncached repos from GitHub API
    if (toFetch.length > 0) {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'StackForge-Gronckle',
      };
      if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
      }

      const fetches = toFetch.map(async ({ owner, repo, key }) => {
        try {
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
          if (!res.ok) {
            results[`${owner}/${repo}`] = {
              stars: 0, forks: 0, issues: 0, language: null,
              description: null, updated_at: '', topics: [], license: null,
              cached_at: Date.now(),
            };
            return;
          }
          const ghData = await res.json() as GitHubRepo;
          const cached: CachedData = {
            stars: ghData.stargazers_count,
            forks: ghData.forks_count,
            issues: ghData.open_issues_count,
            language: ghData.language,
            description: ghData.description,
            updated_at: ghData.updated_at,
            topics: ghData.topics || [],
            license: ghData.license?.spdx_id || null,
            cached_at: Date.now(),
          };
          results[`${owner}/${repo}`] = cached;
          memSet(key, cached, CACHE_TTL);
          await redisSet(key, JSON.stringify(cached), CACHE_TTL);
        } catch {
          results[`${owner}/${repo}`] = {
            stars: 0, forks: 0, issues: 0, language: null,
            description: null, updated_at: '', topics: [], license: null,
            cached_at: Date.now(),
          };
        }
      });

      await Promise.all(fetches);
    }

    return new Response(JSON.stringify({ data: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
