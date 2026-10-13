
INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'tstack',
  'lnav',
  'Terminal log viewer that merges, parses and lets you query log files with SQL and live filtering, no setup needed.',
  10600,
  'tooling',
  '{"command-line-tool","less","log-analysis","log-viewer","logging","pager","tail","terminal"}',
  'Most people still grep and tail logs by hand.',
  'https://github.com/tstack/lnav',
  'BSD-2-Clause',
  '{"C++"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'watchexec',
  'watchexec',
  'Reruns a command whenever files change, replacing ad-hoc nodemon or entr setups in any language.',
  7200,
  'tooling',
  '{"command-line","developer-tools","file-watchers","rust"}',
  'Overshadowed by language-specific watchers.',
  'https://github.com/watchexec/watchexec',
  'Apache-2.0',
  '{"Rust"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'tealdeer-rs',
  'tealdeer',
  'Very fast tldr client that shows short practical examples for CLI commands instead of long man pages.',
  6600,
  'tooling',
  '{"rust","tldr","cli","productivity"}',
  'Many devs never heard of tldr, let alone a fast client.',
  'https://github.com/tealdeer-rs/tealdeer',
  'Apache-2.0 / MIT',
  '{"Rust"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'pvolok',
  'dekit',
  'Runs and monitors several dev processes in one TUI with per-process logs, replacing a pile of terminal tabs.',
  2700,
  'tooling',
  '{"cli","rust","terminal","tui","process-manager"}',
  'Docker compose and tmux get all the attention.',
  'https://github.com/pvolok/dekit',
  'MIT',
  '{"Rust"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'TwiN',
  'gatus',
  'Config-as-code status page and uptime monitor with alerting that you can self-host in one container.',
  12300,
  'devops',
  '{"alerting","monitoring","self-hosted","status-page","uptime-monitoring","go"}',
  'Overshadowed by Uptime Kuma.',
  'https://github.com/TwiN/gatus',
  'Apache-2.0',
  '{"Go"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'amir20',
  'dozzle',
  'Lightweight real-time web viewer for Docker, Swarm and Kubernetes container logs with no storage needed.',
  14100,
  'devops',
  '{"docker","k8s","log","logging","real-time","swarm"}',
  'Many people run heavy logging stacks when this suffices.',
  'https://github.com/amir20/dozzle',
  'MIT',
  '{"Go","Vue"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'dagucloud',
  'dagu',
  'Self-hosted workflow orchestrator that runs YAML-defined DAGs over existing scripts, SSH and containers without Airflow''s weight.',
  4300,
  'devops',
  '{"cron","dag","data-pipeline","job-scheduler","self-hosted","workflow-engine"}',
  'Airflow alternative few people know about.',
  'https://github.com/dagucloud/dagu',
  'GPL-3.0',
  '{"Go"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'yannh',
  'kubeconform',
  'Fast validator for Kubernetes manifests, including CRDs, to catch bad YAML in CI before deploy.',
  3200,
  'devops',
  '{"compliance","kubernetes","validation","ci"}',
  'Quiet CI tool that replaced kubeval.',
  'https://github.com/yannh/kubeconform',
  'Apache-2.0',
  '{"Go"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'dbcli',
  'pgcli',
  'Postgres client with autocompletion and syntax highlighting that makes psql feel modern.',
  13300,
  'database',
  '{"python","postgres","postgresql","psql","cli"}',
  'Plenty of devs live in plain psql.',
  'https://github.com/dbcli/pgcli',
  'BSD-3-Clause',
  '{"Python"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'dbcli',
  'litecli',
  'SQLite command-line client with autocompletion and highlighting, like pgcli for SQLite.',
  3300,
  'database',
  '{"prompt-toolkit","python","sqlite","syntax-highlighting","cli"}',
  'The sqlite3 shell is what most people use.',
  'https://github.com/dbcli/litecli',
  'BSD-3-Clause',
  '{"Python"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'benbjohnson',
  'litestream',
  'Continuously streams SQLite changes to S3-style storage so a single-file DB gets real backups and recovery.',
  14400,
  'database',
  '{"replication","s3","sqlite","backup"}',
  'Makes SQLite production-viable but is little known.',
  'https://github.com/benbjohnson/litestream',
  'Apache-2.0',
  '{"Go"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'amacneil',
  'dbmate',
  'Single-binary, framework-agnostic SQL migration tool that works across many databases and languages.',
  7300,
  'database',
  '{"database-migrations","go","migration","postgres","mysql","sqlite"}',
  'Overlooked next to framework-specific migrators.',
  'https://github.com/amacneil/dbmate',
  'MIT',
  '{"Go"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'saulpw',
  'visidata',
  'Terminal spreadsheet multitool for exploring, cleaning and reshaping CSV, JSON, SQLite and more.',
  9200,
  'data',
  '{"python","cli","csv","json","sqlite","tui","spreadsheet","eda"}',
  'Most reach for Excel or pandas for quick looks.',
  'https://github.com/saulpw/visidata',
  'GPL-3.0',
  '{"Python"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'johnkerl',
  'miller',
  'Awk/sed/sort-like tool for name-indexed data such as CSV, TSV and JSON, using field names instead of column numbers.',
  10000,
  'data',
  '{"command-line-tools","csv","json","tsv","data-processing","unix-toolkit"}',
  'Unknown outside data-wrangling circles.',
  'https://github.com/johnkerl/miller',
  'BSD-2-Clause',
  '{"Go"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'simonw',
  'datasette',
  'Turns SQLite databases into a browsable, queryable web app with a JSON API and a large plugin ecosystem.',
  11400,
  'data',
  '{"csv","datasets","json","sql","sqlite","python"}',
  'Instant data publishing that few developers have tried.',
  'https://github.com/simonw/datasette',
  'Apache-2.0',
  '{"Python"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'zizmorcore',
  'zizmor',
  'Static analyzer that finds security problems in GitHub Actions workflows such as injections and risky permissions.',
  6700,
  'security',
  '{"github-actions","security","security-tools","static-analysis","audit"}',
  'Most teams never audit their CI workflows.',
  'https://github.com/zizmorcore/zizmor',
  'MIT',
  '{"Rust"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'ossf',
  'scorecard',
  'Scores open-source projects and dependencies on security practices to judge risk before adopting them.',
  5700,
  'security',
  '{"openssf-scorecard","scorecard","security","supply-chain"}',
  'Rarely used when choosing dependencies.',
  'https://github.com/ossf/scorecard',
  'Apache-2.0',
  '{"Go"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'google',
  'osv-scanner',
  'Scans lockfiles and SBOMs against the OSV vulnerability database to find known vulnerable dependencies.',
  11000,
  'security',
  '{"scanner","security-audit","security-tools","vulnerability-scanner"}',
  'Free multi-ecosystem scanner overshadowed by commercial tools.',
  'https://github.com/google/osv-scanner',
  'Apache-2.0',
  '{"Go"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'webpro-nl',
  'knip',
  'Finds unused files, dependencies and exports in JS/TS projects so you can delete dead code.',
  12300,
  'frontend',
  '{"deadcode","dependency-analysis","linter","typescript","unused-code"}',
  'Dead-code cleanup is rarely automated.',
  'https://github.com/webpro-nl/knip',
  'ISC',
  '{"TypeScript"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'argyleink',
  'open-props',
  'Ready-made CSS custom properties for colors, spacing, easing and more to get consistent styling without a framework.',
  5500,
  'frontend',
  '{"css","css-custom-properties","css-colors","css-gradients"}',
  'Tailwind dominates the conversation.',
  'https://github.com/argyleink/open-props',
  'MIT',
  '{"CSS"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'schemathesis',
  'schemathesis',
  'Property-based API tester that fuzzes OpenAPI and GraphQL schemas to find crashes and spec violations automatically.',
  3600,
  'backend',
  '{"api-testing","fuzzing","graphql","openapi","property-based-testing","pytest"}',
  'Finds bugs that hand-written API tests miss.',
  'https://github.com/schemathesis/schemathesis',
  'MIT',
  '{"Python","Rust"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'hatoo',
  'oha',
  'HTTP load generator with a live terminal UI, a friendlier take on hey and wrk.',
  10600,
  'backend',
  '{"benchmark","cli","http","load-testing","rust","tui"}',
  'Most devs never load-test locally.',
  'https://github.com/hatoo/oha',
  'MIT',
  '{"Rust"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'stoplightio',
  'prism',
  'Spins up a mock API server from an OpenAPI or Postman file and can validate requests against the spec.',
  5000,
  'backend',
  '{"api-testing","mock-server","openapi","postman-collection","cli"}',
  'Frontend teams still hand-roll mock servers.',
  'https://github.com/stoplightio/prism',
  'Apache-2.0',
  '{"TypeScript"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'mockoon',
  'mockoon',
  'Local mock API server with a desktop app and CLI, needing no account or remote deployment.',
  8400,
  'backend',
  '{"mock-api","mock-server","openapi","rest-api","electron"}',
  'Lesser known than Postman mocks.',
  'https://github.com/mockoon/mockoon',
  'MIT',
  '{"TypeScript"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'npryce',
  'adr-tools',
  'Command-line helpers for creating and managing Architecture Decision Records in a repo.',
  5700,
  'documentation',
  '{"architecture","architecture-decision-records","documentation","markdown"}',
  'Most teams never record why decisions were made.',
  'https://github.com/npryce/adr-tools',
  'MIT',
  '{"Shell"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'lycheeverse',
  'lychee',
  'Fast async link checker for Markdown, HTML and websites that catches broken links in CI.',
  4000,
  'documentation',
  '{"broken-links","ci","documentation","markdown"}',
  'Broken docs links are everywhere and checkers are rare.',
  'https://github.com/lycheeverse/lychee',
  'Apache-2.0 / MIT',
  '{"Rust"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'vale-cli',
  'vale',
  'Markup-aware prose linter that enforces style guides on docs, so documentation gets CI checks like code.',
  6200,
  'documentation',
  '{"linter","linting","vale","documentation","markdown"}',
  'Docs-as-code linting is new to most devs.',
  'https://github.com/vale-cli/vale',
  'MIT',
  '{"Go"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'k1LoW',
  'tbls',
  'CI-friendly tool that generates database schema docs and ER diagrams from a live DB.',
  4400,
  'documentation',
  '{"database-schema","er-diagram","markdown","mermaid","postgresql","mysql","sqlite"}',
  'Auto-generated schema docs are rare.',
  'https://github.com/k1LoW/tbls',
  'MIT',
  '{"Go"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'simonw',
  'llm',
  'CLI and Python library for running prompts against many LLMs, with logging to SQLite and a plugin system.',
  12400,
  'ai-ml',
  '{"ai","llms","openai","sqlite","cli"}',
  'A scriptable LLM CLI, overshadowed by chat UIs.',
  'https://github.com/simonw/llm',
  'Apache-2.0',
  '{"Python"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  

INSERT INTO public.repos (
  owner, repo, description, stars, category, tags, why_underrated, url, license, languages
) VALUES (
  'simonw',
  'files-to-prompt',
  'Concatenates a directory of files into one prompt for an LLM, handy for pasting code context.',
  2800,
  'ai-ml',
  '{"ai","llms","prompt-engineering","cli","developer-tools"}',
  'Tiny tool that solves a common prompt-building chore.',
  'https://github.com/simonw/files-to-prompt',
  'Apache-2.0',
  '{"Python"}'
)
ON CONFLICT (owner, repo) DO UPDATE SET
  description = EXCLUDED.description,
  stars = EXCLUDED.stars,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  why_underrated = EXCLUDED.why_underrated,
  url = EXCLUDED.url,
  license = EXCLUDED.license,
  languages = EXCLUDED.languages;
  