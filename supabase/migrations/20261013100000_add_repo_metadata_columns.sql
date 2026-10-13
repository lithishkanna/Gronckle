-- Add metadata columns to repos table for category, tags, why_underrated, url, license, and languages
ALTER TABLE repos 
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS why_underrated text,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS license text,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}'::text[];

-- Unique constraint on (owner, repo) for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'repos_owner_repo_unique'
  ) THEN
    ALTER TABLE repos ADD CONSTRAINT repos_owner_repo_unique UNIQUE (owner, repo);
  END IF;
END $$;

-- Create an index for category
CREATE INDEX IF NOT EXISTS repos_category_idx ON repos (category);
