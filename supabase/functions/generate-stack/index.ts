import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
}

interface UnderstoodIntent {
  categories_needed: string[];
  constraints: string[];
  primary_language: string;
  deployment_target: string;
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
  stars?: number;
  likes_count: number;
  last_commit_date?: string;
  self_hostable?: boolean;
  score: number;
  reason: string;
  gotchas?: string[];
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
  }>;
}

interface CompatibilityWarning {
  severity: 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  tool_a: string;
  tool_b?: string;
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (ANTHROPIC_API_KEY) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }
  }

  if (OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }
  }

  throw new Error('No LLM API keys configured or call failed.');
}

// Heuristic fallback for Step 1
function heuristicUnderstand(query: string): UnderstoodIntent {
  const q = query.toLowerCase();
  const categories: string[] = [];
  const constraints: string[] = [];
  let primary_language = 'any';
  let deployment_target = 'any';

  if (q.includes('react') || q.includes('frontend') || q.includes('ui') || q.includes('dashboard') || q.includes('canvas')) {
    categories.push('Frontend Framework');
  }
  if (q.includes('state') || q.includes('realtime') || q.includes('collaborative') || q.includes('sync')) {
    categories.push('State & Realtime');
  }
  if (q.includes('backend') || q.includes('api') || q.includes('server') || q.includes('chat') || q.includes('auth')) {
    categories.push('Backend & API');
  }
  if (q.includes('db') || q.includes('database') || q.includes('sql') || q.includes('postgres') || q.includes('storage')) {
    categories.push('Database');
  }
  if (q.includes('host') || q.includes('deploy') || q.includes('cloud') || q.includes('docker') || q.includes('serverless')) {
    categories.push('Hosting & Infra');
  }

  if (categories.length === 0) {
    categories.push('Framework', 'Database', 'Hosting');
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
  } else if (q.includes('typescript') || q.includes('ts')) {
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
  };
}

