-- =============================================
-- Migration: add_rpc_functions
-- Phase 1: RPC functions for atomic operations
-- =============================================

-- Atomic like increment (avoids race conditions)
CREATE OR REPLACE FUNCTION public.increment_tool_likes(p_tool_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.tools
  SET likes_count = likes_count + 1
  WHERE id = p_tool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic like decrement
CREATE OR REPLACE FUNCTION public.decrement_tool_likes(p_tool_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.tools
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = p_tool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle like (atomic: insert user_like + increment, or delete + decrement)
CREATE OR REPLACE FUNCTION public.toggle_tool_like(p_tool_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_likes WHERE user_id = v_user_id AND tool_id = p_tool_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.user_likes WHERE user_id = v_user_id AND tool_id = p_tool_id;
    UPDATE public.tools SET likes_count = GREATEST(0, likes_count - 1) WHERE id = p_tool_id;
    RETURN false; -- unliked
  ELSE
    INSERT INTO public.user_likes (user_id, tool_id) VALUES (v_user_id, p_tool_id)
    ON CONFLICT DO NOTHING;
    UPDATE public.tools SET likes_count = likes_count + 1 WHERE id = p_tool_id;
    RETURN true; -- liked
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's liked tool IDs
CREATE OR REPLACE FUNCTION public.get_user_likes()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT tool_id FROM public.user_likes WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's bookmarked tool IDs
CREATE OR REPLACE FUNCTION public.get_user_bookmarks()
RETURNS TABLE(tool_id UUID, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT b.tool_id, b.created_at
  FROM public.bookmarks b
  WHERE b.user_id = auth.uid()
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Toggle bookmark
CREATE OR REPLACE FUNCTION public.toggle_bookmark(p_tool_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_exists BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.bookmarks WHERE user_id = v_user_id AND tool_id = p_tool_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.bookmarks WHERE user_id = v_user_id AND tool_id = p_tool_id;
    RETURN false;
  ELSE
    INSERT INTO public.bookmarks (user_id, tool_id) VALUES (v_user_id, p_tool_id)
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
