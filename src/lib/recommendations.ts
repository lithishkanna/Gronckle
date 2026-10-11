import { supabase } from '@/lib/supabase';
import type {
  Tool,
  StackToolRecommendation,
  StackAlternativeTool,
  CompatibilityWarning,
  StackRecommendationResult,
  PipelineStep,
  RecommendationFeedback,
} from '@/types/database';

export interface GenerateStackOptions {
  lockedToolIds?: string[];
  onStepChange?: (step: PipelineStep) => void;
  timeoutMs?: number;
}

interface UnderstoodIntent {
  categories_needed: string[];
  constraints: string[];
  primary_language: string;
  deployment_target: string;
}

const EDGE_FUNCTION_BASE = import.meta.env.VITE_SUPABASE_URL || '';

// ─── Step 1: Understand (Deterministic Heuristics Fallback) ────────────

export function understandIntent(query: string): UnderstoodIntent {
  const q = query.toLowerCase();
  const categories: string[] = [];
  const constraints: string[] = [];
  let primary_language = 'any';
  let deployment_target = 'any';

  // Category heuristics
  if (
    q.includes('react') ||
    q.includes('vue') ||
    q.includes('frontend') ||
    q.includes('ui') ||
    q.includes('dashboard') ||
    q.includes('canvas') ||
    q.includes('web app')
  ) {
    categories.push('Frontend Framework');
  }

  if (
    q.includes('state') ||
    q.includes('realtime') ||
    q.includes('collaborative') ||
    q.includes('sync') ||
    q.includes('websocket')
  ) {
    categories.push('State & Realtime');
  }

  if (
    q.includes('backend') ||
    q.includes('api') ||
    q.includes('server') ||
    q.includes('chat') ||
    q.includes('auth') ||
    q.includes('login')
  ) {
    categories.push('Backend & API');
  }

  if (
    q.includes('db') ||
    q.includes('database') ||
    q.includes('sql') ||
    q.includes('postgres') ||
    q.includes('storage') ||
    q.includes('mongo') ||
    q.includes('redis')
  ) {
    categories.push('Database');
  }

  if (
    q.includes('host') ||
    q.includes('deploy') ||
    q.includes('cloud') ||
    q.includes('docker') ||
    q.includes('serverless') ||
    q.includes('infra')
  ) {
    categories.push('Hosting & Infra');
  }

  if (categories.length === 0) {
    categories.push('Frontend', 'Database', 'Backend', 'Hosting');
  }

  // Constraints heuristics
  if (q.includes('self-host') || q.includes('on-prem') || q.includes('local')) {
    constraints.push('self-hostable');
  }
  if (
    q.includes('permissive') ||
    q.includes('mit') ||
    q.includes('apache') ||
    q.includes('commercial') ||
    q.includes('proprietary')
  ) {
    constraints.push('permissive-license');
  }

  // Language heuristics
  if (q.includes('python')) {
    primary_language = 'python';
    constraints.push('python');
  } else if (q.includes('typescript') || q.includes('ts') || q.includes('next')) {
    primary_language = 'typescript';
    constraints.push('typescript');
  } else if (q.includes('rust')) {
    primary_language = 'rust';
    constraints.push('rust');
  } else if (q.includes('go') || q.includes('golang')) {
    primary_language = 'go';
    constraints.push('go');
  }

  // Deployment target
  if (q.includes('docker') || q.includes('container')) deployment_target = 'docker';
  else if (q.includes('serverless')) deployment_target = 'serverless';
  else if (q.includes('edge')) deployment_target = 'edge';

  return {
    categories_needed: categories,
    constraints,
    primary_language,
    deployment_target,
  };
}

// ─── Step 3: Rank Candidates (Exact Scoring Rubric) ───────────────────

