import { supabase } from './supabase';
import type { Tool } from './supabase';

// ─── Types ──────────────────────────────────────────────────────────

export interface RepoMetadata {
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

export interface LLMStackResult {
  tool: Tool;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  suggested_stack: Array<{ category: string; tool: string; reason: string }>;
  setup_commands: string[];
}

// ─── GitHub Proxy (Batch Star Fetching with Caching) ────────────────

const EDGE_FUNCTION_BASE = import.meta.env.VITE_SUPABASE_URL;

/**
 * Fetch GitHub metadata for multiple repos in a single batched call.
 * Uses the `github-proxy` edge function with Redis caching.
 * Falls back to direct GitHub API if edge function is unavailable.
 */
export async function fetchBatchRepoMetadata(
  repos: Array<{ owner: string; repo: string }>
): Promise<Record<string, RepoMetadata>> {
  try {
    const response = await fetch(`${EDGE_FUNCTION_BASE}/functions/v1/github-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({ repos }),
    });

    if (!response.ok) {
      throw new Error(`Edge function returned ${response.status}`);
    }

    const { data } = await response.json();
    return data as Record<string, RepoMetadata>;
  } catch (error) {
    console.warn('github-proxy edge function unavailable, falling back to direct API:', error);
    return fallbackFetchStars(repos);
  }
}

/**
 * Fallback: fetch stars directly from GitHub API (no caching, rate-limited).
 */
async function fallbackFetchStars(
  repos: Array<{ owner: string; repo: string }>
): Promise<Record<string, RepoMetadata>> {
  const results: Record<string, RepoMetadata> = {};

  await Promise.all(
    repos.map(async ({ owner, repo }) => {
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        results[`${owner}/${repo}`] = {
          stars: data.stargazers_count || 0,
          forks: data.forks_count || 0,
          issues: data.open_issues_count || 0,
          language: data.language,
          description: data.description,
          updated_at: data.updated_at,
          topics: data.topics || [],
          license: data.license?.spdx_id || null,
          cached_at: Date.now(),
        };
      } catch {
        results[`${owner}/${repo}`] = {
          stars: 0, forks: 0, issues: 0, language: null,
          description: null, updated_at: '', topics: [], license: null,
          cached_at: Date.now(),
        };
      }
    })
  );

  return results;
}

// ─── AI Stack Generation (Real LLM) ────────────────────────────────

/**
 * Generate a stack recommendation using the AI edge function.
 * Requires authentication (uses the user's session token).
 * Falls back to the local oracle if the edge function is unavailable.
 */
export async function generateStackWithAI(
  query: string,
  tools: Tool[]
): Promise<LLMStackResult> {
  const { data: { session } } = await supabase.auth.getSession();

  // If authenticated, try the real AI edge function
  if (session?.access_token) {
    try {
      const response = await fetch(`${EDGE_FUNCTION_BASE}/functions/v1/generate-stack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({ query }),
      });

      if (response.ok) {
        const result = await response.json() as LLMStackResult;
        return result;
      }

      // If edge function returns an error, check what kind
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.warn('generate-stack edge function error:', errorData);
      // Fall through to local oracle
    } catch (error) {
      console.warn('generate-stack edge function unavailable:', error);
      // Fall through to local oracle
    }
  }

  // ── Local fallback oracle (enhanced version) ──
  return localOracleQuery(query, tools);
}

/**
 * Enhanced local oracle (no LLM required) — uses keyword matching.
 * Kept as a fallback for unauthenticated users or when no LLM key is configured.
 */
