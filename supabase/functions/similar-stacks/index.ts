import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function getEmbedding(text: string): Promise<number[]> {
  if (!OPENAI_API_KEY) return [];
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI embedding error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tool_id, query, limit = 5 } = await req.json() as { tool_id?: string; query?: string; limit?: number };

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (tool_id) {
      const { data: sourceTool } = await supabase.from('tools').select('id, title, tags, embedding').eq('id', tool_id).single();
      if (!sourceTool) {
        return new Response(JSON.stringify({ error: 'Tool not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (sourceTool.embedding && OPENAI_API_KEY) {
        const { data: similar } = await supabase.rpc('match_tools', { query_embedding: sourceTool.embedding, match_threshold: 0.7, match_count: limit + 1 });
        const results = (similar || []).filter((t: { id: string }) => t.id !== tool_id).slice(0, limit);
        return new Response(JSON.stringify({ data: results, method: 'vector' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const tags = sourceTool.tags || [];
      const { data: allTools } = await supabase.from('tools').select('id, title, description, url, tags, likes_count').neq('id', tool_id).limit(50);
      const scored = (allTools || []).map((t: { id: string; tags: string[] }) => {
        const overlap = (t.tags || []).filter((tag: string) => tags.includes(tag)).length;
        return { ...t, score: overlap };
      }).filter(t => t.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
      return new Response(JSON.stringify({ data: scored, method: 'tags' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (query) {
      if (OPENAI_API_KEY) {
        try {
          const embedding = await getEmbedding(query);
          if (embedding.length > 0) {
            const { data: similar } = await supabase.rpc('match_tools', { query_embedding: embedding, match_threshold: 0.5, match_count: limit });
            if (similar && similar.length > 0) {
              return new Response(JSON.stringify({ data: similar, method: 'vector' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }
        } catch { /* fall through */ }
      }
      const { data: tools } = await supabase.from('tools').select('id, title, description, url, tags, likes_count').or(`title.ilike.%${query}%,description.ilike.%${query}%`).limit(limit);
      return new Response(JSON.stringify({ data: tools || [], method: 'keyword' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Provide tool_id or query' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