// Step 3 Ranking formula
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, locked_tool_ids = [] } = await req.json() as { query: string; locked_tool_ids?: string[] };
    if (!query || !query.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all available tools from DB
    const { data: allToolsRaw, error: dbError } = await supabase
      .from('tools')
      .select('*')
      .limit(300);

    if (dbError) throw dbError;
    const allTools = (allToolsRaw || []) as ToolRecord[];

    // If database is empty, return empty list gracefully (Phase requirement: do not hallucinate)
    if (allTools.length === 0) {
      return new Response(JSON.stringify({
        query,
        understanding: {
          categories_needed: [],
          constraints: [],
          primary_language: 'any',
          deployment_target: 'any',
        },
        tools: [],
        warnings: [],
        setup_commands: [],
        source: 'db_fallback',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Understand
    let understanding: UnderstoodIntent;
    try {
      const understandSystemPrompt = `You are an architect analyzing a developer's software project.
Parse their requirements into strict JSON matching this schema:
{
  "categories_needed": ["category1", "category2", ...],
  "constraints": ["constraint1", ...],
  "primary_language": "typescript|python|go|rust|any",
  "deployment_target": "docker|serverless|edge|any"
}
Categories should be standard software stack roles like: "Frontend", "Database", "Authentication", "API / Backend", "Hosting / Deployment", "State Management".
Constraints might include "self-hostable", "permissive-license", "lightweight", etc. Respond ONLY with valid JSON.`;

      const llmUnderstandRes = await callLLM(understandSystemPrompt, `Project: ${query}`);
      const jsonMatch = llmUnderstandRes.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, llmUnderstandRes];
      understanding = JSON.parse(jsonMatch[1] || llmUnderstandRes);
      if (!Array.isArray(understanding.categories_needed) || understanding.categories_needed.length === 0) {
        understanding = heuristicUnderstand(query);
      }
    } catch {
      understanding = heuristicUnderstand(query);
    }

    // Map locked tools
    const lockedToolsMap = new Map<string, ToolRecord>();
    for (const lockedId of locked_tool_ids) {
      const found = allTools.find(t => t.id === lockedId);
      if (found) {
        lockedToolsMap.set(found.category || found.id, found);
      }
    }

    // Step 2 & 3: Retrieve and Rank per category
    const finalRecommendations: ToolRecommendation[] = [];
    const usedToolIds = new Set<string>();

    for (const category of understanding.categories_needed) {
      // Check if this category has a locked tool
      const locked = lockedToolsMap.get(category);
      if (locked) {
        usedToolIds.add(locked.id);
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
          stars: locked.stars,
          likes_count: locked.likes_count || 0,
          last_commit_date: locked.last_commit_date,
          self_hostable: locked.self_hostable,
          score: 100,
          reason: 'User locked pick for this architectural layer.',
          alternatives: [],
        });
        continue;
      }

      // Rank all available tools for this category
      const candidates = allTools
        .filter(t => !usedToolIds.has(t.id))
        .map(t => rankTool(t, category, understanding))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (candidates.length === 0) {
        // Return empty for this slot if no matches (do not hallucinate)
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
      }));

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
        stars: topPick.tool.stars,
        likes_count: topPick.tool.likes_count || 0,
        last_commit_date: topPick.tool.last_commit_date,
        self_hostable: topPick.tool.self_hostable,
        score: topPick.score,
        reason: topPick.reasons.join('. ') || `Recommended choice for ${category}.`,
        alternatives,
      });
    }

    // Step 4: Explain (via LLM with grounding in retrieved candidates)
    if (finalRecommendations.length > 0 && (ANTHROPIC_API_KEY || OPENAI_API_KEY)) {
      try {
        const explainSystemPrompt = `You are StackForge, an elite software architect.
The user requested a stack for: "${query}".
The database retrieved and selected these specific tools:
${finalRecommendations.map(r => `- [${r.category}] ${r.title} (ID: ${r.id}): ${r.description}`).join('\n')}

For each selected tool, write:
1. "reason": A crisp 1-2 sentence technical reason why this specific tool fits the project.
2. "gotchas": An array of 1-2 practical trade-offs or things to keep in mind.

Respond ONLY with valid JSON in this format:
{
  "explanations": [
    { "id": "uuid-here", "reason": "...", "gotchas": ["..."] }
  ],
  "setup_commands": ["npm create ...", "npm install ..."]
}`;

        const explainRes = await callLLM(explainSystemPrompt, 'Explain this stack selection.');
        const jsonMatch = explainRes.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, explainRes];
        const parsed = JSON.parse(jsonMatch[1] || explainRes);

        if (Array.isArray(parsed.explanations)) {
          for (const exp of parsed.explanations) {
            const target = finalRecommendations.find(r => r.id === exp.id);
            if (target && exp.reason) {
              target.reason = exp.reason;
              if (Array.isArray(exp.gotchas)) {
                target.gotchas = exp.gotchas;
              }
            }
          }
        }
      } catch {
        // Fallback: heuristic explanations already present
      }
    }

    // Step 5: Validate (Verify every recommended tool ID exists in the database)
    const validRecommendations = finalRecommendations.filter(rec => {
      const exists = allTools.some(t => t.id === rec.id);
      if (!exists) return false;
      // Filter alternatives to ensure they exist in DB as well
      rec.alternatives = rec.alternatives.filter(alt => allTools.some(t => t.id === alt.id));
      return true;
    });

    const chosenTools = allTools.filter(t => validRecommendations.some(r => r.id === t.id));
    const warnings = detectCompatibilityWarnings(chosenTools, understanding.constraints);

    const setupCommands = [
      `# Initialize project stack for ${understanding.primary_language || 'web'}`,
      'npm create vite@latest my-app',
      'cd my-app',
      validRecommendations.length > 0
        ? `npm install ${validRecommendations.map(r => (r.slug || r.title).toLowerCase().replace(/[^a-z0-9-]/g, '')).slice(0, 4).join(' ')}`
        : 'npm install',
      'npm run dev',
    ];

    return new Response(JSON.stringify({
      query,
      understanding,
      tools: validRecommendations,
      warnings,
      setup_commands: setupCommands,
      source: (ANTHROPIC_API_KEY || OPENAI_API_KEY) ? 'ai_edge' : 'db_fallback',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
