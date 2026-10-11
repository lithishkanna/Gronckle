import type { Tool } from '@/types/database';

export interface FilterState {
  search: string;
  category: string;
  subcategories: string[];
  languages: string[];
  frameworks: string[];
  license: string;
  pricing: string;
  selfHostable: boolean | null;
  type: string;
  maintenance: string; // 'all' | 'active' | 'slowing' | 'abandoned'
  minStars: number;
  tags: string[];
  myStack: string[];
  sort: 'best' | 'updated' | 'stars_desc' | 'stars_asc' | 'newest';
}

export const DEFAULT_FILTER_STATE: FilterState = {
  search: '',
  category: 'all',
  subcategories: [],
  languages: [],
  frameworks: [],
  license: 'all',
  pricing: 'all',
  selfHostable: null,
  type: 'all',
  maintenance: 'all',
  minStars: 0,
  tags: [],
  myStack: [],
  sort: 'best',
};

// ─── URL Serialization & Deserialization ────────────────────────────

export function parseFiltersFromUrl(searchParams: URLSearchParams): FilterState {
  const state: FilterState = { ...DEFAULT_FILTER_STATE };

  const q = searchParams.get('q');
  if (q) state.search = q;

  const cat = searchParams.get('cat');
  if (cat) state.category = cat;

  const sub = searchParams.get('sub');
  if (sub) state.subcategories = sub.split(',').filter(Boolean);

  const lang = searchParams.get('lang');
  if (lang) state.languages = lang.split(',').filter(Boolean);

  const fw = searchParams.get('fw');
  if (fw) state.frameworks = fw.split(',').filter(Boolean);

  const lic = searchParams.get('lic');
  if (lic) state.license = lic;

  const price = searchParams.get('pricing');
  if (price) state.pricing = price;

  const sh = searchParams.get('selfhost');
  if (sh === 'true') state.selfHostable = true;
  else if (sh === 'false') state.selfHostable = false;

  const t = searchParams.get('type');
  if (t) state.type = t;

  const m = searchParams.get('maint');
  if (m) state.maintenance = m;

  const stars = searchParams.get('stars');
  if (stars && !isNaN(Number(stars))) state.minStars = Number(stars);

  const tags = searchParams.get('tags');
  if (tags) state.tags = tags.split(',').filter(Boolean);

  const stack = searchParams.get('stack_items');
  if (stack) state.myStack = stack.split(',').filter(Boolean);

  const sort = searchParams.get('sort');
  if (sort && ['best', 'updated', 'stars_desc', 'stars_asc', 'newest'].includes(sort)) {
    state.sort = sort as FilterState['sort'];
  }

  return state;
}

export function serializeFiltersToUrl(state: FilterState): string {
  const params = new URLSearchParams();

  if (state.search.trim()) params.set('q', state.search.trim());
  if (state.category !== 'all') params.set('cat', state.category);
  if (state.subcategories.length > 0) params.set('sub', state.subcategories.join(','));
  if (state.languages.length > 0) params.set('lang', state.languages.join(','));
  if (state.frameworks.length > 0) params.set('fw', state.frameworks.join(','));
  if (state.license !== 'all') params.set('lic', state.license);
  if (state.pricing !== 'all') params.set('pricing', state.pricing);
  if (state.selfHostable !== null) params.set('selfhost', String(state.selfHostable));
  if (state.type !== 'all') params.set('type', state.type);
  if (state.maintenance !== 'all') params.set('maint', state.maintenance);
  if (state.minStars > 0) params.set('stars', String(state.minStars));
  if (state.tags.length > 0) params.set('tags', state.tags.join(','));
  if (state.myStack.length > 0) params.set('stack_items', state.myStack.join(','));
  if (state.sort !== 'best') params.set('sort', state.sort);

  return params.toString();
}

// ─── Maintenance Calculation ─────────────────────────────────────────

export function getMaintenanceStatus(lastCommitDate?: string | null): 'active' | 'slowing' | 'abandoned' {
  if (!lastCommitDate) return 'active';
  const last = new Date(lastCommitDate).getTime();
  const now = Date.now();
  const monthsAgo = (now - last) / (1000 * 60 * 60 * 24 * 30.5);

  if (monthsAgo <= 3) return 'active';
  if (monthsAgo <= 12) return 'slowing';
  return 'abandoned';
}

// ─── Filter & Sort Tools ────────────────────────────────────────────