export function rankTool(
  tool: Tool,
  targetCategory: string,
  intent: UnderstoodIntent
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // 1. Category match (+30)
  const toolCat = (tool.category || '').toLowerCase();
  const targetCat = targetCategory.toLowerCase();
  if (toolCat && (toolCat === targetCat || toolCat.includes(targetCat) || targetCat.includes(toolCat))) {
    score += 30;
    reasons.push('Direct architectural role match (+30)');
  } else if (tool.tags?.some(t => targetCat.includes(t.toLowerCase()))) {
    score += 15;
    reasons.push('Tag domain overlap (+15)');
  }

  // 2. Tags / use-cases overlap (+20)
  const allToolTerms = [...(tool.tags || []), ...(tool.use_cases || [])].map(t => t.toLowerCase());
  const matchedTerms = allToolTerms.filter(t =>
    intent.constraints.some(c => c.toLowerCase().includes(t)) ||
    targetCat.toLowerCase().includes(t)
  );
  if (matchedTerms.length > 0) {
    const termScore = Math.min(20, matchedTerms.length * 10);
    score += termScore;
    reasons.push(`Relevant project use cases (+${termScore})`);
  }

  // 3. Matches language / framework constraint (+20)
  if (intent.primary_language !== 'any') {
    const langMatch = tool.languages?.some(
      l => l.toLowerCase() === intent.primary_language.toLowerCase()
    );
    if (langMatch) {
      score += 20;
      reasons.push(`Native ${intent.primary_language} compatibility (+20)`);
    }
  }

  // 4. Active maintenance (committed < 90d) (+10)
  if (tool.last_commit_date) {
    const daysSince =
      (Date.now() - new Date(tool.last_commit_date).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 90) {
      score += 10;
      reasons.push('Active maintenance within 90 days (+10)');
    }
  }

  // 5. Popularity (log10 of stars) (+10)
  const stars = tool.stars || 0;
  if (stars > 0) {
    const starScore = Math.min(10, Math.round(Math.log10(stars + 1) * 2));
    score += starScore;
    reasons.push(`Proven community adoption (+${starScore})`);
  }

  // 6. License compatibility (+10)
  const lic = (tool.license || '').toLowerCase();
  const requiresPermissive = intent.constraints.includes('permissive-license');
  if (requiresPermissive) {
    if (lic.includes('mit') || lic.includes('apache') || lic.includes('bsd') || lic.includes('isc')) {
      score += 10;
      reasons.push('Permissive open-source license (+10)');
    } else if (lic.includes('gpl') || lic.includes('agpl')) {
      score -= 20;
      reasons.push('Copyleft license penalty (-20)');
    }
  } else if (lic) {
    score += 5;
    reasons.push('Clear open-source licensing (+5)');
  }

  // Self-hostable requirement (+15)
  if (intent.constraints.includes('self-hostable') && tool.self_hostable) {
    score += 15;
    reasons.push('Fully self-hostable (+15)');
  }

  return { score, reasons };
}

// ─── Compatibility Warnings ──────────────────────────────────────────

export function detectCompatibilityWarnings(
  tools: Tool[],
  constraints: string[]
): CompatibilityWarning[] {
  const warnings: CompatibilityWarning[] = [];
  const licenses = tools.map(t => ({ name: t.title, lic: (t.license || '').toLowerCase() }));

  // License copyleft clash
  const hasGPL = licenses.filter(l => l.lic.includes('gpl') || l.lic.includes('agpl'));
  if (
    hasGPL.length > 0 &&
    constraints.some(c => c.includes('permissive') || c.includes('commercial') || c.includes('proprietary'))
  ) {
    warnings.push({
      severity: 'warning',
      title: 'Copyleft License Restriction',
      description: `${hasGPL.map(g => g.name).join(', ')} uses a copyleft (GPL/AGPL) license. If you are building closed-source or commercial proprietary software, inspect the distribution obligations.`,
      tool_a: hasGPL[0].name,
    });
  }

  // Conflicting UI libraries
  const frontends = tools.filter(
    t => (t.category || '').toLowerCase().includes('frontend') || (t.category || '').toLowerCase().includes('framework')
  );
  if (frontends.length > 1) {
    warnings.push({
      severity: 'info',
      title: 'Multiple Frontend Frameworks',
      description: `${frontends.map(f => f.title).join(' and ')} are multiple presentation frameworks. Ensure they are isolated in distinct sub-apps or micro-frontends.`,
      tool_a: frontends[0].title,
      tool_b: frontends[1].title,
    });
  }

  return warnings;
}

// ─── Pure DB Recommendation Pipeline (Fallback & Zero Hallucination) ──

