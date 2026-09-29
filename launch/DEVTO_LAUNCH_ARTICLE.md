---
title: "How I Built an AI Tech Stack Architect with pgvector, Deno Edge Functions, and a Lazy Dragon Mascot"
published: true
tags: webdev, react, showdev, opensource
cover_image: https://gronckle.dev/og-image.png
---

## The Problem With Modern Dev Discovery

Every week, a new JavaScript framework or CSS library goes viral on Twitter. But behind the hype, thousands of incredibly well-engineered, lightweight, and reliable open-source projects go largely unnoticed.

I wanted to build a platform that unearths these hidden gems and connects them into actionable tech stacks.

Meet **[Gronckle](https://gronckle.dev)** 🐉 — the lazy dragon who hoards the world's best developer repositories and recommends them with zero fuss.

---

## 🛠️ The Architecture

Building Gronckle required solving several distinct challenges:
1. **AI recommendation without hallucinations**
2. **Real-time GitHub star tracking without exhausting rate limits**
3. **Semantic tool similarity search**
4. **Delightful micro-interactions with pure-black aesthetics**

```
┌──────────────────────────────────────────────┐
│            React 19 + Vite Frontend          │
│   (Target Cursor, Cmd+K, Ember Glow Palette) │
└──────────────────────┬───────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌──────────────┐              ┌─────────────────┐
│ Supabase DB  │              │ Deno Edge Fns   │
│  - pgvector  │              │  - Proxy + Redis│
│  - OAuth     │              │  - AI Stack Gen │
│  - RLS       │              │  - Webhook Sync │
└──────────────┘              └─────────────────┘
```

---

## 1. Grounding LLM Recommendations in a Real Database

Common AI assistants often recommend deprecated packages or non-existent npm modules. In Gronckle's **The Forge**, the edge function injects our curated PostgreSQL tools database directly into the system prompt context:

```typescript
// Edge function: generate-stack/index.ts
const { data: tools } = await supabase
  .from('tools')
  .select('id, title, description, url, tags, likes_count')
  .order('likes_count', { ascending: false })
  .limit(50);

const toolsSummary = tools.map(t => 
  `- ${t.title}: ${t.description} [Tags: ${t.tags.join(', ')}]`
).join('\n');
```

The LLM is strictly instructed to pick a primary tool from the verified database, explain *why* it fits the user's architectural constraints, and construct a breakdown table with copy-paste terminal setup commands.

---

## 2. Semantic Similarity with `pgvector`

Keyword matching fails when a user wants *"a lightning fast key-value store"* and the tool is described as an *"in-memory data cache"*.

We enabled the `vector` extension in PostgreSQL and generated 1536-dimensional embeddings using OpenAI's `text-embedding-3-small`:

```sql
CREATE OR REPLACE FUNCTION match_tools(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (id uuid, title text, similarity float)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, 1 - (t.embedding <=> query_embedding) as similarity
  FROM tools t
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 3. Beating the GitHub API Rate Limit

Unauthenticated GitHub API requests are capped at 60 requests per hour. If 10 visitors load a page displaying 30 repositories, the rate limit is burned in two minutes.

We built a batched `github-proxy` Edge Function:
1. Receives an array of `{ owner, repo }`
2. Checks in-memory cache first
3. Checks Upstash Redis (`EX 3600` TTL)
4. Fetches uncached items in parallel with a server-side `GITHUB_TOKEN` (5,000 req/hr)
5. Caches the response for all subsequent users.

---

## 4. The Lazy Dragon Mascot Micro-Interactions

Developer tools should be joyful. Gronckle isn't just a static logo:
- **Breathing animation:** A CSS scale cycle simulating slow sleeping breaths.
- **Eye tracking:** The eye is closed by default; hovering over the mascot causes the eye to flicker open revealing the warm `#FF6B2B` ember iris.
- **Yawn on load:** When opening the page, the mascot stretches and rotates before settling in.

---

## Try It & Contribute

Gronckle is 100% open source under the MIT License:
- **Live Demo:** [https://gronckle.dev](https://gronckle.dev)
- **GitHub Repository:** [https://github.com/lithish/gronckle](https://github.com/lithish/gronckle)

Let me know what you think in the comments!