function localOracleQuery(query: string, tools: Tool[]): LLMStackResult {
  const intentConcepts: Record<string, string[]> = {
    privacy: ['security', 'encryption', 'vpn', 'privacy', 'auth', 'firewall'],
    security: ['security', 'encryption', 'auth', 'firewall', 'vulnerability'],
    auth: ['auth', 'login', 'oauth', 'jwt', 'session', 'security'],
    deploy: ['hosting', 'deployment', 'ci/cd', 'cloud', 'devops', 'server'],
    cloud: ['cloud', 'aws', 'gcp', 'azure', 'serverless', 'hosting'],
    design: ['design', 'ui', 'ux', 'figma', 'css', 'frontend'],
    frontend: ['frontend', 'react', 'vue', 'css', 'html', 'browser'],
    database: ['database', 'sql', 'postgres', 'mysql', 'mongo', 'redis', 'backend'],
    backend: ['backend', 'server', 'api', 'database', 'microservice'],
    api: ['api', 'rest', 'graphql', 'endpoint', 'backend'],
    test: ['testing', 'jest', 'cypress', 'playwright', 'ci/cd'],
    ai: ['ai-ml', 'llm', 'gpt', 'neural', 'model', 'machine learning'],
    mobile: ['mobile', 'ios', 'android', 'react native', 'flutter'],
    chat: ['collaboration', 'communication', 'realtime', 'team'],
    build: ['framework', 'frontend', 'backend', 'devtool', 'tool'],
  };

  const words = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const concepts = new Set<string>();
  for (const word of words) {
    if (intentConcepts[word]) {
      intentConcepts[word].forEach(c => concepts.add(c));
    }
    for (const [key, values] of Object.entries(intentConcepts)) {
      if (word.length > 3 && (word.startsWith(key) || key.startsWith(word))) {
        values.forEach(c => concepts.add(c));
      }
    }
  }

  const conceptList = [...concepts];

  // Score each tool
  const scored = tools.map(tool => {
    let score = 0;
    const tagsLower = (tool.tags || []).map(t => t.toLowerCase());
    const titleLower = tool.title.toLowerCase();
    const descLower = tool.description.toLowerCase();
    for (const concept of conceptList) {
      for (const tag of tagsLower) {
        if (tag === concept) score += 10;
        else if (tag.includes(concept) || concept.includes(tag)) score += 5;
      }
      if (titleLower.includes(concept)) score += 4;
      if (descLower.includes(concept)) score += 2;
    }
    return { tool, score: conceptList.length > 0 ? score / conceptList.length : 0 };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0] || { tool: tools[0], score: 0 };

  let confidence: 'high' | 'medium' | 'low';
  if (best.score >= 8) confidence = 'high';
  else if (best.score >= 4) confidence = 'medium';
  else confidence = 'low';

  const bestTag = best.tool?.tags?.[0] || 'general utility';

  return {
    tool: best.tool,
    reasoning: `Based on your project requirements, I recommend ${best.tool.title} for its ${bestTag} capabilities. ${best.tool.description}. This is a local recommendation — sign in with GitHub to unlock AI-powered analysis with deeper reasoning.`,
    confidence,
    suggested_stack: [],
    setup_commands: [],
  };
}

// ─── Stack Export Utilities ─────────────────────────────────────────

/**
 * Generate a package.json from a stack result.
 */
export function exportAsPackageJson(result: LLMStackResult, projectName?: string): string {
  const pkg: Record<string, unknown> = {
    name: projectName || 'my-stackforge-project',
    version: '0.1.0',
    private: true,
    description: `Generated by StackForge — Primary tool: ${result.tool.title}`,
    scripts: {
      dev: 'npm run dev',
      build: 'npm run build',
      start: 'npm start',
    },
    dependencies: {} as Record<string, string>,
    devDependencies: {} as Record<string, string>,
  };

  // Add dependencies from the suggested stack
  const depMap: Record<string, string> = {};
  for (const item of result.suggested_stack) {
    const toolName = item.tool.toLowerCase().replace(/\s+/g, '-');
    depMap[toolName] = 'latest';
  }
  if (Object.keys(depMap).length > 0) {
    pkg.dependencies = depMap;
  }

  return JSON.stringify(pkg, null, 2);
}

/**
 * Generate a README.md from a stack result.
 */
export function exportAsReadme(result: LLMStackResult, query: string): string {
  const lines: string[] = [
    `# ${result.tool.title} Stack`,
    '',
    `> Generated by [StackForge](https://gronckle.com) — AI-Powered Stack Generator`,
    '',
    `## Project Description`,
    '',
    query,
    '',
    `## Primary Recommendation: ${result.tool.title}`,
    '',
    `**Confidence:** ${result.confidence.toUpperCase()}`,
    '',
    result.reasoning,
    '',
    `🔗 [Documentation](${result.tool.url})`,
    '',
  ];

  if (result.suggested_stack.length > 0) {
    lines.push('## Suggested Stack', '');
    lines.push('| Category | Tool | Reason |');
    lines.push('|:---|:---|:---|');
    for (const item of result.suggested_stack) {
      lines.push(`| ${item.category} | **${item.tool}** | ${item.reason} |`);
    }
    lines.push('');
  }

  if (result.setup_commands.length > 0) {
    lines.push('## Quick Setup', '', '```bash');
    for (const cmd of result.setup_commands) {
      lines.push(cmd);
    }
    lines.push('```', '');
  }

  lines.push(
    '---',
    '',
    `*Stack generated on ${new Date().toLocaleDateString()} by StackForge*`,
  );

  return lines.join('\n');
}

// ─── Rate Limiter (Token Bucket for API protection) ───────────────────

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private capacity: number;
  private refillRatePerSecond: number;

  constructor(
    capacity: number = 30, // max 30 requests burst
    refillRatePerSecond: number = 5 // refill 5 requests per second
  ) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<boolean> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRatePerSecond);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

export const globalApiRateLimiter = new TokenBucketRateLimiter(20, 2);

// ─── Vector Search / Similar Stacks (Qdrant & pgvector) ───────────────

export interface SimilarToolResult {
  id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  likes_count: number;
  similarity?: number;
  score?: number;
}

/**
 * Fetch similar tools/stacks using pgvector / Qdrant semantic similarity
 * via the `similar-stacks` Edge Function.
 */
export async function fetchSimilarStacks(params: {
  tool_id?: string;
  query?: string;
  limit?: number;
}): Promise<{ data: SimilarToolResult[]; method: 'vector' | 'tags' | 'keyword' }> {
  const allowed = await globalApiRateLimiter.acquire();
  if (!allowed) {
    console.warn('Client-side rate limit reached for similar stacks query.');
  }

  try {
    const res = await fetch(`${EDGE_FUNCTION_BASE}/functions/v1/similar-stacks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`similar-stacks returned ${res.status}`);
    }

    const json = await res.json();
    return json as { data: SimilarToolResult[]; method: 'vector' | 'tags' | 'keyword' };
  } catch (err) {
    console.warn('Vector search fallback to direct DB search:', err);
    // Fallback directly to supabase text query
    const { data } = await supabase
      .from('tools')
      .select('id, title, description, url, tags, likes_count')
      .limit(params.limit || 5);
    return { data: (data || []) as SimilarToolResult[], method: 'keyword' };
  }
}