export function generateStackFromDatabase(
  query: string,
  tools: Tool[],
  lockedToolIds: string[] = []
): StackRecommendationResult {
  const intent = understandIntent(query);

  if (tools.length === 0) {
    return {
      query,
      understanding: intent,
      tools: [],
      warnings: [],
      setup_commands: [],
      source: 'db_fallback',
    };
  }

  const lockedMap = new Map<string, Tool>();
  for (const id of lockedToolIds) {
    const found = tools.find(t => t.id === id);
    if (found) {
      lockedMap.set(found.category || found.id, found);
    }
  }

  const finalTools: StackToolRecommendation[] = [];
  const usedIds = new Set<string>();

  for (const category of intent.categories_needed) {
    const locked = lockedMap.get(category);
    if (locked) {
      usedIds.add(locked.id);
      finalTools.push({
        id: locked.id,
        title: locked.title,
        name: locked.name,
        slug: locked.slug,
        category,
        description: locked.description,
        url: locked.url,
        tags: locked.tags || [],
        languages: locked.languages,
        frameworks: locked.frameworks,
        license: locked.license,
        stars: locked.stars,
        likes_count: locked.likes_count,
        last_commit_date: locked.last_commit_date,
        self_hostable: locked.self_hostable,
        score: 100,
        reason: 'Locked by user selection for this layer.',
        is_locked: true,
        alternatives: [],
      });
      continue;
    }

    // Rank available candidates
    const candidates = tools
      .filter(t => !usedIds.has(t.id))
      .map(tool => {
        const { score, reasons } = rankTool(tool, category, intent);
        return { tool, score, reasons };
      })
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (candidates.length === 0) {
      // Do not hallucinate tools when none match this category
      continue;
    }

    const topPick = candidates[0];
    usedIds.add(topPick.tool.id);

    const alternatives: StackAlternativeTool[] = candidates.slice(1, 4).map(c => ({
      id: c.tool.id,
      title: c.tool.title,
      name: c.tool.name,
      slug: c.tool.slug,
      description: c.tool.description,
      license: c.tool.license,
      stars: c.tool.stars,
      score: c.score,
      url: c.tool.url,
    }));

    finalTools.push({
      id: topPick.tool.id,
      title: topPick.tool.title,
      name: topPick.tool.name,
      slug: topPick.tool.slug,
      category,
      description: topPick.tool.description,
      url: topPick.tool.url,
      tags: topPick.tool.tags || [],
      languages: topPick.tool.languages,
      frameworks: topPick.tool.frameworks,
      license: topPick.tool.license,
      stars: topPick.tool.stars,
      likes_count: topPick.tool.likes_count,
      last_commit_date: topPick.tool.last_commit_date,
      self_hostable: topPick.tool.self_hostable,
      score: topPick.score,
      reason: topPick.reasons.join('. ') || `Optimal selection for ${category}.`,
      is_locked: false,
      alternatives,
    });
  }

  // Step 5: Validate all tool IDs exist in DB
  const validTools = finalTools.filter(t => tools.some(dbTool => dbTool.id === t.id));
  const chosenDbTools = tools.filter(t => validTools.some(vt => vt.id === t.id));
  const warnings = detectCompatibilityWarnings(chosenDbTools, intent.constraints);

  const setup_commands = [
    `# Initialize stack for ${intent.primary_language || 'modern web'}`,
    'npm create vite@latest my-app',
    'cd my-app',
    validTools.length > 0
      ? `npm install ${validTools.map(t => (t.slug || t.title).toLowerCase().replace(/[^a-z0-9-]/g, '')).slice(0, 4).join(' ')}`
      : 'npm install',
    'npm run dev',
  ];

  return {
    query,
    understanding: intent,
    tools: validTools,
    warnings,
    setup_commands,
    source: 'db_fallback',
  };
}

// ─── Main Pipeline Coordinator ───────────────────────────────────────