export function applyFiltersAndSort(tools: Tool[], filters: FilterState): Tool[] {
  let list = [...tools];

  // 1. Category
  if (filters.category !== 'all') {
    list = list.filter(t => (t.category || 'general').toLowerCase() === filters.category.toLowerCase());
  }

  // 2. Subcategories
  if (filters.subcategories.length > 0) {
    list = list.filter(t => {
      const toolSubs = (t.subcategories || []).map(s => s.toLowerCase());
      return filters.subcategories.some(sub => toolSubs.includes(sub.toLowerCase()));
    });
  }

  // 3. Languages
  if (filters.languages.length > 0) {
    list = list.filter(t => {
      const toolLangs = (t.languages || []).map(l => l.toLowerCase());
      return filters.languages.some(lang => toolLangs.includes(lang.toLowerCase()));
    });
  }

  // 4. Frameworks ("Works with React", "Works with Next.js")
  if (filters.frameworks.length > 0) {
    list = list.filter(t => {
      const toolFws = (t.frameworks || []).map(f => f.toLowerCase());
      return filters.frameworks.some(fw => toolFws.includes(fw.toLowerCase()));
    });
  }

  // 5. License
  if (filters.license !== 'all') {
    if (filters.license === 'any-oss') {
      const nonOss = ['Proprietary', 'Commercial', 'None', 'Unknown'];
      list = list.filter(t => !nonOss.includes(t.license || ''));
    } else {
      list = list.filter(t => (t.license || '').toLowerCase().includes(filters.license.toLowerCase()));
    }
  }

  // 6. Pricing
  if (filters.pricing !== 'all') {
    list = list.filter(t => (t.pricing || 'open source').toLowerCase() === filters.pricing.toLowerCase());
  }

  // 7. Self-Hostable
  if (filters.selfHostable !== null) {
    list = list.filter(t => Boolean(t.self_hostable) === filters.selfHostable);
  }

  // 8. Type (repo, website, library, service)
  if (filters.type !== 'all') {
    list = list.filter(t => (t.type || 'repo').toLowerCase() === filters.type.toLowerCase());
  }

  // 9. Maintenance Status
  if (filters.maintenance !== 'all') {
    list = list.filter(t => getMaintenanceStatus(t.last_commit_date) === filters.maintenance);
  }

  // 10. Stars range
  if (filters.minStars > 0) {
    list = list.filter(t => (t.stars || 0) >= filters.minStars);
  }

  // 11. Tags (multi-select)
  if (filters.tags.length > 0) {
    list = list.filter(t => {
      const toolTags = (t.tags || []).map(tag => tag.toLowerCase());
      return filters.tags.every(selectedTag => toolTags.includes(selectedTag.toLowerCase()));
    });
  }

  // 12. "Works with my stack"
  if (filters.myStack.length > 0) {
    list = list.filter(t => {
      const combined = [
        ...(t.frameworks || []),
        ...(t.languages || []),
        ...(t.runtime || []),
        ...(t.tags || []),
      ].map(x => x.toLowerCase());

      return filters.myStack.some(item => combined.includes(item.toLowerCase()));
    });
  }

  // 13. Sorting
  switch (filters.sort) {
    case 'updated':
      list.sort((a, b) => {
        const dateA = new Date(a.last_commit_date || a.created_at || 0).getTime();
        const dateB = new Date(b.last_commit_date || b.created_at || 0).getTime();
        return dateB - dateA;
      });
      break;
    case 'stars_desc':
      list.sort((a, b) => (b.stars || 0) - (a.stars || 0));
      break;
    case 'stars_asc': // Underrated first!
      list.sort((a, b) => (a.stars || 0) - (b.stars || 0));
      break;
    case 'newest':
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case 'best':
    default:
      list.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      break;
  }

  return list;
}

// ─── Filter Option Counts ───────────────────────────────────────────

export interface FilterCounts {
  categories: Record<string, number>;
  languages: Record<string, number>;
  frameworks: Record<string, number>;
  licenses: Record<string, number>;
  pricing: Record<string, number>;
  types: Record<string, number>;
  maintenance: Record<string, number>;
  tags: Record<string, number>;
}

export function computeFilterCounts(tools: Tool[]): FilterCounts {
  const counts: FilterCounts = {
    categories: {},
    languages: {},
    frameworks: {},
    licenses: {},
    pricing: {},
    types: {},
    maintenance: { active: 0, slowing: 0, abandoned: 0 },
    tags: {},
  };

  for (const t of tools) {
    // Category
    const cat = (t.category || 'general').toLowerCase();
    counts.categories[cat] = (counts.categories[cat] || 0) + 1;

    // Type
    const type = (t.type || 'repo').toLowerCase();
    counts.types[type] = (counts.types[type] || 0) + 1;

    // Pricing
    const price = (t.pricing || 'open source').toLowerCase();
    counts.pricing[price] = (counts.pricing[price] || 0) + 1;

    // License
    const lic = t.license || 'Unknown';
    counts.licenses[lic] = (counts.licenses[lic] || 0) + 1;

    // Maintenance
    const maint = getMaintenanceStatus(t.last_commit_date);
    counts.maintenance[maint] = (counts.maintenance[maint] || 0) + 1;

    // Languages
    for (const l of t.languages || []) {
      counts.languages[l] = (counts.languages[l] || 0) + 1;
    }

    // Frameworks
    for (const f of t.frameworks || []) {
      counts.frameworks[f] = (counts.frameworks[f] || 0) + 1;
    }

    // Tags
    for (const tag of t.tags || []) {
      counts.tags[tag] = (counts.tags[tag] || 0) + 1;
    }
  }

  return counts;
}
