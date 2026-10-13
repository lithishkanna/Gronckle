-- Migration: add_embedding_metadata_and_free_tier
-- Adds embedding_model, embedded_at, and free_tier_note columns to tools
-- Creates index on embedding_model
-- Updates hybrid_search_tools to return free_tier_note and embedding_model

ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS embedding_model text DEFAULT 'text-embedding-3-small',
  ADD COLUMN IF NOT EXISTS embedded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS free_tier_note text;

CREATE INDEX IF NOT EXISTS tools_embedding_model_idx ON public.tools(embedding_model);

-- Refresh hybrid_search_tools to include free_tier_note and embedding_model
DROP FUNCTION IF EXISTS public.hybrid_search_tools(text, vector, int, float, text, text[], text[], text[], text, text, boolean, text, int, text[], text, text, int);

CREATE OR REPLACE FUNCTION public.hybrid_search_tools(
  search_query text DEFAULT NULL,
  query_embedding vector(1536) DEFAULT NULL,
  match_limit int DEFAULT 24,
  rrf_k float DEFAULT 60.0,
  filter_category text DEFAULT NULL,
  filter_subcategories text[] DEFAULT NULL,
  filter_languages text[] DEFAULT NULL,
  filter_frameworks text[] DEFAULT NULL,
  filter_license text DEFAULT NULL,
  filter_pricing text DEFAULT NULL,
  filter_self_hostable boolean DEFAULT NULL,
  filter_type text DEFAULT NULL,
  filter_min_stars int DEFAULT NULL,
  filter_tags text[] DEFAULT NULL,
  filter_maintenance text DEFAULT NULL,
  sort_by text DEFAULT 'best',
  page_offset int DEFAULT 0
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
  install_command text,
  npm_package text,
  embedding_model text,
  free_tier_note text,
  rrf_score float
) AS $$
DECLARE
  clean_query text;
  web_tsquery tsquery;
  plain_tsquery tsquery;
  has_search boolean;
