-- Phase 1: Tool metadata fields for filters and matching
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'repo' CHECK (type IN ('repo', 'website', 'library', 'service')),
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS subcategories TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS use_cases TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS frameworks TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS runtime TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS deploy_targets TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS license TEXT DEFAULT 'MIT',
  ADD COLUMN IF NOT EXISTS pricing TEXT DEFAULT 'open source' CHECK (pricing IN ('open source', 'free tier', 'paid')),
  ADD COLUMN IF NOT EXISTS self_hostable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS maturity TEXT DEFAULT 'stable' CHECK (maturity IN ('alpha', 'beta', 'stable', 'mature', 'deprecated')),
  ADD COLUMN IF NOT EXISTS last_commit_date TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS stars BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_issues INT DEFAULT 0;

-- Backfill name from title if null
UPDATE public.tools SET name = title WHERE name IS NULL OR name = '';

-- Unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_tools_slug ON public.tools(slug) WHERE slug IS NOT NULL;

-- Full-text search column and trigger for automatic update
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS fts TSVECTOR;

CREATE OR REPLACE FUNCTION public.tools_update_fts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fts := to_tsvector('english',
    COALESCE(NEW.name, NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.category, '') || ' ' ||
    array_to_string(COALESCE(NEW.tags, '{}'), ' ') || ' ' ||
    array_to_string(COALESCE(NEW.use_cases, '{}'), ' ') || ' ' ||
    array_to_string(COALESCE(NEW.languages, '{}'), ' ') || ' ' ||
    array_to_string(COALESCE(NEW.frameworks, '{}'), ' ')
  );
  -- Keep name synced with title
  IF NEW.name IS NULL OR NEW.name = '' THEN
    NEW.name := NEW.title;
  END IF;
  IF NEW.title IS NULL OR NEW.title = '' THEN
    NEW.title := NEW.name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tools_fts ON public.tools;
CREATE TRIGGER trg_tools_fts
  BEFORE INSERT OR UPDATE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION public.tools_update_fts();

-- Update existing rows fts
UPDATE public.tools SET id = id;

-- Full-text index
CREATE INDEX IF NOT EXISTS idx_tools_fts ON public.tools USING GIN(fts);

-- Trigram indexes for typo tolerance
CREATE INDEX IF NOT EXISTS idx_tools_name_trgm ON public.tools USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tools_title_trgm ON public.tools USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tools_desc_trgm ON public.tools USING GIN(description gin_trgm_ops);

-- HNSW vector index on pgvector embedding for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_tools_embedding_hnsw ON public.tools USING hnsw (embedding vector_cosine_ops);
