-- Migration: Add recommendation feedback table and allow public stack sharing
ALTER TABLE public.saved_stacks ALTER COLUMN user_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'saved_stacks' AND policyname = 'saved_stacks_insert_anon'
  ) THEN
    CREATE POLICY "saved_stacks_insert_anon" ON public.saved_stacks
      FOR INSERT
      TO public
      WITH CHECK (user_id IS NULL AND is_public = true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  query TEXT NOT NULL,
  tool_id UUID REFERENCES public.tools(id) ON DELETE CASCADE,
  stack_id UUID REFERENCES public.saved_stacks(id) ON DELETE SET NULL,
  feedback TEXT NOT NULL CHECK (feedback IN ('thumbs_up', 'thumbs_down')),
  comments TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recommendation_feedback' AND policyname = 'recommendation_feedback_insert_all'
  ) THEN
    CREATE POLICY "recommendation_feedback_insert_all" ON public.recommendation_feedback
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recommendation_feedback' AND policyname = 'recommendation_feedback_select_own'
  ) THEN
    CREATE POLICY "recommendation_feedback_select_own" ON public.recommendation_feedback
      FOR SELECT
      TO public
      USING ((user_id = auth.uid()) OR (auth.jwt() ->> 'role' = 'service_role'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_tool_id ON public.recommendation_feedback(tool_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_query ON public.recommendation_feedback(query);
CREATE INDEX IF NOT EXISTS idx_recommendation_feedback_created_at ON public.recommendation_feedback(created_at DESC);