BEGIN
  clean_query := trim(coalesce(search_query, ''));
  has_search := (length(clean_query) > 0);

  IF has_search THEN
    BEGIN
      web_tsquery := websearch_to_tsquery('english', clean_query);
    EXCEPTION WHEN OTHERS THEN
      web_tsquery := NULL;
    END;

    BEGIN
      plain_tsquery := plainto_tsquery('english', clean_query);
    EXCEPTION WHEN OTHERS THEN
      plain_tsquery := NULL;
    END;
  END IF;

  RETURN QUERY
  WITH filtered_tools AS (
    SELECT t.*
    FROM public.tools t
    WHERE
      (filter_category IS NULL OR filter_category = '' OR filter_category = 'all' OR lower(t.category) = lower(filter_category))
      AND (filter_subcategories IS NULL OR filter_subcategories = '{}' OR t.subcategories && filter_subcategories)
      AND (filter_languages IS NULL OR filter_languages = '{}' OR t.languages && filter_languages)
      AND (filter_frameworks IS NULL OR filter_frameworks = '{}' OR t.frameworks && filter_frameworks)
      AND (
        filter_license IS NULL OR filter_license = '' OR filter_license = 'all'
        OR (filter_license = 'any-oss' AND t.license NOT IN ('Proprietary', 'Commercial', 'None', 'Unknown'))
        OR t.license ILIKE '%' || filter_license || '%'
      )
      AND (filter_pricing IS NULL OR filter_pricing = '' OR filter_pricing = 'all' OR lower(coalesce(t.pricing, 'open source')) = lower(filter_pricing))
      AND (filter_self_hostable IS NULL OR coalesce(t.self_hostable, false) = filter_self_hostable)
      AND (filter_type IS NULL OR filter_type = '' OR filter_type = 'all' OR lower(coalesce(t.type, 'repo')) = lower(filter_type))
      AND (filter_min_stars IS NULL OR coalesce(t.stars, 0) >= filter_min_stars)
      AND (filter_tags IS NULL OR filter_tags = '{}' OR t.tags @> filter_tags)
      AND (
        filter_maintenance IS NULL OR filter_maintenance = '' OR filter_maintenance = 'all'
        OR (filter_maintenance = 'active' AND t.last_commit_date >= now() - interval '90 days')
        OR (filter_maintenance = 'slowing' AND t.last_commit_date < now() - interval '90 days' AND t.last_commit_date >= now() - interval '365 days')
        OR (filter_maintenance = 'abandoned' AND (t.last_commit_date < now() - interval '365 days' OR t.last_commit_date IS NULL))
      )
  ),
  fts_ranks AS (
    SELECT
      ft.id,
      ROW_NUMBER() OVER (
        ORDER BY GREATEST(
          CASE WHEN web_tsquery IS NOT NULL THEN ts_rank_cd(ft.fts, web_tsquery) ELSE 0 END,
          CASE WHEN plain_tsquery IS NOT NULL THEN ts_rank_cd(ft.fts, plain_tsquery) ELSE 0 END
        ) DESC
      ) AS rank
    FROM filtered_tools ft
    WHERE has_search AND (
      (web_tsquery IS NOT NULL AND ft.fts @@ web_tsquery)
      OR (plain_tsquery IS NOT NULL AND ft.fts @@ plain_tsquery)
    )
    LIMIT 60
  ),
  trgm_ranks AS (
    SELECT
      ft.id,
      ROW_NUMBER() OVER (
        ORDER BY GREATEST(
          similarity(coalesce(ft.name, ft.title), clean_query),
          similarity(coalesce(ft.description, ''), clean_query),
          similarity(coalesce(ft.slug, ''), clean_query),
          CASE WHEN ft.title ILIKE '%' || clean_query || '%' THEN 0.8 ELSE 0 END,
          CASE WHEN ft.slug ILIKE '%' || clean_query || '%' THEN 0.9 ELSE 0 END
        ) DESC
      ) AS rank
    FROM filtered_tools ft
    WHERE has_search AND (
      (coalesce(ft.name, ft.title) % clean_query)
      OR (coalesce(ft.description, '') % clean_query)
      OR (ft.title ILIKE '%' || clean_query || '%')
      OR (ft.slug ILIKE '%' || clean_query || '%')
      OR (ft.tags @> ARRAY[clean_query])
    )
    LIMIT 60
  ),
  vector_ranks AS (
    SELECT
      ft.id,
      ROW_NUMBER() OVER (ORDER BY ft.embedding <=> query_embedding ASC) AS rank
    FROM filtered_tools ft
    WHERE has_search
      AND query_embedding IS NOT NULL
      AND ft.embedding IS NOT NULL
      AND 1 - (ft.embedding <=> query_embedding) > 0.15
    LIMIT 60
  ),
  combined_ids AS (
    SELECT fts_ranks.id AS id FROM fts_ranks
    UNION
    SELECT trgm_ranks.id AS id FROM trgm_ranks
    UNION
    SELECT vector_ranks.id AS id FROM vector_ranks
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
    ft.id,
    ft.title,
    ft.name,
    ft.slug,
    ft.type,
    ft.category,
    ft.subcategories,
    ft.description,
    ft.use_cases,
    ft.tags,
    ft.languages,
    ft.frameworks,
    ft.runtime,
    ft.deploy_targets,
    ft.license,
    ft.pricing,
    ft.self_hostable,
    ft.maturity,
    ft.last_commit_date,
    ft.stars,
    ft.open_issues,
    ft.likes_count,
    ft.security_grade,
    ft.url,
    ft.created_at,
    ft.install_command,
    ft.npm_package,
    ft.embedding_model,
    ft.free_tier_note,
    CASE WHEN has_search THEN COALESCE(s.rrf_score, 0.0) ELSE 1.0 END AS rrf_score
  FROM filtered_tools ft
  LEFT JOIN scored s ON ft.id = s.id
  WHERE (NOT has_search) OR s.id IS NOT NULL
  ORDER BY
    CASE WHEN has_search THEN s.rrf_score END DESC NULLS LAST,
    CASE WHEN sort_by = 'stars_desc' THEN ft.stars END DESC NULLS LAST,
    CASE WHEN sort_by = 'stars_asc' THEN ft.stars END ASC NULLS LAST,
    CASE WHEN sort_by = 'updated' THEN ft.last_commit_date END DESC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN ft.created_at END DESC NULLS LAST,
    ft.likes_count DESC,
    ft.stars DESC
  LIMIT match_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql STABLE;
