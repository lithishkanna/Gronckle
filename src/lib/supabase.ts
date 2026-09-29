import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Tool {
  id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  likes_count: number;
  security_grade: string;
  created_at: string;
}

export interface Comment {
  id: string;
  tool_id: string;
  author: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  replies?: Comment[];
}

export interface NewsItem {
  id: string;
  source: string;
  headline: string;
  url: string;
  date: string;
}

export interface Repo {
  id: string;
  owner: string;
  repo: string;
  description: string;
  stars?: number;
}

export interface InboxMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

// ─── Tools API ──────────────────────────────────────────────────────

export async function getTools(): Promise<Tool[]> {
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .order('likes_count', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
  return data || [];
}

export async function getTopTools(limit: number = 5): Promise<Tool[]> {
  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .order('likes_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top tools:', error);
    return [];
  }
  return data || [];
}

export async function searchTools(query: string): Promise<Tool[]> {
  const { data, error } = await supabase
    .rpc('fuzzy_search_tools', { search_term: query });

  if (error || !data || data.length === 0) {
    if (error) console.error('Error searching tools via RPC:', error);
    // fallback to ilike if RPC fails or yields 0
    const { data: fallbackData } = await supabase
      .from('tools')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(100);
    
    const results = fallbackData || [];
    window.dispatchEvent(new CustomEvent('gronckle-search', { detail: { count: results.length } }));
    return results;
  }
  
  window.dispatchEvent(new CustomEvent('gronckle-search', { detail: { count: data.length } }));
  return data || [];
}

