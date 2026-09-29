import { Client, Databases, ID, Query } from 'appwrite';

// ─── Appwrite Client ────────────────────────────────────────────────
const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

const databases = new Databases(client);

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'Vault';
const TOOLS_COLLECTION = import.meta.env.VITE_APPWRITE_COLLECTION_TOOLS || 'tools';
const COMMENTS_COLLECTION = import.meta.env.VITE_APPWRITE_COLLECTION_COMMENTS || 'comments';
const INBOX_COLLECTION = import.meta.env.VITE_APPWRITE_COLLECTION_INBOX || 'inbox';
const NEWS_COLLECTION = import.meta.env.VITE_APPWRITE_COLLECTION_NEWS || 'news';
const REPOS_COLLECTION = import.meta.env.VITE_APPWRITE_COLLECTION_REPOS || 'repos';

// ─── Types ──────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────

// Map an Appwrite document to our Tool type
function docToTool(doc: Record<string, unknown>): Tool {
  return {
    id: doc.$id as string,
    title: (doc.title as string) || '',
    description: (doc.description as string) || '',
    url: (doc.url as string) || '',
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    likes_count: (doc.likes_count as number) || 0,
    security_grade: (doc.security_grade as string) || '',
    created_at: (doc.$createdAt as string) || (doc.created_at as string) || '',
  };
}

function docToComment(doc: Record<string, unknown>): Comment {
  return {
    id: doc.$id as string,
    tool_id: (doc.tool_id as string) || '',
    author: (doc.author as string) || '',
    content: (doc.content as string) || '',
    parent_id: (doc.parent_id as string) || null,
    created_at: (doc.$createdAt as string) || (doc.created_at as string) || '',
  };
}

function docToNewsItem(doc: Record<string, unknown>): NewsItem {
  return {
    id: doc.$id as string,
    source: (doc.source as string) || '',
    headline: (doc.headline as string) || '',
    url: (doc.url as string) || '',
    date: (doc.date as string) || (doc.$createdAt as string) || '',
  };
}

function docToRepo(doc: Record<string, unknown>): Repo {
  return {
    id: doc.$id as string,
    owner: (doc.owner as string) || '',
    repo: (doc.repo as string) || '',
    description: (doc.description as string) || '',
    stars: (doc.stars as number) || 0,
  };
}

function docToInbox(doc: Record<string, unknown>): InboxMessage {
  return {
    id: doc.$id as string,
    name: (doc.name as string) || '',
    email: (doc.email as string) || '',
    message: (doc.message as string) || '',
    created_at: (doc.$createdAt as string) || (doc.created_at as string) || '',
  };
}

// ─── Tools API ──────────────────────────────────────────────────────

export async function getTools(): Promise<Tool[]> {
  const response = await databases.listDocuments(DATABASE_ID, TOOLS_COLLECTION, [
    Query.limit(100),
    Query.orderDesc('likes_count'),
  ]);
  return response.documents.map(doc => docToTool(doc as unknown as Record<string, unknown>));
}

export async function getTopTools(limit: number = 5): Promise<Tool[]> {
  const response = await databases.listDocuments(DATABASE_ID, TOOLS_COLLECTION, [
    Query.limit(limit),
    Query.orderDesc('likes_count'),
  ]);
  return response.documents.map(doc => docToTool(doc as unknown as Record<string, unknown>));
}

export async function searchTools(query: string): Promise<Tool[]> {
  const response = await databases.listDocuments(DATABASE_ID, TOOLS_COLLECTION, [
    Query.search('title', query),
  ]);
  return response.documents.map(doc => docToTool(doc as unknown as Record<string, unknown>));
}

export async function searchRepos(query: string): Promise<Repo[]> {
  const response = await databases.listDocuments(DATABASE_ID, REPOS_COLLECTION, [
    Query.limit(20),
    Query.or([
      Query.search('repo', query),
      Query.search('owner', query)
    ])
  ]);
  return response.documents.map(doc => docToRepo(doc as unknown as Record<string, unknown>));
}

