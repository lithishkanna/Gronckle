-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ══════════════════════════════════════════════════════
-- Community Submissions (user-submitted repos)
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS community_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  repo_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  upvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Submission votes (upvote tracking)
CREATE TABLE IF NOT EXISTS submission_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  submission_id UUID REFERENCES community_submissions(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, submission_id)
);

-- Repo flags (report outdated / broken)
CREATE TABLE IF NOT EXISTS repo_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  repo_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('outdated', 'deprecated', 'broken_link', 'security', 'other')),
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, repo_id)
);

-- Add embedding column to tools for vector similarity
ALTER TABLE tools ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- ══════════════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════════════
ALTER TABLE community_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE repo_flags ENABLE ROW LEVEL SECURITY;

-- Submissions
CREATE POLICY "read_approved_or_own_submissions" ON community_submissions
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id);
CREATE POLICY "auth_insert_submissions" ON community_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "author_update_submissions" ON community_submissions
  FOR UPDATE USING (auth.uid() = user_id);

-- Votes
CREATE POLICY "anyone_read_votes" ON submission_votes
  FOR SELECT USING (true);
CREATE POLICY "auth_insert_votes" ON submission_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_own_votes" ON submission_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Flags
CREATE POLICY "user_read_own_flags" ON repo_flags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "auth_insert_flags" ON repo_flags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════
-- RPC Functions
-- ══════════════════════════════════════════════════════

-- Toggle submission vote (upvote/un-upvote)
CREATE OR REPLACE FUNCTION toggle_submission_vote(p_submission_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM submission_votes 
    WHERE user_id = auth.uid() AND submission_id = p_submission_id
  ) INTO v_exists;
  
  IF v_exists THEN
    DELETE FROM submission_votes WHERE user_id = auth.uid() AND submission_id = p_submission_id;
    UPDATE community_submissions SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = p_submission_id;
    RETURN FALSE;
  ELSE
    INSERT INTO submission_votes (user_id, submission_id) VALUES (auth.uid(), p_submission_id);
    UPDATE community_submissions SET upvotes = upvotes + 1 WHERE id = p_submission_id;
    RETURN TRUE;
  END IF;
END;
$$;

-- Submit a repo flag
CREATE OR REPLACE FUNCTION submit_repo_flag(
  p_repo_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flag_id UUID;
BEGIN
  INSERT INTO repo_flags (user_id, repo_id, reason, details)
  VALUES (auth.uid(), p_repo_id, p_reason, p_details)
  ON CONFLICT (user_id, repo_id) DO UPDATE SET
    reason = EXCLUDED.reason,
    details = EXCLUDED.details,
    status = 'pending',
    created_at = now()
  RETURNING id INTO v_flag_id;
  
  RETURN v_flag_id;
END;
$$;

-- Auto-update timestamp trigger for submissions
DROP TRIGGER IF EXISTS update_submissions_updated_at ON community_submissions;
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON community_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Match tools vector search
CREATE OR REPLACE FUNCTION match_tools(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  url text,
  tags text[],
  likes_count int8,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.url,
    t.tags,
    t.likes_count,
    (1 - (t.embedding <=> query_embedding))::float as similarity
  FROM tools t
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
