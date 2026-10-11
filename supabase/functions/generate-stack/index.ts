import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

interface Tool {
  id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  likes_count: number;
}

interface StackResult {
  tool: Tool;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  suggested_stack: Array<{ category: string; tool: string; reason: string }>;
  setup_commands: string[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${res.status} - ${err}`);
  }
  
  const data = await res.json();
  return data.content[0]?.text || '';
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} - ${err}`);
  }
  
  const data = await res.json();
  return data.choices[0]?.message?.content || '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query } = await req.json() as { query: string };
    
    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch available tools from DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: tools } = await supabase
      .from('tools')
      .select('id, title, description, url, tags, likes_count')
      .order('likes_count', { ascending: false })
      .limit(50);

    const toolsList = (tools || []) as Tool[];
    const toolsSummary = toolsList.map(t => 
      `- ${t.title}: ${t.description} [Tags: ${t.tags.join(', ')}] (${t.likes_count} likes)`
    ).join('\n');

    const systemPrompt = `You are StackForge, an expert developer tool recommender. You help developers find the perfect tech stack for their projects.

You have access to the following curated tools database:
${toolsSummary}

When a user describes their project, you must:
1. Recommend the BEST matching tool from the database above as the primary recommendation
2. Explain WHY this tool fits their needs (2-3 sentences, be specific and technical)
3. Rate your confidence as "high", "medium", or "low"
4. Suggest a complete stack with categories (e.g., Framework, Database, Auth, Hosting, CSS)
5. Provide 3-5 terminal setup commands to get started

Respond ONLY with valid JSON in this exact format:
{
  "primary_tool_title": "exact title from database",
  "reasoning": "Your detailed explanation",
  "confidence": "high|medium|low",
  "suggested_stack": [
    { "category": "Framework", "tool": "Tool Name", "reason": "Why" },
    { "category": "Database", "tool": "Tool Name", "reason": "Why" }
  ],
  "setup_commands": ["npm create vite@latest ...", "npm install ..."]
}`;

    const userPrompt = `Project description: ${query.trim()}`;

    let llmResponse: string;
    
    // Try Claude first, fall back to OpenAI
    if (ANTHROPIC_API_KEY) {
      llmResponse = await callClaude(systemPrompt, userPrompt);
    } else if (OPENAI_API_KEY) {
      llmResponse = await callOpenAI(systemPrompt, userPrompt);
    } else {
      return new Response(JSON.stringify({ error: 'No LLM API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in Supabase Edge Function secrets.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse LLM response
    const jsonMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, llmResponse];
    const jsonStr = (jsonMatch[1] || llmResponse).trim();
    
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const fallbackTool = toolsList[0];
      parsed = {
        primary_tool_title: fallbackTool?.title || 'Unknown',
        reasoning: llmResponse.slice(0, 500),
        confidence: 'low',
        suggested_stack: [],
        setup_commands: [],
      };
    }

    // Match the primary tool from our database
    const matchedTool = toolsList.find(t => 
      t.title.toLowerCase() === (parsed.primary_tool_title || '').toLowerCase()
    ) || toolsList[0];

    const result: StackResult = {
      tool: matchedTool,
      reasoning: parsed.reasoning || 'No reasoning provided.',
      confidence: parsed.confidence || 'medium',
      suggested_stack: parsed.suggested_stack || [],
      setup_commands: parsed.setup_commands || [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
