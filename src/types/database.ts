// ─── Core Data Types ────────────────────────────────────────────────

export interface Tool {
  id: string;
  title: string;
  name?: string;
  slug?: string;
  type?: 'repo' | 'website' | 'library' | 'service';
  category?: string;
  subcategories?: string[];
  description: string;
  url: string;
  use_cases?: string[];
  tags: string[];
  languages?: string[];
  frameworks?: string[];
  runtime?: string[];
  deploy_targets?: string[];
  license?: string;
  pricing?: 'open source' | 'free tier' | 'paid';
  self_hostable?: boolean;
  maturity?: 'alpha' | 'beta' | 'stable' | 'mature' | 'deprecated';
  last_commit_date?: string;
  stars?: number;
  open_issues?: number;
  likes_count: number;
  security_grade?: string;
  created_at: string;
  install_command?: string;
  npm_package?: string;
  embedding?: number[] | null;
  embedding_model?: string;
  embedded_at?: string;
  free_tier_note?: string;
}

export interface Comment {
  id: string;
  tool_id: string;
  author: string;
  content: string;
  parent_id: string | null;
  user_id?: string | null;
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
  title?: string;
  description: string;
  stars?: number;
  category?: string;
  tags?: string[];
  why_underrated?: string;
  url?: string;
  license?: string;
  languages?: string[];
  created_at?: string;
}

export interface InboxMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

// ─── Auth & User Types ──────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  github_username: string | null;
  role: 'user' | 'admin' | 'moderator';
  created_at: string;
  updated_at: string;
}

export interface SavedStack {
  id: string;
  user_id: string;
  title: string;
  query: string;
  result: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  tool_id: string;
  created_at: string;
}

export interface UserLike {
  id: string;
  user_id: string;
  tool_id: string;
  created_at: string;
}

export type Page = 'den' | 'smelt' | 'stash' | 'cave' | 'intel' | 'forge' | 'source' | 'terminal' | 'changelog';

// ─── Recommendation Pipeline Types ───────────────────────────────────

export type PipelineStep = 'idle' | 'understanding' | 'retrieving' | 'ranking' | 'explaining' | 'complete';

export interface StackAlternativeTool {
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
}

export interface StackToolRecommendation {
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
  is_locked?: boolean;
  install_command?: string;
  npm_package?: string;
  alternatives: StackAlternativeTool[];
}

export interface CompatibilityWarning {
  severity: 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  tool_a: string;
  tool_b?: string;
}

export interface StackRecommendationResult {
  query: string;
  understanding: {
    categories_needed: string[];
    constraints: string[];
    primary_language: string;
    deployment_target: string;
  };
  tools: StackToolRecommendation[];
  warnings: CompatibilityWarning[];
  setup_commands: string[];
  source: 'ai_edge' | 'db_fallback';
  created_at?: string;
}

export interface RecommendationFeedback {
  id?: string;
  user_id?: string | null;
  session_id?: string;
  query: string;
  tool_id?: string | null;
  stack_id?: string | null;
  feedback: 'thumbs_up' | 'thumbs_down';
  comments?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}
