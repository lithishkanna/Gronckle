-- tools
CREATE TABLE IF NOT EXISTS tools (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  url text NOT NULL,
  tags text[] DEFAULT '{}'::text[],
  likes_count int8 DEFAULT 0,
  security_grade text DEFAULT '',
  created_at timestamp with time zone DEFAULT now()
);

-- repos
CREATE TABLE IF NOT EXISTS repos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner text NOT NULL,
  repo text NOT NULL,
  description text NOT NULL,
  stars int8 DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- news
CREATE TABLE IF NOT EXISTS news (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  headline text NOT NULL,
  url text NOT NULL,
  date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- inbox
CREATE TABLE IF NOT EXISTS inbox (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Realtime for tools
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tools'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tools;
  END IF;
END $$;

-- pg_trgm and GIN index
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS tools_title_trgm_idx ON tools USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tools_description_trgm_idx ON tools USING GIN (description gin_trgm_ops);

-- Fuzzy search RPC
CREATE OR REPLACE FUNCTION fuzzy_search_tools(search_term text)
RETURNS SETOF tools AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tools
  WHERE title % search_term OR description % search_term
  ORDER BY GREATEST(similarity(title, search_term), similarity(description, search_term)) DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger for likes
CREATE OR REPLACE FUNCTION broadcast_likes_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'likes_channel',
    json_build_object('tool_id', NEW.id, 'likes_count', NEW.likes_count)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS likes_update_trigger ON tools;
CREATE TRIGGER likes_update_trigger
AFTER UPDATE OF likes_count ON tools
FOR EACH ROW
WHEN (OLD.likes_count IS DISTINCT FROM NEW.likes_count)
EXECUTE FUNCTION broadcast_likes_update();
