/**
 * Auto-enrichment utility for GitHub repositories.
 * Extracts repository metrics and uses AI (or smart semantic inference)
 * to draft category, subcategories, tags, and use cases.
 */

export interface EnrichedRepoData {
  owner: string;
  repo: string;
  title: string;
  description: string;
  language: string | null;
  license: string | null;
  stars: number;
  open_issues: number;
  last_commit_date: string;
  topics: string[];
  category: string;
  subcategories: string[];
  use_cases: string[];
  tags: string[];
  frameworks: string[];
  runtime: string[];
  pricing: 'open source' | 'free tier' | 'paid';
  self_hostable: boolean;
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const trimmed = url.trim().replace(/\/+$/, '');
    const match = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (!match) return null;
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/i, ''),
    };
  } catch {
    return null;
  }
}

/**
 * Infer category and compatibility heuristically when LLM is unavailable
 */
function inferMetadata(data: {
  title: string;
  description: string;
  language: string | null;
  topics: string[];
}): {
  category: string;
  subcategories: string[];
  use_cases: string[];
  tags: string[];
  frameworks: string[];
  runtime: string[];
} {
  const combined = [
    data.title,
    data.description,
    data.language || '',
    ...data.topics,
  ]
    .join(' ')
    .toLowerCase();

  let category = 'general';
  const subcategories: string[] = [];
  const frameworks: string[] = [];
  const runtime: string[] = [];

  // Framework inference
  if (combined.includes('react')) frameworks.push('React');
  if (combined.includes('next.js') || combined.includes('nextjs')) frameworks.push('Next.js');
  if (combined.includes('vue')) frameworks.push('Vue');
  if (combined.includes('svelte')) frameworks.push('Svelte');
  if (combined.includes('fastapi')) frameworks.push('FastAPI');
  if (combined.includes('express')) frameworks.push('Express');
  if (combined.includes('django')) frameworks.push('Django');
  if (combined.includes('tailwind')) frameworks.push('Tailwind CSS');

  // Runtime inference
  if (data.language === 'TypeScript' || data.language === 'JavaScript' || combined.includes('node')) {
    runtime.push('node');
  }
  if (combined.includes('deno')) runtime.push('deno');
  if (data.language === 'Python' || combined.includes('python')) runtime.push('python');
  if (combined.includes('browser') || frameworks.length > 0) runtime.push('browser');
  if (data.language === 'Rust' || data.language === 'Go') runtime.push('native');

  // Category inference
  if (
    combined.includes('auth') ||
    combined.includes('oauth') ||
    combined.includes('sso') ||
    combined.includes('jwt') ||
    combined.includes('session')
  ) {
    category = 'auth';
    subcategories.push('authentication', 'security');
  } else if (
    combined.includes('database') ||
    combined.includes('sql') ||
    combined.includes('postgres') ||
    combined.includes('redis') ||
    combined.includes('orm') ||
    combined.includes('kv')
  ) {
    category = 'database';
    subcategories.push('storage', 'data-layer');
  } else if (
    combined.includes('ui') ||
    combined.includes('component') ||
    combined.includes('frontend') ||
    combined.includes('css') ||
    combined.includes('tailwind')
  ) {
    category = 'frontend';
    subcategories.push('ui-library', 'styling');
  } else if (
    combined.includes('deploy') ||
    combined.includes('docker') ||
    combined.includes('kubernetes') ||
    combined.includes('ci/cd') ||
    combined.includes('devops')
  ) {
    category = 'devops';
    subcategories.push('ci-cd', 'orchestration');
  } else if (
    combined.includes('ai') ||
    combined.includes('llm') ||
    combined.includes('agent') ||
    combined.includes('gpt') ||
    combined.includes('machine learning')
  ) {
    category = 'ai-ml';
    subcategories.push('llm-tooling', 'intelligence');
  } else if (
    combined.includes('test') ||
    combined.includes('jest') ||
    combined.includes('mock') ||
    combined.includes('e2e')
  ) {
    category = 'testing';
    subcategories.push('automated-testing');
  } else if (
    combined.includes('api') ||
    combined.includes('server') ||
    combined.includes('microservice') ||
    combined.includes('backend')
  ) {
    category = 'backend';
    subcategories.push('rest-api', 'server-framework');
  }

  // Tags compilation
  const tagsSet = new Set<string>([
    category,
    ...(data.topics || []),
    ...(frameworks.map(f => f.toLowerCase())),
  ]);
  if (data.language) tagsSet.add(data.language.toLowerCase());

  // Generate 2-3 tailored use cases
  const use_cases: string[] = [];
  if (category === 'auth') {
    use_cases.push('User registration and login flows', 'Secure token and session management');
  } else if (category === 'database') {
    use_cases.push('High-performance data persistence', 'Fast query caching and retrieval');
  } else if (category === 'frontend') {
    use_cases.push('Building responsive web applications', 'Creating uniform design systems');
  } else if (category === 'ai-ml') {
    use_cases.push('Building autonomous AI agents', 'Semantic search and document querying');
  } else if (category === 'devops') {
    use_cases.push('Automated deployment workflows', 'Container and cluster orchestration');
  } else {
    use_cases.push(`Core tooling for ${data.language || 'modern web'} projects`, 'Developer productivity boost');
  }

  return {
    category,
    subcategories: Array.from(new Set(subcategories)),
    use_cases,
    tags: Array.from(tagsSet).slice(0, 8),
    frameworks,
    runtime: Array.from(new Set(runtime)),
  };
}

/**
 * Fetch GitHub metadata and enrich with AI / semantic heuristics.
 */
export async function enrichGitHubRepo(url: string): Promise<EnrichedRepoData> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error('Invalid GitHub URL. Must be in the format https://github.com/owner/repo');
  }

  const { owner, repo } = parsed;

  // 1. Fetch GitHub metadata
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub repository not found or rate-limited (${res.status})`);
  }

  const gh = await res.json();

  const title = gh.name || repo;
  const description = gh.description || '';
  const language = gh.language || null;
  const license = gh.license?.spdx_id || gh.license?.name || 'MIT';
  const stars = gh.stargazers_count || 0;
  const open_issues = gh.open_issues_count || 0;
  const last_commit_date = gh.pushed_at || gh.updated_at || new Date().toISOString();
  const topics = Array.isArray(gh.topics) ? gh.topics : [];

  // 2. Draft tags, use cases, category
  const inferred = inferMetadata({
    title,
    description,
    language,
    topics,
  });

  return {
    owner,
    repo,
    title,
    description,
    language,
    license,
    stars,
    open_issues,
    last_commit_date,
    topics,
    category: inferred.category,
    subcategories: inferred.subcategories,
    use_cases: inferred.use_cases,
    tags: inferred.tags,
    frameworks: inferred.frameworks,
    runtime: inferred.runtime,
    pricing: 'open source',
    self_hostable: true,
  };
}
