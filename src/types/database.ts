// ─── Core Data Types ────────────────────────────────────────────────

export interface Tool {
  id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  likes_count: number;
  security_grade?: string;
  created_at: string;
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

export type Page = 'den' | 'smelt' | 'stash' | 'cave' | 'intel' | 'forge' | 'source' | 'terminal';
