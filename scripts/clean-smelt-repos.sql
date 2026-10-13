-- SQL script to remove CLI / non-web repos from the tools table in Smelt
DELETE FROM public.tools 
WHERE slug IN (
  'lnav', 'watchexec', 'tealdeer', 'dekit', 'gatus', 'dozzle', 'dagu', 
  'kubeconform', 'pgcli', 'litecli', 'litestream', 'dbmate', 'visidata', 
  'miller', 'datasette', 'zizmor', 'scorecard', 'osv-scanner', 'knip', 
  'open-props', 'schemathesis', 'oha', 'prism', 'mockoon', 'adr-tools', 
  'lychee', 'vale', 'tbls', 'llm', 'files-to-prompt'
) OR type = 'repo';
