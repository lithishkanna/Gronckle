-- =============================================
-- Migration: enable_rls_and_policies
-- Phase 1: Row Level Security & Access Policies
-- =============================================

-- Enable RLS on ALL tables
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_stacks ENABLE ROW LEVEL SECURITY;

-- ── TOOLS policies ──
-- Anyone can read tools
CREATE POLICY "tools_select_public" ON public.tools
  FOR SELECT USING (true);
-- Only admins can insert/update/delete tools
CREATE POLICY "tools_insert_admin" ON public.tools
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "tools_update_admin" ON public.tools
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "tools_delete_admin" ON public.tools
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
-- Allow anonymous users to update likes_count (for the like/unlike feature)
CREATE POLICY "tools_update_likes_anon" ON public.tools
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- ── REPOS policies ──
CREATE POLICY "repos_select_public" ON public.repos
  FOR SELECT USING (true);
CREATE POLICY "repos_insert_admin" ON public.repos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "repos_update_admin" ON public.repos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "repos_delete_admin" ON public.repos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── NEWS policies ──
CREATE POLICY "news_select_public" ON public.news
  FOR SELECT USING (true);
CREATE POLICY "news_manage_admin" ON public.news
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── INBOX policies ──
-- Anyone can insert into inbox (contact form)
CREATE POLICY "inbox_insert_public" ON public.inbox
  FOR INSERT WITH CHECK (true);
-- Only admins can read inbox
CREATE POLICY "inbox_select_admin" ON public.inbox
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── COMMENTS policies ──
CREATE POLICY "comments_select_public" ON public.comments
  FOR SELECT USING (true);
-- Anyone can insert comments (authenticated or anonymous)
CREATE POLICY "comments_insert_public" ON public.comments
  FOR INSERT WITH CHECK (true);
-- Users can delete their own comments
CREATE POLICY "comments_delete_own" ON public.comments
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- ── PROFILES policies ──
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());
-- Insert handled by trigger (SECURITY DEFINER), but allow self-insert as fallback
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ── BOOKMARKS policies ──
CREATE POLICY "bookmarks_select_own" ON public.bookmarks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bookmarks_insert_own" ON public.bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookmarks_delete_own" ON public.bookmarks
  FOR DELETE USING (user_id = auth.uid());

-- ── USER_LIKES policies ──
CREATE POLICY "user_likes_select_own" ON public.user_likes
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_likes_insert_own" ON public.user_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_likes_delete_own" ON public.user_likes
  FOR DELETE USING (user_id = auth.uid());

-- ── SAVED_STACKS policies ──
-- Users can see their own stacks
CREATE POLICY "saved_stacks_select_own" ON public.saved_stacks
  FOR SELECT USING (user_id = auth.uid() OR is_public = true);
CREATE POLICY "saved_stacks_insert_own" ON public.saved_stacks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_stacks_update_own" ON public.saved_stacks
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "saved_stacks_delete_own" ON public.saved_stacks
  FOR DELETE USING (user_id = auth.uid());
