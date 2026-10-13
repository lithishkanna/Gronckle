import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REAL_TOOLS } from './seed-real-tools.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMBEDDING_DIMS = 1536;

function fnv1a(str, seed = 0x811c9dc5) {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function generateLocalEmbedding(text) {
  const vec = new Float32Array(EMBEDDING_DIMS);
  const clean = text.toLowerCase().replace(/[^a-z0-9_#-]+/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return Array.from(vec);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const weight = 1.0 / Math.sqrt(Math.min(i + 1, 12));
    for (let k = 0; k < 4; k++) {
      const h = fnv1a(w, 0x811c9dc5 + k * 1013);
      const idx = h % EMBEDDING_DIMS;
      const sign = (h & 0x80000000) ? -1 : 1;
      vec[idx] += sign * weight;
    }
  }

  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIMS; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIMS; i++) vec[i] /= norm;
  }
  return Array.from(vec);
}

function sqlEscape(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val.toString();
  if (Array.isArray(val)) {
    const escapedItems = val.map(v => `"${String(v).replace(/"/g, '\\"')}"`);
    return `'{${escapedItems.join(',')}}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

const chunks = [];
const CHUNK_SIZE = 25;

for (let i = 0; i < REAL_TOOLS.length; i += CHUNK_SIZE) {
  const batch = REAL_TOOLS.slice(i, i + CHUNK_SIZE);
  const statements = batch.map(tool => {
    const embeddingText = `${tool.title} ${tool.name || ''} ${tool.slug || ''} Category: ${tool.category} Subcategories: ${(tool.subcategories || []).join(', ')} ${tool.description} Use cases: ${(tool.use_cases || []).join(', ')} Tags: ${(tool.tags || []).join(', ')} Languages: ${(tool.languages || []).join(', ')} Frameworks: ${(tool.frameworks || []).join(', ')}`;
    const vec = generateLocalEmbedding(embeddingText);
    const vecStr = `'[${vec.map(v => v.toFixed(6)).join(',')}]'::vector`;

    return `INSERT INTO public.tools (
      title, name, slug, type, category, subcategories, description, use_cases,
      tags, languages, frameworks, runtime, deploy_targets, license, pricing,
      self_hostable, maturity, stars, open_issues, likes_count, url,
      install_command, npm_package, embedding, last_commit_date
    ) VALUES (
      ${sqlEscape(tool.title)},
      ${sqlEscape(tool.name || tool.title)},
      ${sqlEscape(tool.slug)},
      ${sqlEscape(tool.type || 'repo')},
      ${sqlEscape(tool.category || 'general')},
      ${sqlEscape(tool.subcategories || [])},
      ${sqlEscape(tool.description || '')},
      ${sqlEscape(tool.use_cases || [])},
      ${sqlEscape(tool.tags || [])},
      ${sqlEscape(tool.languages || [])},
      ${sqlEscape(tool.frameworks || [])},
      ${sqlEscape(tool.runtime || [])},
      ${sqlEscape(tool.deploy_targets || [])},
      ${sqlEscape(tool.license || 'MIT')},
      ${sqlEscape(tool.pricing || 'open source')},
      ${sqlEscape(tool.self_hostable !== false)},
      ${sqlEscape(tool.maturity || 'mature')},
      ${sqlEscape(tool.stars || 100)},
      ${sqlEscape(tool.open_issues || 0)},
      ${sqlEscape(tool.likes_count || 50)},
      ${sqlEscape(tool.url || '')},
      ${sqlEscape(tool.install_command || null)},
      ${sqlEscape(tool.npm_package || null)},
      ${vecStr},
      now()
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      category = EXCLUDED.category,
      subcategories = EXCLUDED.subcategories,
      description = EXCLUDED.description,
      use_cases = EXCLUDED.use_cases,
      tags = EXCLUDED.tags,
      languages = EXCLUDED.languages,
      frameworks = EXCLUDED.frameworks,
      runtime = EXCLUDED.runtime,
      deploy_targets = EXCLUDED.deploy_targets,
      license = EXCLUDED.license,
      pricing = EXCLUDED.pricing,
      self_hostable = EXCLUDED.self_hostable,
      maturity = EXCLUDED.maturity,
      stars = EXCLUDED.stars,
      open_issues = EXCLUDED.open_issues,
      likes_count = EXCLUDED.likes_count,
      url = EXCLUDED.url,
      install_command = EXCLUDED.install_command,
      npm_package = EXCLUDED.npm_package,
      embedding = EXCLUDED.embedding,
      last_commit_date = EXCLUDED.last_commit_date;`;
  });

  chunks.push(statements.join('\n\n'));
}

for (let c = 0; c < chunks.length; c++) {
  const chunkFile = path.resolve(__dirname, `seed_chunk_${c}.sql`);
  fs.writeFileSync(chunkFile, chunks[c], 'utf8');
}

console.log(`Generated ${chunks.length} SQL chunk files.`);
