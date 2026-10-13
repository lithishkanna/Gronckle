import { SYNONYM_MAP } from './search';

export const EMBEDDING_DIMENSIONS = 1536;

/**
 * FNV-1a 32-bit hash function
 */
function fnv1a(str: string, seed: number = 0x811c9dc5): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Normalizes and expands text with synonyms for rich semantic representation
 */
export function expandTextForEmbedding(text: string): string[] {
  const clean = text.toLowerCase().replace(/[^a-z0-9_#-]+/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const tokens = new Set<string>();

  for (const w of words) {
    tokens.add(w);
    // Add known synonyms
    const syns = SYNONYM_MAP[w];
    if (syns) {
      syns.slice(0, 4).forEach(s => tokens.add(s));
    }
  }

  // Also include 2-word n-grams for phrase semantics (e.g. "next-auth", "next js")
  for (let i = 0; i < words.length - 1; i++) {
    tokens.add(`${words[i]}_${words[i + 1]}`);
  }

  return Array.from(tokens);
}

/**
 * Offline keyword-like pseudo-vector generator (FNV-1a hash based).
 * NOTE: This is NOT a semantic neural embedding. It is purely an offline,
 * deterministic keyword-hash representation used for zero-credential unit tests
 * and offline development. Real semantic embeddings are generated exclusively
 * server-side via OpenAI or Gemini in Supabase edge functions and migration scripts.
 */
export function generateOfflineKeywordVector(text: string, dims: number = EMBEDDING_DIMENSIONS): number[] {
  const vec = new Float32Array(dims);
  const tokens = expandTextForEmbedding(text);
  if (tokens.length === 0) return Array.from(vec);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // Word importance weight: earlier tokens have higher weight
    const weight = 1.0 / Math.sqrt(Math.min(i + 1, 10));

    // Project each token across multiple orthogonal dimensions with sign hashing
    for (let k = 0; k < 4; k++) {
      const h = fnv1a(token, 0x811c9dc5 + k * 1013);
      const idx = h % dims;
      const sign = (h & 0x80000000) ? -1 : 1;
      vec[idx] += sign * weight;
    }
  }

  // Normalize to unit length (L2 norm)
  let norm = 0;
  for (let i = 0; i < dims; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dims; i++) vec[i] /= norm;
  }

  return Array.from(vec);
}

/**
 * Backward-compatible alias for the offline keyword pseudo-vector.
 * @deprecated Use generateOfflineKeywordVector or server-side embeddings.
 */
export const generateLocalEmbedding = generateOfflineKeywordVector;

/**
 * Client-safe embedding retriever.
 * In accordance with Gronckle security rules, no AI provider API keys are ever
 * exposed to or executed inside browser client code.
 * Browser searches execute PostgreSQL FTS + pg_trgm hybrid search, while
 * semantic embeddings are generated server-side.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  const clean = text.trim();
  if (!clean) return null;
  // Offline fallback vector for offline-only simulation
  return generateOfflineKeywordVector(clean, EMBEDDING_DIMENSIONS);
}

/**
 * Builds standard metadata text representation for tool embedding
 */
export function buildToolEmbeddingText(tool: {
  title: string;
  name?: string;
  slug?: string;
  category?: string;
  subcategories?: string[];
  description?: string;
  use_cases?: string[];
  tags?: string[];
  languages?: string[];
  frameworks?: string[];
}): string {
  const parts = [
    tool.title,
    tool.name && tool.name !== tool.title ? tool.name : '',
    tool.slug ? tool.slug.replace(/[-_]/g, ' ') : '',
    tool.category ? `Category: ${tool.category}` : '',
    tool.subcategories?.length ? `Subcategories: ${tool.subcategories.join(', ')}` : '',
    tool.description || '',
    tool.use_cases?.length ? `Use cases: ${tool.use_cases.join(', ')}` : '',
    tool.tags?.length ? `Tags: ${tool.tags.join(', ')}` : '',
    tool.languages?.length ? `Languages: ${tool.languages.join(', ')}` : '',
    tool.frameworks?.length ? `Frameworks: ${tool.frameworks.join(', ')}` : '',
  ].filter(Boolean);

  return parts.join(' - ');
}