export async function searchRepos(query: string): Promise<Repo[]> {
  const { data, error } = await supabase
    .from('repos')
    .select('*')
    .or(`repo.ilike.%${query}%,owner.ilike.%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching repos:', error);
  }
  const results = data || [];
  window.dispatchEvent(new CustomEvent('gronckle-search', { detail: { count: results.length } }));
  return results;
}

export async function incrementLikes(toolId: string): Promise<boolean> {
  const { data: tool } = await supabase.from('tools').select('likes_count').eq('id', toolId).single();
  const currentLikes = tool?.likes_count || 0;

  const { error } = await supabase
    .from('tools')
    .update({ likes_count: currentLikes + 1 })
    .eq('id', toolId);

  return !error;
}

export async function decrementLikes(toolId: string): Promise<boolean> {
  const { data: tool } = await supabase.from('tools').select('likes_count').eq('id', toolId).single();
  const currentLikes = tool?.likes_count || 0;

  const { error } = await supabase
    .from('tools')
    .update({ likes_count: Math.max(0, currentLikes - 1) })
    .eq('id', toolId);

  return !error;
}

// ─── Comments API ───────────────────────────────────────────────────

export async function getComments(toolId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('tool_id', toolId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  return data || [];
}

export async function addComment(comment: { tool_id: string; author: string; content: string; parent_id?: string | null }): Promise<Comment | null> {
  const { data, error } = await supabase
    .from('comments')
    .insert([comment])
    .select()
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    return null;
  }
  return data;
}

// ─── Inbox API ──────────────────────────────────────────────────────

export async function submitToInbox(message: { name: string; email: string; message: string }): Promise<InboxMessage | null> {
  const { data, error } = await supabase
    .from('inbox')
    .insert([{
      name: message.name,
      email: message.email,
      message: message.message
    }])
    .select()
    .single();

  if (error) {
    console.error('Error submitting to inbox:', error);
    return null;
  }
  return data;
}

// ─── The Oracle — Semantic Tool Recommender ─────────────────────────

export interface OracleResult {
  tool: Tool;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
}

const intentConcepts: Record<string, string[]> = {
  privacy: ['security', 'encryption', 'vpn', 'privacy', 'auth', 'firewall'],
  security: ['security', 'encryption', 'auth', 'firewall', 'vulnerability'],
  encryption: ['security', 'encryption', 'privacy', 'auth'],
  network: ['security', 'privacy', 'vpn', 'networking', 'firewall'],
  auth: ['auth', 'login', 'oauth', 'jwt', 'session', 'security'],
  login: ['auth', 'login', 'oauth', 'jwt', 'session'],
  deploy: ['hosting', 'deployment', 'ci/cd', 'cloud', 'devops', 'server'],
  host: ['hosting', 'deployment', 'cloud', 'server', 'cdn'],
  cloud: ['cloud', 'aws', 'gcp', 'azure', 'serverless', 'hosting'],
  server: ['backend', 'server', 'hosting', 'cloud', 'devops'],
  ship: ['hosting', 'deployment', 'ci/cd', 'devops'],
  design: ['design', 'ui', 'ux', 'figma', 'css', 'frontend'],
  ui: ['design', 'ui', 'ux', 'frontend', 'css', 'component'],
  frontend: ['frontend', 'react', 'vue', 'css', 'html', 'browser'],
  style: ['design', 'css', 'ui', 'frontend', 'tailwind'],
  animation: ['frontend', 'css', 'ui', 'animation', 'motion'],
  database: ['database', 'sql', 'postgres', 'mysql', 'mongo', 'redis', 'backend'],
  backend: ['backend', 'server', 'api', 'database', 'microservice'],
  api: ['api', 'rest', 'graphql', 'endpoint', 'backend'],
  data: ['database', 'analytics', 'data', 'sql', 'backend'],
  test: ['testing', 'jest', 'cypress', 'playwright', 'ci/cd'],
  ci: ['ci/cd', 'devops', 'deployment', 'testing'],
  docker: ['devops', 'docker', 'kubernetes', 'cloud', 'container'],
  monitor: ['monitoring', 'observability', 'logging', 'analytics'],
  productivity: ['productivity', 'workflow', 'automation', 'tool'],
  notes: ['productivity', 'notes', 'docs', 'wiki', 'workspace'],
  project: ['productivity', 'project-management', 'collaboration', 'team'],
  team: ['collaboration', 'team', 'workspace', 'realtime'],
  workflow: ['productivity', 'automation', 'workflow', 'ci/cd'],
  ai: ['ai-ml', 'llm', 'gpt', 'neural', 'model', 'machine learning'],
  machine: ['ai-ml', 'machine learning', 'model', 'neural'],
  ml: ['ai-ml', 'machine learning', 'model', 'neural'],
  email: ['email', 'api', 'communication', 'notification'],
  chat: ['collaboration', 'communication', 'realtime', 'team'],
  mobile: ['mobile', 'ios', 'android', 'react native', 'flutter'],
  app: ['mobile', 'frontend', 'framework', 'tool'],
  terminal: ['terminal', 'cli', 'shell', 'devtool'],
  cli: ['cli', 'terminal', 'shell', 'command-line'],
  build: ['framework', 'frontend', 'backend', 'devtool', 'tool'],
  code: ['devtool', 'ide', 'editor', 'framework', 'tool'],
  fast: ['performance', 'productivity', 'devtool', 'tool'],
  open: ['open-source', 'oss', 'github', 'community'],
};

function extractConcepts(query: string): string[] {
  const words = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const concepts = new Set<string>();
  for (const word of words) {
    if (intentConcepts[word]) {
      intentConcepts[word].forEach(c => concepts.add(c));
    }
    for (const [key, values] of Object.entries(intentConcepts)) {
      if (word.length > 3 && (word.startsWith(key) || key.startsWith(word))) {
        values.forEach(c => concepts.add(c));
      }
    }
  }
  return [...concepts];
}

function scoreTool(tool: Tool, concepts: string[]): number {
  if (concepts.length === 0) return 0;
  let score = 0;
  const titleLower = tool.title.toLowerCase();
  const descLower = tool.description.toLowerCase();
  const tagsLower = (tool.tags || []).map(t => t.toLowerCase());
  for (const concept of concepts) {
    for (const tag of tagsLower) {
      if (tag === concept) score += 10;
      else if (tag.includes(concept) || concept.includes(tag)) score += 5;
    }
    if (titleLower.includes(concept)) score += 4;
    if (descLower.includes(concept)) score += 2;
  }
  return score / concepts.length;
}

function generateReasoning(tool: Tool, concepts: string[], query: string): string {
  const tagsLower = (tool.tags || []).map(t => t.toLowerCase());
  let bestTag = (tool.tags && tool.tags[0]) || 'general utility';
  for (const concept of concepts) {
    for (const tag of tagsLower) {
      if (tag.includes(concept) || concept.includes(tag)) {
        bestTag = tool.tags[tagsLower.indexOf(tag)];
        break;
      }
    }
  }
  const concernWords = query.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['need', 'want', 'looking', 'something', 'that', 'with', 'about', 'have', 'this', 'from', 'your', 'worried'].includes(w));
  const concern = concernWords.slice(0, 2).join(' ') || 'technical needs';
  return `I suggest ${tool.title} because its ${bestTag} capability directly addresses your ${concern} concern. ${tool.description}`;
}

export async function oracleQuery(query: string, tools: Tool[]): Promise<OracleResult> {
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
  const concepts = extractConcepts(query);
  if (concepts.length === 0) {
    const sorted = [...tools].sort((a, b) => b.likes_count - a.likes_count);
    const top = sorted[0] || tools[0];
    return {
      tool: top,
      reasoning: `No specific technical pattern detected in your query. I'm recommending ${top?.title || 'a tool'} — the highest-rated tool in our vault — as a strong general-purpose starting point. ${top?.description || ''}`,
      confidence: 'low',
    };
  }
  const scored = tools.map(tool => ({ tool, score: scoreTool(tool, concepts) }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best.score >= 8) {
    return { tool: best.tool, reasoning: generateReasoning(best.tool, concepts, query), confidence: 'high' };
  } else if (best.score >= 4) {
    return { tool: best.tool, reasoning: generateReasoning(best.tool, concepts, query), confidence: 'medium' };
  } else {
    const sorted = [...tools].sort((a, b) => b.likes_count - a.likes_count);
    const fallback = sorted[0];
    return {
      tool: fallback,
      reasoning: `Your query touches on ${concepts.slice(0, 2).join(' and ')} but no tool is a perfect semantic match. I'm recommending ${fallback.title} as the top-rated general-purpose tool in the vault. ${fallback.description}`,
      confidence: 'low',
    };
  }
}

