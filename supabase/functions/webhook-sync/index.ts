import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN') || '';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || 'default-secret';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RepoRow {
  id: string;
  owner: string;
  repo: string;
  stars: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const secret = req.headers.get('x-webhook-secret');
  if (secret !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: repos, error: fetchError } = await supabase
      .from('repos')
      .select('id, owner, repo, stars');

    if (fetchError) throw fetchError;
    const repoList = (repos || []) as RepoRow[];

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'StackForge-Gronckle-Webhook',
    };
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < repoList.length; i += 10) {
      const batch = repoList.slice(i, i + 10);
      await Promise.all(batch.map(async (r) => {
        try {
          const res = await fetch(`https://api.github.com/repos/${r.owner}/${r.repo}`, { headers });
          if (!res.ok) { failed++; return; }
          const ghData = await res.json();
          
          await supabase.from('repos').update({
            stars: ghData.stargazers_count,
          }).eq('id', r.id);
          updated++;
        } catch {
          failed++;
        }
      }));
      if (i + 10 < repoList.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total: repoList.length,
      updated,
      failed,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
