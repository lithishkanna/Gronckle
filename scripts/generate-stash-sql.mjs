import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STASH_REPOS } from './seed-stash-repos.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const lines = [];

for (const repo of STASH_REPOS) {
  lines.push(`
INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  ${sqlEscape(repo.owner)},
  ${sqlEscape(repo.repo)},
  ${sqlEscape(repo.description)},
  ${sqlEscape(repo.stars)},
  ${sqlEscape(repo.category)},
  ${sqlEscape(repo.tags || [])},
  ${sqlEscape(repo.why_underrated)},
  ${sqlEscape(repo.url)},
  ${sqlEscape(repo.license)},
  ${sqlEscape(repo.languages || [])}
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  `);
}

const outputPath = path.resolve(__dirname, 'seed-stash.sql');
fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
console.log(`Generated ${lines.length} repo inserts in ${outputPath}`);
