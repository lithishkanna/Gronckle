import { supabase } from './supabase';

// ─── Types ──────────────────────────────────────────

export interface Submission {
  id: string;
  user_id: string;
  repo_url: string;
  title: string;
  description: string | null;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected';
  upvotes: number;
  created_at: string;
  updated_at: string;
}

export interface RepoFlag {
  id: string;
  user_id: string;
  repo_id: string;
  reason: 'outdated' | 'deprecated' | 'broken_link' | 'security' | 'other';
  details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

// ─── Submissions ────────────────────────────────────

export async function getApprovedSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('community_submissions')
    .select('*')
    .eq('status', 'approved')
    .order('upvotes', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as Submission[];
}

export async function getPendingSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('community_submissions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as Submission[];
}

export async function submitRepo(submission: {
  repo_url: string;
  title: string;
  description?: string;
  tags?: string[];
}): Promise<Submission> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('community_submissions')
    .insert({
      user_id: user.id,
      repo_url: submission.repo_url,
      title: submission.title,
      description: submission.description || null,
      tags: submission.tags || [],
    })
    .select()
    .single();
  if (error) throw error;
  return data as Submission;
}

export async function toggleSubmissionVote(submissionId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_submission_vote', {
    p_submission_id: submissionId,
  });
  if (error) throw error;
  return data as boolean;
}

export async function getUserVotedSubmissions(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('submission_votes')
    .select('submission_id')
    .eq('user_id', user.id);
  return (data || []).map(v => v.submission_id);
}

// ─── Repo Flags ─────────────────────────────────────

export async function flagRepo(flag: {
  repo_id: string;
  reason: RepoFlag['reason'];
  details?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_repo_flag', {
    p_repo_id: flag.repo_id,
    p_reason: flag.reason,
    p_details: flag.details || null,
  });
  if (error) throw error;
  return data as string;
}

export async function getUserFlags(): Promise<RepoFlag[]> {
  const { data, error } = await supabase
    .from('repo_flags')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as RepoFlag[];
}
