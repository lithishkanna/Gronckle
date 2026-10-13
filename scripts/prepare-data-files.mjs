/**
 * PREPARE DATA FILES
 * Generates:
 * 1. data/curated-tools.json (from REAL_TOOLS in seed-real-tools.mjs)
 * 2. data/new-30-repos.json (from STASH_REPOS in seed-stash-repos.mjs)
 * 3. data/free-for-dev.json (downloaded and parsed from ripienaar/free-for-dev)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { REAL_TOOLS } from './seed-real-tools.mjs';
import { STASH_REPOS } from './seed-stash-repos.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function main() {
  console.log('=== Preparing Data Files in data/ ===\n');

  // 1. curated-tools.json
  const curatedToolsPath = path.join(DATA_DIR, 'curated-tools.json');
  fs.writeFileSync(curatedToolsPath, JSON.stringify(REAL_TOOLS, null, 2));
  console.log(`[1/3] Created ${curatedToolsPath} (${REAL_TOOLS.length} curated tools)`);

  // 2. new-30-repos.json
  const reposPath = path.join(DATA_DIR, 'new-30-repos.json');
  fs.writeFileSync(reposPath, JSON.stringify(STASH_REPOS, null, 2));
  console.log(`[2/3] Created ${reposPath} (${STASH_REPOS.length} curated repositories)`);

  // 3. free-for-dev.json
  const freeForDevPath = path.join(DATA_DIR, 'free-for-dev.json');
  console.log('[3/3] Fetching ripienaar/free-for-dev README.md...');

  try {
    const res = await fetch('https://raw.githubusercontent.com/ripienaar/free-for-dev/master/README.md');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();

    const services = [];
    let currentCategory = 'cloud';
    const lines = md.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Heading 3 detects category
      if (trimmed.startsWith('### ')) {
        currentCategory = trimmed.replace('### ', '').trim().toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        continue;
      }

      // List item pattern: * [Name](url) - description
      // or - [Name](url) - description
      // or * [Name](url) — description
      const match = trimmed.match(/^[\*\-]\s+\[([^\]]+)\]\((https?:\/\/[^\)]+)\)\s*[-—:]\s*(.+)$/i);
      if (match) {
        const title = match[1].trim();
        const url = match[2].trim();
        const freeTierDesc = match[3].trim();

        // Generate clean slug
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        services.push({
          title,
          name: title,
          slug: `ffd-${slug}`,
          url,
          type: 'service',
          category: currentCategory || 'hosting',
          pricing: 'free tier',
          free_tier_note: freeTierDesc,
          description: freeTierDesc,
          self_hostable: false,
          license: 'Proprietary',
          tags: ['service', 'free-tier', currentCategory, 'free-for-dev'],
          likes_count: 5,
          stars: 0,
          source_credit: 'ripienaar/free-for-dev',
        });
      }
    }

    fs.writeFileSync(freeForDevPath, JSON.stringify(services, null, 2));
    console.log(`[3/3] Created ${freeForDevPath} (${services.length} free-for-dev services parsed)`);
  } catch (err) {
    console.error('Failed to fetch free-for-dev:', err.message);
  }

  console.log('\nData files preparation complete!');
}

main().catch(err => {
  console.error('Fatal data prep error:', err);
  process.exit(1);
});
