import { supabase } from './supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────

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

// ─── Auth Actions ───────────────────────────────────────────────────

/**
 * Sign in with GitHub OAuth.
 * Redirects the user to GitHub for authentication.
 */
export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}`,
      scopes: 'read:user user:email',
    },
  });

  if (error) {
    console.error('GitHub sign-in error:', error);
    throw error;
  }

  return data;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

/**
 * Get the current session (may be null).
 */
export async function getSession(): Promise<Session | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Get session error:', error);
    return null;
  }
  return session;
}

/**
 * Get the current user (may be null).
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    // Not authenticated — this is fine, not an error to log
    return null;
  }
  return user;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// ─── Profile API ────────────────────────────────────────────────────

/**
 * Get the current user's profile.
 */
export async function getProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Get profile error:', error);
    return null;
  }

  return data as Profile;
}

/**
 * Get a profile by user ID (public).
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Get profile by ID error:', error);
    return null;
  }

  return data as Profile;
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(updates: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'avatar_url'>>): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Update profile error:', error);
    throw error;
  }

  return data as Profile;
}

// ─── Likes API (Authenticated) ──────────────────────────────────────

/**
 * Toggle a like on a tool. Returns true if liked, false if unliked.
 * Requires authentication.
 */
export async function toggleLike(toolId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_tool_like', {
    p_tool_id: toolId,
  });

  if (error) {
    console.error('Toggle like error:', error);
    throw error;
  }

  return data as boolean;
}

/**
 * Get all tool IDs that the current user has liked.
 */
export async function getUserLikes(): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('get_user_likes');

  if (error) {
    console.error('Get user likes error:', error);
    return new Set();
  }

  return new Set((data as string[]) || []);
}

// ─── Bookmarks API ──────────────────────────────────────────────────

/**
 * Toggle a bookmark on a tool. Returns true if bookmarked, false if removed.
 */
export async function toggleBookmark(toolId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_bookmark', {
    p_tool_id: toolId,
  });

  if (error) {
    console.error('Toggle bookmark error:', error);
    throw error;
  }

  return data as boolean;
}

/**
 * Get all bookmarked tool IDs for the current user.
 */
export async function getUserBookmarks(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_user_bookmarks');

  if (error) {
    console.error('Get user bookmarks error:', error);
    return [];
  }

  return (data as Array<{ tool_id: string }>)?.map(b => b.tool_id) || [];
}

// ─── Saved Stacks API ───────────────────────────────────────────────

/**
 * Save a generated stack to the database.
 */
export async function saveStack(stack: {
  title: string;
  query: string;
  result: Record<string, unknown>;
  is_public?: boolean;
}): Promise<SavedStack | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('saved_stacks')
    .insert([{
      user_id: user.id,
      title: stack.title,
      query: stack.query,
      result: stack.result,
      is_public: stack.is_public ?? false,
    }])
    .select()
    .single();

  if (error) {
    console.error('Save stack error:', error);
    throw error;
  }

  return data as SavedStack;
}

/**
 * Get all saved stacks for the current user.
 */
export async function getUserStacks(): Promise<SavedStack[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_stacks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get user stacks error:', error);
    return [];
  }

  return (data as SavedStack[]) || [];
}

/**
 * Get a public stack by its ID (for shareable URLs).
 */
export async function getPublicStack(stackId: string): Promise<SavedStack | null> {
  const { data, error } = await supabase
    .from('saved_stacks')
    .select('*')
    .eq('id', stackId)
    .eq('is_public', true)
    .single();

  if (error) {
    console.error('Get public stack error:', error);
    return null;
  }

  return data as SavedStack;
}

/**
 * Delete a saved stack.
 */
export async function deleteStack(stackId: string): Promise<boolean> {
  const { error } = await supabase
    .from('saved_stacks')
    .delete()
    .eq('id', stackId);

  if (error) {
    console.error('Delete stack error:', error);
    return false;
  }

  return true;
}
