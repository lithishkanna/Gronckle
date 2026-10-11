-- Migration: add_hybrid_search_and_search_logs

-- 1. Search logs table for analytics & zero-result tracking
CREATE TABLE IF NOT EXISTS public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  result_count INT NOT NULL DEFAULT 0,
  suggested_query TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_logs_query ON public.search_logs(query);
CREATE INDEX IF NOT EXISTS idx_search_logs_zero ON public.search_logs(result_count) WHERE result_count = 0;

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_logs_insert_public" ON public.search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "search_logs_select_admin" ON public.search_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Autocomplete RPC for instant prefix matches (< 50ms)
CREATE OR REPLACE FUNCTION public.autocomplete_tools(search_term text, match_limit int DEFAULT 6)
RETURNS TABLE (
  id uuid,
  title text,
  name text,
  category text,
  tags text[],
  stars bigint,
  likes_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.name,
    t.category,
    t.tags,
    t.stars,
    t.likes_count
  FROM public.tools t
  WHERE
    t.title ILIKE search_term || '%'
    OR t.name ILIKE search_term || '%'
    OR search_term <% t.title
    OR search_term <% t.name
  ORDER BY
    CASE
      WHEN t.title ILIKE search_term || '%' THEN 1
      WHEN t.name ILIKE search_term || '%' THEN 2
      ELSE 3
    END,
    t.likes_count DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Did you mean suggestion function
CREATE OR REPLACE FUNCTION public.suggest_search_term(search_term text)
RETURNS text AS $$
DECLARE
  v_suggested text;
BEGIN
  SELECT t.title INTO v_suggested
  FROM public.tools t
  WHERE similarity(t.title, search_term) > 0.25
     OR similarity(coalesce(t.name, ''), search_term) > 0.25
  ORDER BY GREATEST(similarity(t.title, search_term), similarity(coalesce(t.name, ''), search_term)) DESC
  LIMIT 1;

  RETURN v_suggested;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Hybrid Search RPC with Reciprocal Rank Fusion (RRF)
CREATE OR REPLACE FUNCTION public.hybrid_search_tools(
  search_query text,
  query_embedding vector(1536) DEFAULT NULL,
  match_limit int DEFAULT 20,
  rrf_k float DEFAULT 60.0
)
RETURNS TABLE (
  id uuid,
  title text,
  name text,
  slug text,
  type text,
  category text,
  subcategories text[],
  description text,
  use_cases text[],
  tags text[],
  languages text[],
  frameworks text[],
  runtime text[],
  deploy_targets text[],
  license text,
  pricing text,
  self_hostable boolean,
  maturity text,
  last_commit_date timestamptz,
  stars bigint,
  open_issues int,
  likes_count bigint,
  security_grade text,
  url text,
  created_at timestamptz,
  rrf_score float
) AS $$
DECLARE
  parsed_tsquery tsquery;
  clean_query text;
BEGIN
  clean_query := trim(search_query);

  BEGIN
    parsed_tsquery := to_tsquery('english', 
      regexp_replace(clean_query, '([^\w\s])', '', 'g') || ':*'
    );
  EXCEPTION WHEN OTHERS THEN
    parsed_tsquery := plainto_tsquery('english', clean_query);
  END;

  RETURN QUERY
  WITH fts_ranks AS (
    SELECT
      t.id,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(t.fts, parsed_tsquery) DESC) AS rank
    FROM public.tools t
    WHERE t.fts @@ parsed_tsquery
    LIMIT 50
  ),
  trgm_ranks AS (
    SELECT
      t.id,
      ROW_NUMBER() OVER (
        ORDER BY GREATEST(
          similarity(coalesce(t.name, t.title), clean_query),
          similarity(coalesce(t.description, ''), clean_query)
        ) DESC
      ) AS rank
    FROM public.tools t
    WHERE
      (coalesce(t.name, t.title) % clean_query)
      OR (coalesce(t.description, '') % clean_query)
      OR (coalesce(t.name, t.title) ILIKE clean_query || '%')
    LIMIT 50
  ),
  vector_ranks AS (
    SELECT
      t.id,
      ROW_NUMBER() OVER (ORDER BY t.embedding <=> query_embedding) AS rank
    FROM public.tools t
    WHERE query_embedding IS NOT NULL
      AND t.embedding IS NOT NULL
      AND 1 - (t.embedding <=> query_embedding) > 0.3
    LIMIT 50
  ),
  combined_ids AS (
    SELECT id FROM fts_ranks
    UNION
    SELECT id FROM trgm_ranks
    UNION
    SELECT id FROM vector_ranks
  ),
  scored AS (
    SELECT
      c.id,
      (
        COALESCE(1.0 / (rrf_k + f.rank), 0.0) +
        COALESCE(1.0 / (rrf_k + tg.rank), 0.0) +
        COALESCE(1.0 / (rrf_k + v.rank), 0.0)
      )::float AS rrf_score
    FROM combined_ids c
    LEFT JOIN fts_ranks f ON c.id = f.id
    LEFT JOIN trgm_ranks tg ON c.id = tg.id
    LEFT JOIN vector_ranks v ON c.id = v.id
  )
  SELECT
    t.id,
    t.title,
    t.name,
    t.slug,
    t.type,
    t.category,
    t.subcategories,
    t.description,
    t.use_cases,
    t.tags,
    t.languages,
    t.frameworks,
    t.runtime,
    t.deploy_targets,
    t.license,
    t.pricing,
    t.self_hostable,
    t.maturity,
    t.last_commit_date,
    t.stars,
    t.open_issues,
    t.likes_count,
    t.security_grade,
    t.url,
    t.created_at,
    COALESCE(s.rrf_score, 0.0) AS rrf_score
  FROM scored s
  JOIN public.tools t ON t.id = s.id
  ORDER BY s.rrf_score DESC, t.likes_count DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql STABLE;