export async function generateStackPipeline(
  query: string,
  allTools: Tool[],
  options: GenerateStackOptions = {}
): Promise<StackRecommendationResult> {
  const { lockedToolIds = [], onStepChange, timeoutMs = 8000 } = options;

  onStepChange?.('understanding');

  // Try edge function first with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    onStepChange?.('retrieving');
    const response = await fetch(`${EDGE_FUNCTION_BASE}/functions/v1/generate-stack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      },
      body: JSON.stringify({
        query,
        locked_tool_ids: lockedToolIds,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      onStepChange?.('ranking');
      const data = await response.json() as StackRecommendationResult;

      onStepChange?.('explaining');

      // Step 5: Client-side Validation (verify every ID against allTools)
      const validTools = (data.tools || []).filter(recommendedTool => {
        const found = allTools.find(t => t.id === recommendedTool.id);
        if (!found) return false;
        // Also validate alternatives
        recommendedTool.alternatives = (recommendedTool.alternatives || []).filter(alt =>
          allTools.some(t => t.id === alt.id)
        );
        // Mark locked state
        recommendedTool.is_locked = lockedToolIds.includes(recommendedTool.id);
        return true;
      });

      if (validTools.length > 0) {
        onStepChange?.('complete');
        return {
          ...data,
          tools: validTools,
        };
      }
    }
  } catch {
    // Edge function failed or timed out; proceed to fallback
  }

  // Fallback to pure deterministic DB pipeline
  onStepChange?.('ranking');
  await new Promise(r => setTimeout(r, 120)); // Subtle UI step pacing
  onStepChange?.('explaining');
  const fallbackResult = generateStackFromDatabase(query, allTools, lockedToolIds);
  onStepChange?.('complete');
  return fallbackResult;
}

// ─── Tool Swapping & Locking Utilities ────────────────────────────────

export function swapToolWithAlternative(
  currentResult: StackRecommendationResult,
  targetCategory: string,
  alternativeId: string,
  allTools: Tool[]
): StackRecommendationResult {
  const replacementTool = allTools.find(t => t.id === alternativeId);
  if (!replacementTool) return currentResult;

  const updatedTools = currentResult.tools.map(tool => {
    if (tool.category !== targetCategory) return tool;

    // The old tool becomes an alternative
    const oldAsAlt: StackAlternativeTool = {
      id: tool.id,
      title: tool.title,
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      license: tool.license,
      stars: tool.stars,
      score: tool.score,
      url: tool.url,
    };

    const newAlternatives = [
      oldAsAlt,
      ...tool.alternatives.filter(a => a.id !== alternativeId),
    ];

    return {
      ...tool,
      id: replacementTool.id,
      title: replacementTool.title,
      name: replacementTool.name,
      slug: replacementTool.slug,
      description: replacementTool.description,
      url: replacementTool.url,
      tags: replacementTool.tags || [],
      languages: replacementTool.languages,
      frameworks: replacementTool.frameworks,
      license: replacementTool.license,
      stars: replacementTool.stars,
      likes_count: replacementTool.likes_count,
      last_commit_date: replacementTool.last_commit_date,
      self_hostable: replacementTool.self_hostable,
      reason: `Swapped by user to ${replacementTool.title}.`,
      alternatives: newAlternatives,
    };
  });

  const chosenDbTools = allTools.filter(t => updatedTools.some(ut => ut.id === t.id));
  const updatedWarnings = detectCompatibilityWarnings(chosenDbTools, currentResult.understanding.constraints);

  return {
    ...currentResult,
    tools: updatedTools,
    warnings: updatedWarnings,
  };
}

// ─── Stack Sharing and Database Persistence ──────────────────────────

export async function saveSharedStack(params: {
  title: string;
  query: string;
  result: StackRecommendationResult;
  is_public?: boolean;
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  const insertPayload = {
    user_id: session?.user?.id || null,
    title: params.title || `${params.query.slice(0, 40)} Stack`,
    query: params.query,
    result: params.result as unknown as Record<string, unknown>,
    is_public: params.is_public ?? true,
  };

  const { data, error } = await supabase
    .from('saved_stacks')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function loadSharedStack(stackId: string): Promise<StackRecommendationResult | null> {
  const { data, error } = await supabase
    .from('saved_stacks')
    .select('*')
    .eq('id', stackId)
    .single();

  if (error || !data) return null;
  return data.result as unknown as StackRecommendationResult;
}

// ─── Feedback Submission ──────────────────────────────────────────────

export async function submitRecommendationFeedback(feedback: RecommendationFeedback): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  let sessionId = sessionStorage.getItem('gronckle-session-id');
  if (!sessionId) {
    sessionId = `session_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    sessionStorage.setItem('gronckle-session-id', sessionId);
  }

  const { error } = await supabase
    .from('recommendation_feedback')
    .insert({
      user_id: session?.user?.id || null,
      session_id: sessionId,
      query: feedback.query,
      tool_id: feedback.tool_id || null,
      stack_id: feedback.stack_id || null,
      feedback: feedback.feedback,
      comments: feedback.comments || null,
      metadata: feedback.metadata || {},
    });

  if (error) {
    console.warn('Failed to record recommendation feedback:', error);
  }
}
