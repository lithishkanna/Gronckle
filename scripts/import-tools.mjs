/**
 * Gronckle Data Ingestion Pipeline (scripts/import-tools.mjs)
 * 
 * Imports tools and repositories from data/*.json into the Supabase database.
 * The database is the single source of truth for tools.
 * 
 * Flags:
 *   --file <path>   Specific JSON file to import (e.g., data/curated-tools.json)
 *   --enrich        Auto-enrich repository stars, languages, topics via GitHub
 *   --apply         Commit writes to the Supabase database (dry-run if omitted)
 *   --offline       Use offline keyword vector generator for embeddings
 * 
 * Usage:
 *   node scripts/import-tools.mjs --file data/curated-tools.json --apply
 *   node scripts/import-tools.mjs --file data/new-30-repos.json --enrich --apply
 *   node scripts/import-tools.mjs --file data/free-for-dev.json --apply
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Load Environment ──────────────────────────────────────────────────
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
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || env.GITHUB_TOKEN || '';

const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultValue;
}
const hasFlag = (flag) => args.includes(flag);

const TARGET_FILE = getArg('--file', null);
const DO_ENRICH = hasFlag('--enrich');
const DO_APPLY = hasFlag('--apply');
const OFFLINE = hasFlag('--offline') || !env.OPENAI_API_KEY;

// ─── Offline Embedding Fallback ────────────────────────────────────────
const EMBEDDING_DIMS = 1536;

function fnv1a(str, seed = 0x811c9dc5) {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function generateOfflineKeywordVector(text, dims = EMBEDDING_DIMS) {
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
    t.free_tier_note ? `Free Tier: ${t.free_tier_note}` : '',
  ].filter(Boolean);
  return parts.join(' - ');
}

// ─── Main Pipeline ─────────────────────────────────────────────────────
async function main() {
  console.log('=== Gronckle Tool Import Pipeline ===');
  console.log(`Apply Mode:   ${DO_APPLY ? 'YES (writing to database)' : 'DRY-RUN (read-only)'}`);
  console.log(`Enrich:       ${DO_ENRICH ? 'YES' : 'NO'}`);
  console.log(`Target:       ${TARGET_FILE || 'all data/*.json files'}\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const dataDir = path.resolve(__dirname, '../data');
  const filesToProcess = TARGET_FILE
    ? [path.resolve(process.cwd(), TARGET_FILE)]
    : [
        path.join(dataDir, 'curated-tools.json'),
        path.join(dataDir, 'new-30-repos.json'),
        path.join(dataDir, 'free-for-dev.json'),
      ].filter(f => fs.existsSync(f));

  if (filesToProcess.length === 0) {
    console.error('No input data files found to process.');
    process.exit(1);
  }

  for (const filePath of filesToProcess) {
    const filename = path.basename(filePath);
    console.log(`\n--- Processing ${filename} ---`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const items = JSON.parse(raw);

    if (!Array.isArray(items)) {
      console.warn(`Skipping ${filename}: root is not a JSON array.`);
      continue;
    }

    if (filename.includes('repo')) {
      // Import into repos table
      console.log(`Target Table: repos (${items.length} items)`);
      let repoSuccess = 0;

      for (const repo of items) {
        if (!repo.owner || !repo.repo) {
          console.warn(`Skipping invalid repo item:`, repo.title || repo.url);
          continue;
        }

        const payload = {
          owner: repo.owner,
          repo: repo.repo,
          title: repo.title || repo.repo,
          description: repo.description || '',
          stars: repo.stars || 0,
          category: repo.category || 'tooling',
          tags: repo.tags || [],
          why_underrated: repo.why_underrated || null,
          url: repo.url || `https://github.com/${repo.owner}/${repo.repo}`,
          license: repo.license || 'MIT',
          languages: repo.languages || [],
        };

        if (DO_ENRICH && GITHUB_TOKEN) {
          try {
            const ghRes = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`, {
              headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                'User-Agent': 'Gronckle-Importer',
              },
            });
            if (ghRes.ok) {
              const ghData = await ghRes.json();
              payload.stars = ghData.stargazers_count || payload.stars;
              payload.description = ghData.description || payload.description;
              if (ghData.license?.spdx_id) payload.license = ghData.license.spdx_id;
            }
          } catch {
            // Ignore enrich failure
          }
        }

        if (DO_APPLY) {
          const { data: existing } = await supabase
            .from('repos')
            .select('id')
            .eq('owner', payload.owner)
            .eq('repo', payload.repo)
            .limit(1);

          if (existing && existing.length > 0) {
            await supabase.from('repos').update(payload).eq('id', existing[0].id);
          } else {
            await supabase.from('repos').insert(payload);
          }
          repoSuccess++;
          process.stdout.write('.');
        } else {
          repoSuccess++;
        }
      }

      console.log(`\nProcessed ${repoSuccess}/${items.length} repositories.`);
    } else {
      // Import into tools table
      console.log(`Target Table: tools (${items.length} items)`);
      let toolSuccess = 0;

      for (const tool of items) {
        if (tool.include === false) continue; // Skip excluded tools

        const slug = tool.slug || (tool.title || tool.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const title = tool.title || tool.name;
        const description = tool.description || '';
        const freeTierNote = tool.free_tier_note || (tool.pricing === 'free tier' ? description : null);

        // Precompute embedding
        const embeddingText = buildToolEmbeddingText({ ...tool, title, slug, free_tier_note: freeTierNote });
        const embedding = generateOfflineKeywordVector(embeddingText);

        const payload = {
          title,
          name: tool.name || title,
          slug,
          type: tool.type || 'service',
          category: tool.category || 'general',
          subcategories: tool.subcategories || [],
          description,
          url: tool.url,
          use_cases: tool.use_cases || [],
          tags: tool.tags || ['tool'],
          languages: tool.languages || [],
          frameworks: tool.frameworks || [],
          runtime: tool.runtime || [],
          deploy_targets: tool.deploy_targets || [],
          license: tool.license || 'Proprietary',
          pricing: tool.pricing || 'open source',
          self_hostable: tool.self_hostable ?? false,
          maturity: tool.maturity || 'stable',
          stars: tool.stars || 0,
          likes_count: tool.likes_count || 10,
          install_command: tool.install_command || null,
          npm_package: tool.npm_package || null,
          free_tier_note: freeTierNote,
          embedding,
          embedding_model: 'keyword-fallback-v1',
          embedded_at: new Date().toISOString(),
        };

        if (DO_APPLY) {
          const { data: existing } = await supabase
            .from('tools')
            .select('id')
            .eq('slug', slug)
            .limit(1);

          if (existing && existing.length > 0) {
            await supabase.from('tools').update(payload).eq('id', existing[0].id);
          } else {
            await supabase.from('tools').insert(payload);
          }
          toolSuccess++;
          process.stdout.write('.');
        } else {
          toolSuccess++;
        }
      }

      console.log(`\nProcessed ${toolSuccess} tools.`);
    }
  }

  console.log('\nImport pipeline finished successfully!');
}

main().catch(err => {
  console.error('Fatal import error:', err);
  process.exit(1);
});