// ─── News API ───────────────────────────────────────────────────────

export async function getNews(): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from('news')
    .select('*')
    .order('date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching news:', error);
    return [];
  }
  return data || [];
}

// ─── Repos API ──────────────────────────────────────────────────────

export async function getRepos(): Promise<Repo[]> {
  const { data, error } = await supabase
    .from('repos')
    .select('*')
    .limit(20);

  if (error) {
    console.error('Error fetching repos:', error);
    return [];
  }
  return data || [];
}

export async function fetchRepoStars(owner: string, repo: string): Promise<number> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    return data.stargazers_count || 0;
  } catch (error) {
    console.error('Error fetching repo stars:', error);
    return 0;
  }
}

// ─── Realtime — subscribe to tool likes updates ─────────────────────

export function subscribeToToolLikes(
  onUpdate: (payload: { id: string; likes_count: number }) => void
) {
  const channel = supabase.channel('postgres-changes-tools-update')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'tools' },
      (payload) => {
        if (payload.new && typeof payload.new.likes_count === 'number') {
          onUpdate({ id: payload.new.id, likes_count: payload.new.likes_count });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Realtime — subscribe to new tool additions ─────────────────────

export function subscribeToNewTools(
  onNewTool: (tool: Tool) => void
) {
  const channel = supabase.channel('postgres-changes-tools-insert')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'tools' },
      (payload) => {
        if (payload.new) {
          onNewTool(payload.new as Tool);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Realtime — Postgres Broadcast for custom Heart event ───────────

// This specifically listens to the broadcast emitted by the Postgres trigger
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function subscribeToHeartbeat(onBeat: (payload: any) => void) {
  const channel = supabase.channel('likes_channel')
    .on('broadcast', { event: 'likes_count_update' }, (payload) => {
       onBeat(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
