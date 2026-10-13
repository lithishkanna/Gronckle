import { supabase } from './supabase';
import type { Tool } from '@/types/database';
import { getEmbedding } from './embeddings';

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

export interface SearchFilterParams {
  category?: string;
  subcategories?: string[];
  languages?: string[];
  frameworks?: string[];
  license?: string;
  pricing?: string;
  selfHostable?: boolean | null;
  type?: string;
  minStars?: number;
  tags?: string[];
  maintenance?: string;
  sort?: string;
  offset?: number;
}

export async function fetchFilterCountsFromSql(): Promise<Record<string, Record<string, number>> | null> {
  try {
    const { data, error } = await supabase.rpc('get_filtered_tool_counts');
    if (!error && data) {
      return data as Record<string, Record<string, number>>;
    }
  } catch (err) {
    console.warn('Error fetching SQL filter counts:', err);
  }
  return null;
}

export async function executeHybridSearch(
  query: string,
  options?: {
    embedding?: number[] | null;
    limit?: number;
    filters?: SearchFilterParams;
    signal?: AbortSignal;
  }
): Promise<HybridSearchResult> {
  const cleanQuery = query.trim();
  const hasQuery = cleanQuery.length > 0;

  // Check if aborted before executing
  if (options?.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // 1. Expand query with developer synonyms if searching
  const expanded = hasQuery ? expandQuery(cleanQuery) : '';

  // 2. Generate vector embedding for semantic search leg
  let queryEmbedding = options?.embedding ?? null;
  if (hasQuery && !queryEmbedding) {
    try {
      queryEmbedding = await getEmbedding(cleanQuery);
    } catch {
      queryEmbedding = null;
    }
  }

  const f = options?.filters;

  try {
    // 3. Call PostgreSQL hybrid search RPC with FTS, trigram, vector embeddings & SQL filters
    const rpcParams: Record<string, unknown> = {
      search_query: hasQuery ? expanded : null,
      query_embedding: queryEmbedding,
      match_limit: options?.limit || 24,
      rrf_k: 60.0,
      filter_category: f?.category && f.category !== 'all' ? f.category : null,
      filter_subcategories: f?.subcategories?.length ? f.subcategories : null,
      filter_languages: f?.languages?.length ? f.languages : null,
      filter_frameworks: f?.frameworks?.length ? f.frameworks : null,
      filter_license: f?.license && f.license !== 'all' ? f.license : null,
      filter_pricing: f?.pricing && f.pricing !== 'all' ? f.pricing : null,
      filter_self_hostable: f?.selfHostable !== undefined && f.selfHostable !== null ? f.selfHostable : null,
      filter_type: f?.type && f.type !== 'all' ? f.type : null,
      filter_min_stars: f?.minStars ? f.minStars : null,
      filter_tags: f?.tags?.length ? f.tags : null,
      filter_maintenance: f?.maintenance && f.maintenance !== 'all' ? f.maintenance : null,
      sort_by: f?.sort || 'best',
      page_offset: f?.offset || 0,
    };

    const { data, error } = await supabase.rpc('hybrid_search_tools', rpcParams);

    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (!error && data && data.length > 0) {
      const tools = (data as Tool[]).filter(t => t.type !== 'repo');
      return {
        tools,
        total: tools.length,
        didYouMean: null,
        method: 'hybrid-rrf',
      };
    }

    // 4. Fallback: If 0 results on a text query, try Did-You-Mean suggestion
    if (hasQuery) {
      const didYouMean = await getDidYouMean(cleanQuery);
      logSearchQuery(cleanQuery, 0, didYouMean);

      if (didYouMean) {
        const retryEmbedding = await getEmbedding(didYouMean);
        const { data: retryData } = await supabase.rpc('hybrid_search_tools', {
          ...rpcParams,
          search_query: didYouMean,
          query_embedding: retryEmbedding,
          match_limit: options?.limit || 12,
        });

        if (retryData && retryData.length > 0) {
          const retryTools = (retryData as Tool[]).filter(t => t.type !== 'repo');
          return {
            tools: retryTools,
            total: retryTools.length,
            didYouMean,
            method: 'fallback',
          };
        }
      }
    }

    return {
      tools: [],
      total: 0,
      didYouMean: null,
      method: 'hybrid-rrf',
    };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    console.error('Hybrid search error, falling back:', err);

    // Fallback: simple text query on tools table
    let queryBuilder = supabase.from('tools').select('*');
    if (hasQuery) {
      const safeTerm = cleanQuery.replace(/[(),."'\\]/g, ' ').trim();
      if (safeTerm) {
        queryBuilder = queryBuilder.or(`title.ilike.%${safeTerm}%,description.ilike.%${safeTerm}%,slug.ilike.%${safeTerm}%`);
      }
    }
    if (f?.category && f.category !== 'all') {
      queryBuilder = queryBuilder.eq('category', f.category);
    }
    const { data: fallbackData } = await queryBuilder.limit(options?.limit || 20);

    const tools = (fallbackData || []) as Tool[];
    return {
      tools,
      total: tools.length,
      didYouMean: null,
      method: 'fallback',
    };
  }
}
