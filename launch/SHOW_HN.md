# 📰 Hacker News Launch: Show HN Copy

---

## 📌 Submission Title Options

- **Option A (Recommended):** `Show HN: Gronckle – The lazy dragon's vault of underrated developer tools`
- **Option B:** `Show HN: Gronckle – AI tech stack architect with pgvector similarity search`
- **Option C:** `Show HN: I built an AI tool recommender with React 19, Supabase, and Deno edge functions`

---

## 📝 Post Text Body

Hi HN,

I built Gronckle (https://gronckle.dev), a curated vault of underrated developer tools and open-source repositories, paired with an AI architect that generates complete tech stacks from natural language prompts.

### Why I built this:
Finding modern developer tools is increasingly dominated by marketing budgets and influencer hype. Genuinely great tools (lightweight ORMs, niche testing libraries, fast local dev servers, unbundled build utilities) frequently get drowned out.

I wanted something with personality: a lazy baby dragon ("Gronckle") who sleeps on a hoard of curated repositories. He is too lazy to search because he already knows what tools fit your architectural constraints.

### How it works under the hood:
1. **The Forge (AI Stack Architect):** You input a description of what you're building (e.g. *"real-time collaborative canvas with zero-latency sync"*). A Deno Edge Function analyzes the prompt using Claude / GPT, matches candidate tools from our PostgreSQL database, and outputs:
   - A primary tool recommendation with deep architectural reasoning
   - A full stack breakdown (Frontend, Backend, DB, Auth, Deploy)
   - Copy-paste setup commands
   - One-click export to a working `package.json` or formatted `README.md`
2. **Vector Similarity (pgvector):** We use OpenAI `text-embedding-3-small` with the PostgreSQL `pgvector` extension to calculate cosine distance `1 - (embedding <=> query_embedding)`. This surfaces "Similar Stacks" that share architectural philosophy rather than just literal keyword matches.
3. **GitHub API Proxy with Redis Caching:** Fetching live stars for hundreds of repos quickly exhausts unauthenticated GitHub rate limits (60 req/hr). We built a batched `github-proxy` Edge Function backed by Upstash Redis (1 hr TTL) with in-memory caching fallback.
4. **Community Submissions & Crowdsourced Flags:** Developers can submit unheralded GitHub repos with upvoting and flag outdated/deprecated repositories.
5. **Client-Side Stack:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS, Framer Motion, and a lightweight custom beacon for PostHog & Sentry that respects `Do Not Track`.

The project is completely open source under the MIT license:  
https://github.com/lithish/gronckle

I would love HN’s feedback on the recommendations, UI, and edge function architecture. What underrated libraries deserve a spot in the vault?
