/**
 * Client helper for Analyze My Repo feature (Phase D)
 */

export interface AnalyzeRepoResult {
  repo: string;
  manifest_filename: string;
  primary_language: string;
  dependencies_count: number;
  detected_dependencies: string[];
  flagged_dependencies: Array<{
    name: string;
    issue: string;
    risk: 'low' | 'medium' | 'high';
    suggested_alternatives: Array<{
      id: string;
      title: string;
      slug: string;
      description: string;
      url: string;
      stars?: number;
    }>;
  }>;
  vault_recommendations: Array<{
    layer: string;
    observation: string;
    suggested_tool: {
      id: string;
      title: string;
      slug: string;
      description: string;
      url: string;
    };
  }>;
  health_score: number;
  analyzed_at: string;
}

export function parseManifest(content: string, filename = 'package.json'): { dependencies: string[]; primaryLang: string } {
  const deps: string[] = [];
  let primaryLang = 'javascript';

  if (filename.endsWith('.json') || filename.includes('package')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.dependencies) deps.push(...Object.keys(parsed.dependencies));
      if (parsed.devDependencies) deps.push(...Object.keys(parsed.devDependencies));
      primaryLang = deps.includes('typescript') || parsed.devDependencies?.typescript ? 'typescript' : 'javascript';
    } catch {
      // invalid json
    }
  } else if (filename.endsWith('.txt') || filename.includes('requirements')) {
    primaryLang = 'python';
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim().split(/[=><~#]/)[0].trim();
      if (trimmed && !trimmed.startsWith('-')) deps.push(trimmed);
    }
  } else if (filename.endsWith('.mod') || filename.includes('go')) {
    primaryLang = 'go';
    const matches = content.matchAll(/^\s*([a-zA-Z0-9.\-_/]+)\s+v/gm);
    for (const m of matches) {
      deps.push(m[1]);
    }
  }

  return { dependencies: Array.from(new Set(deps)), primaryLang };
}

const EDGE_FUNCTION_BASE = import.meta.env?.VITE_SUPABASE_URL || '';

export async function analyzeRepository(params: {
  repoUrl?: string;
  manifestContent?: string;
  manifestFilename?: string;
}): Promise<AnalyzeRepoResult> {
  const response = await fetch(`${EDGE_FUNCTION_BASE}/functions/v1/analyze-repo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({
      repo_url: params.repoUrl,
      manifest_content: params.manifestContent,
      manifest_filename: params.manifestFilename,
    }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || `Analysis request failed (HTTP ${response.status})`);
  }

  return response.json();
}
