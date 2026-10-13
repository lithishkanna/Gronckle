import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { callLLM } from "../_shared/llm.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── 5-minute In-Memory LRU Query Cache ────────────────────────────────
const QUERY_CACHE = new Map<string, { result: Record<string, unknown>; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// ─── Rate Limiter (Upstash Redis + In-Memory Token Bucket Fallback) ───
const UPSTASH_REDIS_REST_URL = Deno.env.get('UPSTASH_REDIS_REST_URL') || '';
const UPSTASH_REDIS_REST_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') || '';
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;
const CLIENT_RATE_MAP = new Map<string, { count: number; windowStart: number }>();

async function checkRateLimit(clientKey: string): Promise<boolean> {
  if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
    try {
      const url = `${UPSTASH_REDIS_REST_URL}/pipeline`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', `ratelimit:${clientKey}`],
          ['EXPIRE', `ratelimit:${clientKey}`, 60],
        ]),
      });
      if (res.ok) {
        const data = await res.json();
        const currentCount = data[0]?.result;
        return typeof currentCount === 'number' ? currentCount <= RATE_LIMIT_MAX : true;
      }
    } catch {
      // Fall through to in-memory limiter
    }
  }

  const now = Date.now();
  const record = CLIENT_RATE_MAP.get(clientKey);
  if (!record || (now - record.windowStart) > RATE_LIMIT_WINDOW_MS) {
    CLIENT_RATE_MAP.set(clientKey, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

interface ToolRecord {
  id: string;
  title: string;
  name?: string;
  slug?: string;
  type?: string;
  category?: string;
  subcategories?: string[];
  description?: string;
  use_cases?: string[];
  tags: string[];
  languages?: string[];
  frameworks?: string[];
  runtime?: string[];
  deploy_targets?: string[];
  license?: string;
  pricing?: string;
  self_hostable?: boolean;
  maturity?: string;
  last_commit_date?: string;
  stars?: number;
  open_issues?: number;
  likes_count: number;
  url: string;
  install_command?: string;
  npm_package?: string;
  free_tier_note?: string;
}

interface UnderstoodIntent {
  categories_needed: string[];
  constraints: string[];
  primary_language: string;
  deployment_target: string;
  scale?: 'hobby' | 'startup' | 'large';
}

interface RankedCandidate {
  tool: ToolRecord;
  score: number;
  reasons: string[];
}

interface ToolRecommendation {
  id: string;
  title: string;
  name?: string;
  slug?: string;
  category: string;
  description: string;
  url: string;
  tags: string[];
  languages?: string[];
  frameworks?: string[];
  license?: string;
  pricing?: string;
  stars?: number;
  likes_count: number;
  last_commit_date?: string;
  self_hostable?: boolean;
  score: number;
  reason: string;
  gotchas?: string[];
  install_command?: string;
  npm_package?: string;
  underrated_score?: number;
  underrated_reason?: string;
  estimated_cost?: string;
  free_tier_note?: string;
  alternatives: Array<{
    id: string;
    title: string;
    name?: string;
    slug?: string;
    description: string;
    license?: string;
    stars?: number;
    score: number;
    url: string;
    install_command?: string;
    npm_package?: string;
  }>;
}

interface CompatibilityWarning {
  severity: 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  tool_a: string;
  tool_b?: string;
}

// ─── Underrated Score Formula (Phase C) ────────────────────────────────
function calculateUnderratedScore(tool: ToolRecord): { score: number; reason: string } {
  let q = 0;

  if (tool.last_commit_date) {
    const daysSinceCommit = (Date.now() - new Date(tool.last_commit_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCommit <= 30) q += 30;
    else if (daysSinceCommit <= 90) q += 20;
    else if (daysSinceCommit <= 180) q += 10;
    else if (daysSinceCommit > 365) q -= 20;
  }

  if (tool.self_hostable) q += 15;

  const lic = (tool.license || '').toLowerCase();
  if (['mit', 'apache', 'bsd', 'isc'].some(l => lic.includes(l))) {
    q += 10;
  }

  if (tool.install_command || tool.npm_package) q += 15;
  if (tool.languages?.some((l: string) => /typescript/i.test(l))) q += 15;

  const stars = tool.stars || 100;
  const starDamping = Math.max(1.0, Math.log10(Math.max(stars, 100)) - 1.5);
  const likes = tool.likes_count || 0;
  const likeBoost = 1 + 0.1 * Math.log(1 + likes);

  const rawScore = Math.round((q / starDamping) * likeBoost);
  const score = Math.min(99, Math.max(1, rawScore));

  let reason = '';
  if (score >= 80) {
    reason = 'Hidden gem: high maintainer velocity and lightweight architecture with low overhead.';
  } else if (score >= 60) {
    reason = 'Well-balanced tool: stable track record and proven developer ergonomics.';
  } else {
    reason = 'Established standard: high market adoption with extensive community resources.';
  }

  return { score, reason };
}

// ─── Cost Estimator (Phase C) ──────────────────────────────────────────
function estimateToolCost(tool: ToolRecord, scale: 'hobby' | 'startup' | 'large' = 'hobby'): { costText: string; isFree: boolean; note?: string } {
  const isOss = tool.pricing === 'open source' || (tool.license || '').toLowerCase().includes('mit') || tool.self_hostable;

  if (isOss) {
    return { costText: '$0/mo (Open Source)', isFree: true, note: 'Self-hostable without license fee' };
  }

  if (tool.free_tier_note) {
    if (scale === 'hobby') {
      return { costText: '$0/mo (Free Tier)', isFree: true, note: tool.free_tier_note };
    } else if (scale === 'startup') {
      return { costText: '~$15 - $25/mo (Estimated)', isFree: false, note: `Beyond free tier: ${tool.free_tier_note}` };
    } else {
      return { costText: '~$50 - $150/mo (Estimated)', isFree: false, note: `Team scale: ${tool.free_tier_note}` };
    }
  }

  if (tool.pricing === 'free tier') {
    return {
      costText: scale === 'hobby' ? '$0/mo (Free Tier)' : '~$20/mo (Estimated)',
      isFree: scale === 'hobby',
      note: 'Developer tier available',
    };
  }

  return { costText: scale === 'hobby' ? '$0/mo' : 'Usage-based pricing', isFree: scale === 'hobby' };
}

// ─── Architecture Diagram Generator (Phase C & D) ──────────────────────
function generateArchitectureDiagram(tools: ToolRecommendation[]): string {
  const lines = [
    'graph TD',
    '  classDef pick fill:#111418,stroke:#FF6B2B,stroke-width:2px,color:#fff;',
  ];

  for (const t of tools) {
    const cleanId = (t.slug || t.title).replace(/[^a-zA-Z0-9]/g, '_');
    const label = `"${t.title}\\n(${t.category})"`;
    lines.push(`  ${cleanId}[${label}]:::pick`);
  }

  for (let i = 0; i < tools.length - 1; i++) {
    const idA = (tools[i].slug || tools[i].title).replace(/[^a-zA-Z0-9]/g, '_');
    const idB = (tools[i + 1].slug || tools[i + 1].title).replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`  ${idA} --> ${idB}`);
  }

  return lines.join('\n');
}

// ─── Step 1 Understand Heuristic Fallback ───────────────────────────────
function heuristicUnderstand(query: string, stackChips: string[] = []): UnderstoodIntent {
  const q = `${query} ${stackChips.join(' ')}`.toLowerCase();
  const categories: string[] = [];
  const constraints: string[] = [];
  let primary_language = 'any';
  let deployment_target = 'any';

  if (q.includes('react') || q.includes('vue') || q.includes('frontend') || q.includes('ui') || q.includes('dashboard') || q.includes('canvas') || q.includes('web app')) {
    categories.push('Frontend Framework');
  }
  if (q.includes('state') || q.includes('realtime') || q.includes('collaborative') || q.includes('sync') || q.includes('websocket')) {
    categories.push('State & Realtime');
  }
  if (q.includes('backend') || q.includes('api') || q.includes('server') || q.includes('chat') || q.includes('auth') || q.includes('login')) {
    categories.push('Backend & API');
  }
  if (q.includes('db') || q.includes('database') || q.includes('sql') || q.includes('postgres') || q.includes('storage') || q.includes('mongo') || q.includes('redis')) {
    categories.push('Database');
  }
  if (q.includes('host') || q.includes('deploy') || q.includes('cloud') || q.includes('docker') || q.includes('serverless') || q.includes('infra')) {
    categories.push('Hosting & Infra');
  }

  if (categories.length === 0) {
    categories.push('Frontend', 'Database', 'Backend', 'Hosting');
  }

  if (q.includes('self-host') || q.includes('on-prem') || q.includes('local')) {
    constraints.push('self-hostable');
  }
  if (q.includes('permissive') || q.includes('mit') || q.includes('apache') || q.includes('commercial')) {
    constraints.push('permissive-license');
  }
  if (q.includes('python')) {
    primary_language = 'python';
    constraints.push('python');
  } else if (q.includes('typescript') || q.includes('ts') || q.includes('javascript') || q.includes('react')) {
    primary_language = 'typescript';
    constraints.push('typescript');
  } else if (q.includes('rust')) {
    primary_language = 'rust';
    constraints.push('rust');
  } else if (q.includes('go') || q.includes('golang')) {
    primary_language = 'go';
    constraints.push('go');
  }

  if (q.includes('docker')) deployment_target = 'docker';
  else if (q.includes('serverless')) deployment_target = 'serverless';
  else if (q.includes('edge')) deployment_target = 'edge';

  return {
    categories_needed: categories,
    constraints,
    primary_language,
    deployment_target,
    scale: 'hobby',
  };
}

// ─── Step 3 Ranking Formula ───────────────────────────────────────────
function rankTool(tool: ToolRecord, targetCategory: string, intent: UnderstoodIntent): RankedCandidate {
  let score = 0;
  const reasons: string[] = [];

  // 1. Category match (+30)
  const toolCat = (tool.category || '').toLowerCase();
  const targetCat = targetCategory.toLowerCase();
  if (toolCat && (toolCat === targetCat || toolCat.includes(targetCat) || targetCat.includes(toolCat))) {
    score += 30;
    reasons.push('Direct category match (+30)');
  } else if (tool.tags?.some(t => targetCat.includes(t.toLowerCase()))) {
    score += 15;
    reasons.push('Category tag overlap (+15)');
  }

  // 2. Tags / use-cases overlap (+20)
  const allToolTerms = [...(tool.tags || []), ...(tool.use_cases || [])].map(t => t.toLowerCase());
  const matchedTerms = allToolTerms.filter(t => intent.constraints.some(c => c.toLowerCase().includes(t)) || targetCat.includes(t));
  if (matchedTerms.length > 0) {
    score += Math.min(20, matchedTerms.length * 10);
    reasons.push(`Use case & tag relevance (+${Math.min(20, matchedTerms.length * 10)})`);
  }

  // 3. Language / Framework constraint match (+20)
  if (intent.primary_language !== 'any') {
    const langMatch = tool.languages?.some(l => l.toLowerCase() === intent.primary_language.toLowerCase());
    if (langMatch) {
      score += 20;
      reasons.push(`Matches primary language ${intent.primary_language} (+20)`);
    }
  }

  // 4. Active maintenance (committed < 90d) (+10)
  if (tool.last_commit_date) {
    const daysSinceCommit = (Date.now() - new Date(tool.last_commit_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCommit <= 90) {
      score += 10;
      reasons.push('Actively maintained repository (+10)');
    }
  }

  // 5. Popularity (log10 of stars) (+10)
  const stars = tool.stars || 0;
  if (stars > 0) {
    const starScore = Math.min(10, Math.round(Math.log10(stars + 1) * 2));
    score += starScore;
    reasons.push(`Community adoption (+${starScore})`);
  }

  // 6. License compatibility (+10)
  const lic = (tool.license || '').toLowerCase();
  const requiresPermissive = intent.constraints.includes('permissive-license');
  if (requiresPermissive) {
    if (lic.includes('mit') || lic.includes('apache') || lic.includes('bsd') || lic.includes('isc')) {
      score += 10;
      reasons.push('Permissive open source license (+10)');
    } else if (lic.includes('gpl') || lic.includes('agpl')) {
      score -= 20;
      reasons.push('Copyleft license penalty (-20)');
    }
  } else if (lic) {
    score += 5;
    reasons.push('Identified open source license (+5)');
  }

  // Self-hostable bonus if required
  if (intent.constraints.includes('self-hostable') && tool.self_hostable) {
    score += 15;
    reasons.push('Self-hostable capability match (+15)');
  }

  return { tool, score, reasons };
}

function detectCompatibilityWarnings(tools: ToolRecord[], constraints: string[]): CompatibilityWarning[] {
  const warnings: CompatibilityWarning[] = [];
  const licenses = tools.map(t => ({ name: t.title, lic: (t.license || '').toLowerCase() }));

  // Check GPL in proprietary/commercial context
  const hasGPL = licenses.filter(l => l.lic.includes('gpl') || l.lic.includes('agpl'));
  if (hasGPL.length > 0 && constraints.some(c => c.includes('permissive') || c.includes('commercial') || c.includes('proprietary'))) {
    warnings.push({
      severity: 'warning',
      title: 'Copyleft License Restriction',
      description: `${hasGPL.map(g => g.name).join(', ')} uses a GPL/AGPL copyleft license, which may require your application code to be open-sourced if distributed.`,
      tool_a: hasGPL[0].name,
    });
  }

  // Check multiple frontend frameworks
  const frontends = tools.filter(t => (t.category || '').toLowerCase().includes('frontend') || (t.category || '').toLowerCase().includes('framework'));
  if (frontends.length > 1) {
    warnings.push({
      severity: 'info',
      title: 'Multiple Frontend Libraries',
      description: `Both ${frontends[0].title} and ${frontends[1].title} are primary presentation frameworks. Ensure they are partitioned into micro-frontends or complementary layers.`,
      tool_a: frontends[0].title,
      tool_b: frontends[1].title,
    });
  }

  return warnings;
}

// ─── Presets Re-Ranking (Phase C) ──────────────────────────────────────
function applyPreset(
  recommendations: ToolRecommendation[],
  preset: 'balanced' | 'cheapest' | 'fastest' | 'open_source' | 'mature'
): ToolRecommendation[] {
  if (preset === 'balanced') return recommendations;

  return recommendations.map(rec => {
    const all = [
      {
        id: rec.id,
        title: rec.title,
        name: rec.name,
        slug: rec.slug,
        category: rec.category,
        description: rec.description,
        license: rec.license,
        pricing: rec.pricing,
        self_hostable: rec.self_hostable,
        free_tier_note: rec.free_tier_note,
        stars: rec.stars,
        score: rec.score,
        url: rec.url,
        install_command: rec.install_command,
        npm_package: rec.npm_package,
      },
      ...rec.alternatives.map(a => ({
        ...a,
        category: rec.category,
        pricing: 'open source',
        self_hostable: true,
        free_tier_note: undefined,
      })),
    ];

    const scored = all.map(c => {
      let pScore = c.score || 50;
      if (preset === 'cheapest') {
        if (c.pricing === 'open source' || c.self_hostable) pScore += 40;
        if (c.free_tier_note) pScore += 25;
      } else if (preset === 'fastest') {
        if (c.npm_package) pScore += 30;
        if (c.install_command) pScore += 20;
      } else if (preset === 'open_source') {
        const lic = (c.license || '').toLowerCase();
        if (['mit', 'apache', 'bsd', 'isc', 'gpl'].some(l => lic.includes(l))) pScore += 50;
        else pScore -= 50;
      } else if (preset === 'mature') {
        pScore += Math.min(40, Math.log10(Math.max(c.stars || 10, 10)) * 10);
      }
      return { candidate: c, pScore };
    });

    scored.sort((a, b) => b.pScore - a.pScore);
    const top = scored[0].candidate;

    const remainingAlts = scored.slice(1).map(s => ({
      id: s.candidate.id,
      title: s.candidate.title,
      name: s.candidate.name,
      slug: s.candidate.slug,
      description: s.candidate.description,
      license: s.candidate.license,
      stars: s.candidate.stars,
      score: s.pScore,
      url: s.candidate.url,
      install_command: s.candidate.install_command,
      npm_package: s.candidate.npm_package,
    }));

    return {
      ...rec,
      id: top.id,
      title: top.title,
      name: top.name,
      slug: top.slug,
      description: top.description,
      url: top.url,
      license: top.license,
      stars: top.stars,
      score: scored[0].pScore,
      install_command: top.install_command,
      npm_package: top.npm_package,
      alternatives: remainingAlts,
    };
  });
}

// ─── Edge Function Handler ─────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const clientKey = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'anon';
    const isAllowed = await checkRateLimit(clientKey);
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Too Many Requests. Rate limit of 30 req/min exceeded.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const body = await req.json() as {
      query: string;
      stack?: string[];
      constraints?: string[];
      scale?: 'hobby' | 'startup' | 'large';
      preset?: 'balanced' | 'cheapest' | 'fastest' | 'open_source' | 'mature';
      locked_tool_ids?: string[];
      byok?: string;
    };

    const {
      query,
      stack = [],
      constraints = [],
      scale = 'hobby',
      preset = 'balanced',
      locked_tool_ids = [],
      byok,
    } = body;

    if (!query || !query.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check query cache (5 min TTL)
    const cacheKey = `${query.trim().toLowerCase()}::${stack.sort().join(',')}::${scale}::${preset}::${(locked_tool_ids || []).slice().sort().join(',')}`;
    const cached = QUERY_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.result), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'Cache-Control': 'private, no-cache, no-transform',
        },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Understand
    let understanding: UnderstoodIntent;
    let usedAi = false;

    try {
      const understandSystemPrompt = `You are a software architect analyzing a project.
Extract required architectural layers, constraints, primary language, and deployment target.
Respond ONLY with JSON matching this schema:
{
  "categories_needed": ["layer1", "layer2", ...],
  "constraints": ["constraint1", ...],
  "primary_language": "typescript|python|go|rust|any",
  "deployment_target": "docker|serverless|edge|any",
  "scale": "hobby|startup|large"
}
Categories should be standard software layers like: "Frontend", "Database", "Authentication", "API / Backend", "Hosting / Deployment", "State Management", "Storage", "Monitoring".`;

      const userText = `Project Description: ${query}\nTech Stack: ${stack.join(', ')}\nRequested Scale: ${scale}\nConstraints: ${constraints.join(', ')}`;

      const llmUnderstandRes = await callLLM({
        system: understandSystemPrompt,
        user: userText,
        apiKey: byok,
        ipHash: clientKey,
        functionName: 'generate-stack-understand',
        schema: {
          type: 'object',
          properties: {
            categories_needed: { type: 'array', items: { type: 'string' } },
            constraints: { type: 'array', items: { type: 'string' } },
            primary_language: { type: 'string' },
            deployment_target: { type: 'string' },
            scale: { type: 'string', enum: ['hobby', 'startup', 'large'] },
          },
          required: ['categories_needed'],
        },
      });

      understanding = llmUnderstandRes.data as UnderstoodIntent;
      if (!Array.isArray(understanding.categories_needed) || understanding.categories_needed.length === 0) {
        understanding = heuristicUnderstand(query, stack);
      } else {
        usedAi = true;
      }
    } catch {
      understanding = heuristicUnderstand(query, stack);
    }

    // Merge in user constraints from parameters
    if (constraints.length > 0) {
      understanding.constraints = Array.from(new Set([...understanding.constraints, ...constraints]));
    }
    understanding.scale = scale;

    // Step 2: Retrieve candidate tools per layer via SQL search
    const candidateToolsMap = new Map<string, ToolRecord>();
    const missingLayers: string[] = [];

    for (const category of understanding.categories_needed) {
      const searchTerms = `${category} ${understanding.constraints.join(' ')} ${query}`.trim();
      const { data: catResults } = await supabase.rpc('hybrid_search_tools', {
        search_query: searchTerms,
        match_limit: 8,
        filter_category: category,
      });

      if (catResults && catResults.length > 0) {
        for (const t of catResults) {
          candidateToolsMap.set(t.id, t as ToolRecord);
        }
      } else {
        // Fallback without category restriction for flexibility
        const { data: looseResults } = await supabase.rpc('hybrid_search_tools', {
          search_query: searchTerms,
          match_limit: 8,
        });
        if (looseResults && looseResults.length > 0) {
          for (const t of looseResults) {
            candidateToolsMap.set(t.id, t as ToolRecord);
          }
        } else {
          missingLayers.push(category);
        }
      }
    }

    // Include locked tools if requested
    if (locked_tool_ids.length > 0) {
      const { data: lockedData } = await supabase
        .from('tools')
        .select('*')
        .in('id', locked_tool_ids);
      if (lockedData) {
        for (const t of lockedData) candidateToolsMap.set(t.id, t as ToolRecord);
      }
    }

    // Baseline fallback to top tools if pool is scarce
    if (candidateToolsMap.size < 6) {
      const { data: topTools } = await supabase
        .from('tools')
        .select('*')
        .order('likes_count', { ascending: false })
        .limit(20);
      if (topTools) {
        for (const t of topTools) candidateToolsMap.set(t.id, t as ToolRecord);
      }
    }

    const allTools = Array.from(candidateToolsMap.values());

    // If database is empty, return empty list gracefully (Phase requirement: zero hallucinations)
    if (allTools.length === 0) {
      return new Response(JSON.stringify({
        query,
        understanding,
        tools: [],
        warnings: [],
        setup_commands: [],
        source: 'db_fallback',
        scale,
        preset,
        missing_layers: missingLayers,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map locked tools
    const lockedToolsMap = new Map<string, ToolRecord>();
    for (const lockedId of locked_tool_ids) {
      const found = allTools.find(t => t.id === lockedId);
      if (found) {
        lockedToolsMap.set(found.category || found.id, found);
      }
    }

    // Step 3: Deterministic Ranking per layer
    let finalRecommendations: ToolRecommendation[] = [];
    const usedToolIds = new Set<string>();

    for (const category of understanding.categories_needed) {
      const locked = lockedToolsMap.get(category);
      if (locked) {
        usedToolIds.add(locked.id);
        const { score: undScore, reason: undReason } = calculateUnderratedScore(locked);
        const { costText } = estimateToolCost(locked, scale);

        finalRecommendations.push({
          id: locked.id,
          title: locked.title,
          name: locked.name,
          slug: locked.slug,
          category,
          description: locked.description || '',
          url: locked.url,
          tags: locked.tags || [],
          languages: locked.languages,
          frameworks: locked.frameworks,
          license: locked.license,
          pricing: locked.pricing,
          stars: locked.stars,
          likes_count: locked.likes_count || 0,
          last_commit_date: locked.last_commit_date,
          self_hostable: locked.self_hostable,
          score: 100,
          reason: 'User locked pick for this architectural layer.',
          install_command: locked.install_command,
          npm_package: locked.npm_package,
          underrated_score: undScore,
          underrated_reason: undReason,
          estimated_cost: costText,
          free_tier_note: locked.free_tier_note,
          alternatives: [],
        });
        continue;
      }

      const candidates = allTools
        .filter(t => !usedToolIds.has(t.id))
        .map(t => rankTool(t, category, understanding))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (candidates.length === 0) {
        if (!missingLayers.includes(category)) missingLayers.push(category);
        continue;
      }

      const topPick = candidates[0];
      usedToolIds.add(topPick.tool.id);

      const alternatives = candidates.slice(1, 4).map(c => ({
        id: c.tool.id,
        title: c.tool.title,
        name: c.tool.name,
        slug: c.tool.slug,
        description: c.tool.description || '',
        license: c.tool.license,
        stars: c.tool.stars,
        score: c.score,
        url: c.tool.url,
        install_command: c.tool.install_command,
        npm_package: c.tool.npm_package,
      }));

      const { score: undScore, reason: undReason } = calculateUnderratedScore(topPick.tool);
      const { costText } = estimateToolCost(topPick.tool, scale);

      finalRecommendations.push({
        id: topPick.tool.id,
        title: topPick.tool.title,
        name: topPick.tool.name,
        slug: topPick.tool.slug,
        category,
        description: topPick.tool.description || '',
        url: topPick.tool.url,
        tags: topPick.tool.tags || [],
        languages: topPick.tool.languages,
        frameworks: topPick.tool.frameworks,
        license: topPick.tool.license,
        pricing: topPick.tool.pricing,
        stars: topPick.tool.stars,
        likes_count: topPick.tool.likes_count || 0,
        last_commit_date: topPick.tool.last_commit_date,
        self_hostable: topPick.tool.self_hostable,
        score: topPick.score,
        reason: topPick.reasons.join('. ') || `Recommended choice for ${category}.`,
        install_command: topPick.tool.install_command,
        npm_package: topPick.tool.npm_package,
        underrated_score: undScore,
        underrated_reason: undReason,
        estimated_cost: costText,
        free_tier_note: topPick.tool.free_tier_note,
        alternatives,
      });
    }

    // Apply Presets Re-Ranking if specified
    if (preset !== 'balanced') {
      finalRecommendations = applyPreset(finalRecommendations, preset);
    }

    // Step 4: Explain (via LLM with grounding in retrieved candidates)
    if (finalRecommendations.length > 0) {
      try {
        const explainSystemPrompt = `You are Gronckle, an elite software architect recommending a grounded developer stack.
The user requested: "${query}".
The database selected these specific tools:
${finalRecommendations.map(r => `- [${r.category}] ${r.title} (ID: ${r.id}): ${r.description}`).join('\n')}

For each tool, provide:
1. "reason": A 1-2 sentence reason quoting the user's specific project needs and why this tool fits.
2. "gotchas": 1-2 practical production notes or limitations to be aware of.`;

        const explainRes = await callLLM({
          system: explainSystemPrompt,
          user: 'Provide reasons and gotchas for these specific tools.',
          apiKey: byok,
          ipHash: clientKey,
          functionName: 'generate-stack-explain',
          schema: {
            type: 'object',
            properties: {
              explanations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    reason: { type: 'string' },
                    gotchas: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['id', 'reason'],
                },
              },
            },
            required: ['explanations'],
          },
        });

        const parsed = explainRes.data as { explanations: Array<{ id: string; reason: string; gotchas?: string[] }> };
        if (Array.isArray(parsed?.explanations)) {
          for (const exp of parsed.explanations) {
            const target = finalRecommendations.find(r => r.id === exp.id);
            if (target && exp.reason) {
              target.reason = exp.reason;
              if (Array.isArray(exp.gotchas)) {
                target.gotchas = exp.gotchas;
              }
            }
          }
          usedAi = true;
        }
      } catch {
        // Fallback: heuristic explanations preserved
      }
    }

    // Step 5: Validate (Verify every recommended tool ID exists in the database)
    const validRecommendations = finalRecommendations.filter(rec => {
      const exists = allTools.some(t => t.id === rec.id);
      if (!exists) return false;
      rec.alternatives = rec.alternatives.filter(alt => allTools.some(t => t.id === alt.id));
      return true;
    });

    const chosenTools = allTools.filter(t => validRecommendations.some(r => r.id === t.id));
    const warnings = detectCompatibilityWarnings(chosenTools, understanding.constraints);

    // Build smart setup commands
    const setupCommands: string[] = [
      `# Initialize project stack for ${understanding.primary_language || 'modern stack'}`
    ];

    const npmPackages: string[] = [];
    const customCommands: string[] = [];

    for (const rec of validRecommendations) {
      if (rec.install_command) {
        customCommands.push(rec.install_command);
      } else if (rec.npm_package) {
        npmPackages.push(rec.npm_package);
      } else {
        const isNpm = (rec.category?.toLowerCase() || '').includes('frontend') ||
                      (rec.category?.toLowerCase() || '').includes('react') ||
                      (rec.languages || []).some(l => /typescript|javascript/i.test(l));
        if (isNpm && !rec.url.includes('docker') && rec.license !== 'Proprietary') {
          npmPackages.push((rec.slug || rec.title).toLowerCase().replace(/[^a-z0-9-]/g, ''));
        }
      }
    }

    if (understanding.primary_language === 'python') {
      setupCommands.push('python -m venv .venv', 'source .venv/bin/activate');
    } else {
      setupCommands.push('npm create vite@latest my-app', 'cd my-app');
    }

    if (npmPackages.length > 0) {
      setupCommands.push(`npm install ${npmPackages.slice(0, 6).join(' ')}`);
    }

    for (const cmd of customCommands) {
      setupCommands.push(cmd);
    }

    setupCommands.push('npm run dev');

    // Calculate total estimated monthly cost
    const totalCostNumber = scale === 'hobby' ? 0 : scale === 'startup' ? validRecommendations.length * 15 : validRecommendations.length * 60;
    const estimatedMonthlyCost = scale === 'hobby' ? '$0/mo (Free Tier / OSS)' : `~$${totalCostNumber}/mo (Estimated for ${scale})`;

    const resultPayload = {
      query,
      understanding,
      tools: validRecommendations,
      warnings,
      setup_commands: setupCommands,
      source: usedAi ? 'ai_edge' : 'db_fallback',
      scale,
      preset,
      estimated_monthly_cost: estimatedMonthlyCost,
      missing_layers: missingLayers.length > 0 ? missingLayers : undefined,
      mermaid_diagram: generateArchitectureDiagram(validRecommendations),
    };

    QUERY_CACHE.set(cacheKey, { result: resultPayload, timestamp: Date.now() });

    return new Response(JSON.stringify(resultPayload), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': 'private, no-cache, no-transform',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
