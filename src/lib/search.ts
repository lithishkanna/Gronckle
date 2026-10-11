import { supabase } from './supabase';
import type { Tool } from '@/types/database';

// ─── Developer Synonyms & Query Expansion ───────────────────────────

export const SYNONYM_MAP: Record<string, string[]> = {
  auth: ['authentication', 'login', 'oauth', 'sso', 'jwt', 'session', 'security'],
  authentication: ['auth', 'login', 'oauth', 'sso', 'jwt'],
  oauth: ['auth', 'authentication', 'sso', 'login'],
  login: ['auth', 'authentication', 'sso'],
  sso: ['auth', 'authentication', 'oauth', 'saml'],
  db: ['database', 'sql', 'postgres', 'sqlite', 'redis', 'orm', 'kv'],
  database: ['db', 'sql', 'postgres', 'storage', 'orm'],
  sql: ['database', 'postgres', 'mysql', 'sqlite', 'query'],
  postgres: ['postgresql', 'database', 'sql', 'pgvector'],
  cache: ['redis', 'kv', 'caching', 'memcached', 'lru', 'in-memory'],
  kv: ['key-value', 'cache', 'redis', 'storage'],
  ui: ['components', 'frontend', 'design-system', 'css', 'tailwind', 'interface'],
  frontend: ['ui', 'react', 'vue', 'components', 'browser', 'client'],
  backend: ['server', 'api', 'microservice', 'framework', 'service'],
  api: ['rest', 'graphql', 'endpoint', 'router', 'backend'],
  queue: ['background-jobs', 'worker', 'message-queue', 'bullmq', 'async'],
  worker: ['queue', 'background-job', 'cron', 'task'],
  deploy: ['hosting', 'deployment', 'docker', 'ci-cd', 'devops', 'serverless'],
  hosting: ['deploy', 'cloud', 'serverless', 'infrastructure'],
  devops: ['docker', 'kubernetes', 'ci-cd', 'deployment', 'containers'],
  ai: ['llm', 'machine-learning', 'gpt', 'agent', 'embeddings', 'intelligence'],
  llm: ['ai', 'gpt', 'claude', 'anthropic', 'prompt', 'rag'],
  vector: ['embeddings', 'similarity', 'pgvector', 'semantic', 'rag'],
  test: ['testing', 'jest', 'vitest', 'cypress', 'playwright', 'unit-test'],
  realtime: ['websockets', 'live', 'pubsub', 'sync', 'socket'],
  socket: ['websockets', 'realtime', 'streaming'],
  secret: ['vault', 'encryption', 'privacy', 'security', 'env'],
  docs: ['documentation', 'openapi', 'markdown', 'portal', 'api-docs'],
};

/**
 * Expands a query with synonyms to maximize search recall.
 */
export function expandQuery(query: string): string {
  const words = query.toLowerCase().replace(/[^a-z0-9\s_-]/g, '').trim().split(/\s+/);
  const expansions = new Set<string>();

  for (const word of words) {
    expansions.add(word);
    const synonyms = SYNONYM_MAP[word];
    if (synonyms) {
      synonyms.slice(0, 3).forEach(syn => expansions.add(syn));
    }
  }

  return Array.from(expansions).join(' ');
}

// ─── Search Result Types ────────────────────────────────────────────

export interface HybridSearchResult {
  tools: Tool[];
  total: number;
  didYouMean: string | null;
  method: 'hybrid-rrf' | 'autocomplete' | 'fallback';
}

export interface AutocompleteItem {
  id: string;
  title: string;
  name: string;
  category: string;
  tags: string[];
  stars: number;
  likes_count: number;
}

// ─── Logging No-Result Searches ──────────────────────────────────────

export async function logSearchQuery(query: string, resultCount: number, suggestedQuery?: string | null): Promise<void> {
  try {
    const clean = query.trim();
    if (!clean) return;

    // Log zero-result queries (or all for analytics)
    await supabase.from('search_logs').insert({
      query: clean,
      result_count: resultCount,
      suggested_query: suggestedQuery || null,
    });
  } catch (err) {
    console.warn('Failed to log search query:', err);
  }
}

// ─── Instant Autocomplete (<50ms) ───────────────────────────────────

export async function getAutocomplete(term: string, limit: number = 6): Promise<AutocompleteItem[]> {
  const clean = term.trim();
  if (!clean) return [];

  try {
    const { data, error } = await supabase.rpc('autocomplete_tools', {
      search_term: clean,
      match_limit: limit,
    });

    if (error || !data) return [];
    return data as AutocompleteItem[];
  } catch {
    return [];
  }
}

// ─── Did You Mean Suggestion ────────────────────────────────────────

export async function getDidYouMean(term: string): Promise<string | null> {
  const clean = term.trim();
  if (!clean || clean.length < 3) return null;

  try {
    const { data, error } = await supabase.rpc('suggest_search_term', {
      search_term: clean,
    });

    if (error || !data || typeof data !== 'string') return null;
    const suggestion = data.trim();
    return suggestion.toLowerCase() !== clean.toLowerCase() ? suggestion : null;
  } catch {
    return null;
  }
}

// ─── Hybrid Search with Reciprocal Rank Fusion ──────────────────────

export async function executeHybridSearch(
  query: string,
  options?: {
    embedding?: number[] | null;
    limit?: number;
    signal?: AbortSignal;
  }
): Promise<HybridSearchResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { tools: [], total: 0, didYouMean: null, method: 'hybrid-rrf' };
  }

  // Check if aborted before executing
  if (options?.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // 1. Expand query with developer synonyms
  const expanded = expandQuery(cleanQuery);

  try {
    // 2. Call PostgreSQL hybrid search RPC
    const { data, error } = await supabase.rpc('hybrid_search_tools', {
      search_query: expanded,
      query_embedding: options?.embedding || null,
      match_limit: options?.limit || 24,
      rrf_k: 60.0,
    });

    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (!error && data && data.length > 0) {
      const tools = data as Tool[];
      return {
        tools,
        total: tools.length,
        didYouMean: null,
        method: 'hybrid-rrf',
      };
    }

    // 3. Fallback: If 0 results, get Did-You-Mean suggestion and log no-result search
    const didYouMean = await getDidYouMean(cleanQuery);

    // Asynchronously log the missed search
    logSearchQuery(cleanQuery, 0, didYouMean);

    // If there is a didYouMean suggestion, try fuzzy match on that
    if (didYouMean) {
      const { data: retryData } = await supabase.rpc('hybrid_search_tools', {
        search_query: didYouMean,
        match_limit: options?.limit || 10,
        rrf_k: 60.0,
      });

      if (retryData && retryData.length > 0) {
        return {
          tools: retryData as Tool[],
          total: retryData.length,
          didYouMean,
          method: 'fallback',
        };
      }
    }

    return {
      tools: [],
      total: 0,
      didYouMean,
      method: 'hybrid-rrf',
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    console.error('Hybrid search error, falling back:', err);

    // Fallback: simple text search
    const { data: fallbackData } = await supabase
      .from('tools')
      .select('*')
      .or(`title.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`)
      .limit(options?.limit || 20);

    const tools = (fallbackData || []) as Tool[];
    return {
      tools,
      total: tools.length,
      didYouMean: null,
      method: 'fallback',
    };
  }
}
