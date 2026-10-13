-- Migration: add_llm_usage
-- Creates llm_usage table and daily rate cap checking function

CREATE TABLE IF NOT EXISTS public.llm_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  model text NOT NULL,
  tokens_in int DEFAULT 0,
  tokens_out int DEFAULT 0,
  estimated_cost numeric(10, 6) DEFAULT 0.0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash text,
  function_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS llm_usage_created_at_idx ON public.llm_usage(created_at);
CREATE INDEX IF NOT EXISTS llm_usage_ip_hash_idx ON public.llm_usage(ip_hash);
CREATE INDEX IF NOT EXISTS llm_usage_user_id_idx ON public.llm_usage(user_id);

ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;

-- Admins can view all usage logs
CREATE POLICY "llm_usage_admin_select" ON public.llm_usage
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role and functions can insert
CREATE POLICY "llm_usage_insert_service" ON public.llm_usage
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- Daily rate limit check function
CREATE OR REPLACE FUNCTION public.check_llm_daily_cap(
  p_ip_hash text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_daily_limit int DEFAULT 60
)
RETURNS boolean AS $$
DECLARE
  current_count int;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT count(*) INTO current_count
    FROM public.llm_usage
    WHERE user_id = p_user_id
      AND created_at >= (now() - interval '24 hours');
  ELSIF p_ip_hash IS NOT NULL THEN
    SELECT count(*) INTO current_count
    FROM public.llm_usage
    WHERE ip_hash = p_ip_hash
      AND created_at >= (now() - interval '24 hours');
  ELSE
    RETURN true;
  END IF;

  RETURN (current_count < p_daily_limit);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