export async function incrementLikes(toolId: string): Promise<boolean> {
  const doc = await databases.getDocument(DATABASE_ID, TOOLS_COLLECTION, toolId);
  const currentLikes = (doc as unknown as Record<string, unknown>).likes_count as number || 0;
  await databases.updateDocument(DATABASE_ID, TOOLS_COLLECTION, toolId, {
    likes_count: currentLikes + 1,
  });
  return true;
}

export async function decrementLikes(toolId: string): Promise<boolean> {
  const doc = await databases.getDocument(DATABASE_ID, TOOLS_COLLECTION, toolId);
  const currentLikes = (doc as unknown as Record<string, unknown>).likes_count as number || 0;
  await databases.updateDocument(DATABASE_ID, TOOLS_COLLECTION, toolId, {
    likes_count: Math.max(0, currentLikes - 1),
  });
  return true;
}

// ─── Comments API ───────────────────────────────────────────────────

export async function getComments(toolId: string): Promise<Comment[]> {
  const response = await databases.listDocuments(DATABASE_ID, COMMENTS_COLLECTION, [
    Query.equal('tool_id', toolId),
    Query.orderDesc('$createdAt'),
    Query.limit(100),
  ]);
  return response.documents.map(doc => docToComment(doc as unknown as Record<string, unknown>));
}

export async function addComment(comment: { tool_id: string; author: string; content: string; parent_id?: string | null }): Promise<Comment> {
  const doc = await databases.createDocument(DATABASE_ID, COMMENTS_COLLECTION, ID.unique(), {
    tool_id: comment.tool_id,
    author: comment.author,
    content: comment.content,
    parent_id: comment.parent_id || null,
  });
  return docToComment(doc as unknown as Record<string, unknown>);
}

// ─── Inbox API ──────────────────────────────────────────────────────

export async function submitToInbox(message: { name: string; email: string; message: string }): Promise<InboxMessage> {
  const doc = await databases.createDocument(DATABASE_ID, INBOX_COLLECTION, ID.unique(), {
    name: message.name,
    email: message.email,
    message: message.message,
  });
  return docToInbox(doc as unknown as Record<string, unknown>);
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
  const tagsLower = tool.tags.map(t => t.toLowerCase());
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
  const tagsLower = tool.tags.map(t => t.toLowerCase());
  let bestTag = tool.tags[0] || 'general utility';
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
    const top = sorted[0];
    return {
      tool: top,
      reasoning: `No specific technical pattern detected in your query. I'm recommending ${top.title} — the highest-rated tool in our vault — as a strong general-purpose starting point. ${top.description}`,
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
  const response = await databases.listDocuments(DATABASE_ID, NEWS_COLLECTION, [
    Query.orderDesc('date'),
    Query.limit(20),
  ]);
  return response.documents.map(doc => docToNewsItem(doc as unknown as Record<string, unknown>));
}

// ─── Repos API ──────────────────────────────────────────────────────

export async function getRepos(): Promise<Repo[]> {
  const response = await databases.listDocuments(DATABASE_ID, REPOS_COLLECTION, [
    Query.limit(20),
  ]);
  return response.documents.map(doc => docToRepo(doc as unknown as Record<string, unknown>));
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
  const unsubscribe = client.subscribe(
    `databases.${DATABASE_ID}.collections.${TOOLS_COLLECTION}.documents`,
    (response) => {
      const payload = response.payload as Record<string, unknown>;
      if (payload?.$id && typeof payload.likes_count === 'number') {
        onUpdate({ id: payload.$id as string, likes_count: payload.likes_count as number });
      }
    }
  );
  return unsubscribe;
}

// ─── Realtime — subscribe to new tool additions ─────────────────────

export function subscribeToNewTools(
  onNewTool: (tool: Tool) => void
) {
  const unsubscribe = client.subscribe(
    `databases.${DATABASE_ID}.collections.${TOOLS_COLLECTION}.documents`,
    (response) => {
      // Only react to document creation events
      const events = response.events || [];
      const isCreate = events.some((e: string) =>
        e.includes('.create')
      );
      if (isCreate) {
        const tool = docToTool(response.payload as Record<string, unknown>);
        onNewTool(tool);
      }
    }
  );
  return unsubscribe;
}
