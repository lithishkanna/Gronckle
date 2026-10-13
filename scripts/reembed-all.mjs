/**
 * Gronckle Tool Re-embedding Pipeline
 * Re-embeds all tools in public.tools using OpenAI or Gemini embeddings.
 * 
 * Features:
 * - Batched API requests (default: 50 per batch)
 * - Exponential backoff on rate limits / network errors
 * - Resume from checkpoint if interrupted
 * - Single model and dimension consistency ('text-embedding-3-small', 1536 dims)
 * - Detailed progress logging
 * 
 * Usage:
 *   node scripts/reembed-all.mjs
 *   node scripts/reembed-all.mjs --batch-size 25 --force
 *   node scripts/reembed-all.mjs --provider gemini --model text-embedding-004
 *   node scripts/reembed-all.mjs --offline-fallback (uses keyword pseudo-vector for zero-key dev)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHECKPOINT_FILE = path.resolve(__dirname, '.reembed-checkpoint.json');

// ─── Environment Loading ───────────────────────────────────────────────
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
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://fdjzbwnslbyoccxbumgd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';

// ─── CLI Options ───────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}
const hasFlag = (flag) => args.includes(flag);

const BATCH_SIZE = parseInt(getArg('--batch-size', '50'), 10);
const FORCE = hasFlag('--force');
const OFFLINE_FALLBACK = hasFlag('--offline-fallback');
const PROVIDER = getArg('--provider', process.env.EMBEDDING_PROVIDER || env.EMBEDDING_PROVIDER || 'openai').toLowerCase();
const MODEL = getArg('--model', process.env.EMBEDDING_MODEL || env.EMBEDDING_MODEL || 'text-embedding-3-small');
const DIMENSIONS = 1536;

// ─── Offline Keyword Vector Generator ──────────────────────────────────
function fnv1a(str, seed = 0x811c9dc5) {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function generateOfflineKeywordVector(text, dims = DIMENSIONS) {
  const vec = new Float32Array(dims);
  const clean = text.toLowerCase().replace(/[^a-z0-9_#-]+/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return Array.from(vec);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const weight = 1.0 / Math.sqrt(Math.min(i + 1, 10));
    for (let k = 0; k < 4; k++) {
      const h = fnv1a(w, 0x811c9dc5 + k * 1013);
      const idx = h % dims;
      const sign = (h & 0x80000000) ? -1 : 1;
      vec[idx] += sign * weight;
    }
  }

  let norm = 0;
  for (let i = 0; i < dims; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dims; i++) vec[i] /= norm;
  }
  return Array.from(vec);
}

// ─── Build Tool Embedding Input ────────────────────────────────────────
function buildToolEmbeddingText(t) {
  const parts = [
    t.title || t.name,
    t.category ? `Category: ${t.category}` : '',
    t.subcategories?.length ? `Subcategories: ${t.subcategories.join(', ')}` : '',
    t.description || '',
    t.use_cases?.length ? `Use cases: ${t.use_cases.join(', ')}` : '',
    t.tags?.length ? `Tags: ${t.tags.join(', ')}` : '',
    t.languages?.length ? `Languages: ${t.languages.join(', ')}` : '',
    t.frameworks?.length ? `Frameworks: ${t.frameworks.join(', ')}` : '',
    t.install_command ? `Install: ${t.install_command}` : '',
  ].filter(Boolean);
  return parts.join(' - ');
}

// ─── Provider Embedding Call with Backoff ──────────────────────────────
async function callOpenAiEmbeddings(texts, model = MODEL, maxRetries = 3) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing in environment or .env');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          input: texts,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errType = errorData.error?.type || '';
        const errMsg = errorData.error?.message || `HTTP ${res.status}`;

        if (res.status === 429) {
          if (errType === 'insufficient_quota' || errMsg.includes('quota') || errMsg.includes('credit')) {
            throw new Error(`OpenAI Quota Exhausted: ${errMsg}. Use --offline-fallback or provide a funded key.`);
          }
          console.warn(`[Rate limited 429] Waiting ${(attempt * 2)}s before retry ${attempt}/${maxRetries}...`);
          await new Promise(r => setTimeout(r, attempt * 2000));
          continue;
        }

        if (res.status >= 500 && attempt < maxRetries) {
          console.warn(`[OpenAI 5xx error] Retrying in ${(attempt * 1.5)}s...`);
          await new Promise(r => setTimeout(r, attempt * 1500));
          continue;
        }

        throw new Error(`OpenAI API error (${res.status}): ${errMsg}`);
      }

      const json = await res.json();
      return json.data.map(d => d.embedding);
    } catch (err) {
      if (err.message.includes('Quota Exhausted')) throw err;
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function callGeminiEmbeddings(texts, model = 'text-embedding-004', maxRetries = 3) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing in environment or .env');
  }

  // Gemini batch embedding endpoint
  const results = [];
  for (const text of texts) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${GEMINI_API_KEY}`;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text }] },
            outputDimensionality: DIMENSIONS,
          }),
        });
        if (!res.ok) {
          if (res.status === 429 && attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000 * attempt));
            continue;
          }
          throw new Error(`Gemini embed error ${res.status}`);
        }
        const data = await res.json();
        results.push(data.embedding.values);
        break;
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  return results;
}

// ─── Main Execution ────────────────────────────────────────────────────
async function main() {
  console.log('=== Gronckle Tool Re-embedding Pipeline ===');
  console.log(`Target Model:    ${OFFLINE_FALLBACK ? 'keyword-fallback-v1 (offline)' : `${PROVIDER}:${MODEL}`}`);
  console.log(`Dimensions:      ${DIMENSIONS}`);
  console.log(`Batch Size:      ${BATCH_SIZE}`);
  console.log(`Force Re-embed:  ${FORCE}\n`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: Supabase configuration missing.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Check checkpoint
  let processedIds = new Set();
  if (fs.existsSync(CHECKPOINT_FILE) && !FORCE) {
    try {
      const cp = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'));
      if (Array.isArray(cp.completed_ids)) {
        processedIds = new Set(cp.completed_ids);
        console.log(`Resuming from checkpoint: ${processedIds.size} tools already processed.`);
      }
    } catch {
      // Ignore corrupt checkpoint
    }
  }

  // Fetch tools
  const { data: tools, error: fetchErr } = await supabase
    .from('tools')
    .select('id, title, name, slug, category, subcategories, description, use_cases, tags, languages, frameworks, install_command, embedding_model');

  if (fetchErr) {
    console.error('Failed to fetch tools from Supabase:', fetchErr.message);
    process.exit(1);
  }

  const effectiveTools = (tools || []).filter(t => {
    if (processedIds.has(t.id)) return false;
    if (FORCE) return true;
    if (OFFLINE_FALLBACK) return t.embedding_model !== 'keyword-fallback-v1';
    return t.embedding_model !== MODEL;
  });

  console.log(`Total tools in database:     ${tools.length}`);
  console.log(`Tools needing re-embedding:  ${effectiveTools.length}\n`);

  if (effectiveTools.length === 0) {
    console.log('All tools are already up to date with target embedding model. Nothing to do.');
    if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);
    return;
  }

  const currentModelName = OFFLINE_FALLBACK ? 'keyword-fallback-v1' : MODEL;
  let successCount = 0;

  for (let i = 0; i < effectiveTools.length; i += BATCH_SIZE) {
    const batch = effectiveTools.slice(i, i + BATCH_SIZE);
    const batchTexts = batch.map(buildToolEmbeddingText);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(effectiveTools.length / BATCH_SIZE);

    process.stdout.write(`Processing batch [${batchNum}/${totalBatches}] (${batch.length} tools)... `);

    let embeddings = [];
    const startTime = Date.now();

    try {
      if (OFFLINE_FALLBACK) {
        embeddings = batchTexts.map(text => generateOfflineKeywordVector(text, DIMENSIONS));
      } else if (PROVIDER === 'gemini') {
        embeddings = await callGeminiEmbeddings(batchTexts, MODEL);
      } else {
        embeddings = await callOpenAiEmbeddings(batchTexts, MODEL);
      }
    } catch (err) {
      console.log('FAILED');
      console.error(`\nBatch embedding generation failed: ${err.message}`);
      // Save checkpoint before exiting
      fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({
        completed_ids: Array.from(processedIds),
        last_updated: new Date().toISOString(),
        model: currentModelName,
      }, null, 2));
      console.log(`Saved checkpoint to ${CHECKPOINT_FILE}. Re-run script to resume.`);
      process.exit(1);
    }

    const durationMs = Date.now() - startTime;

    // Update database records
    const nowIso = new Date().toISOString();
    for (let j = 0; j < batch.length; j++) {
      const tool = batch[j];
      const emb = embeddings[j];

      const { error: updateErr } = await supabase
        .from('tools')
        .update({
          embedding: emb,
          embedding_model: currentModelName,
          embedded_at: nowIso,
        })
        .eq('id', tool.id);

      if (updateErr) {
        console.warn(`Warning: Failed to update tool ${tool.title} (${tool.id}): ${updateErr.message}`);
      } else {
        processedIds.add(tool.id);
        successCount++;
      }
    }

    console.log(`OK (${durationMs}ms)`);

    // Save checkpoint after each batch
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({
      completed_ids: Array.from(processedIds),
      last_updated: new Date().toISOString(),
      model: currentModelName,
    }, null, 2));
  }

  // Cleanup checkpoint on clean finish
  if (fs.existsSync(CHECKPOINT_FILE)) {
    fs.unlinkSync(CHECKPOINT_FILE);
  }

  console.log(`\nRe-embedding completed successfully!`);
  console.log(`Successfully embedded: ${successCount} tools with model '${currentModelName}'.`);
}

main().catch(err => {
  console.error('Fatal re-embed error:', err);
  process.exit(1);
});
