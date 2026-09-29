# 🤖 Reddit Launch Kit: Targeted Subreddit Posts

---

## 1. `r/webdev` (Educational / Architecture Angle)

**Title:** `I built an open-source tool that designs full tech stacks from prompt descriptions (React 19 + Supabase + pgvector)`

**Body:**
Hey r/webdev!

Whenever starting a new side project or client build, picking the right combination of tools is often the hardest part—not because options are scarce, but because most popular recommendations are dominated by whatever is trending on Twitter.

To fix this, I spent the last few months building **Gronckle** (https://gronckle.dev).

### Features:
- **The Forge:** Enter a project description and an AI Edge Function matches tools from our database, providing architectural reasoning, category breakdowns, and exportable `package.json` / `README.md`.
- **Similar Stacks via pgvector:** Cosine distance semantic similarity across repositories.
- **The Source:** Live star counts and metadata via batched Redis caching.
- **Developer UX:** Global `Cmd+K` palette, pure black dark mode, and a lazy dragon mascot who yawns on mount and blinks on hover.

### Tech Stack:
- React 19 + TypeScript + Vite 7
- Supabase (PostgreSQL with pgvector + GitHub OAuth)
- Deno Edge Functions
- Tailwind CSS with custom `#FF6B2B` ember glow

The code is 100% open source under the MIT License:  
https://github.com/lithish/gronckle

Would love to hear your thoughts, feedback, and any underrated libraries you think should be added!

---

## 2. `r/SideProject` (Founder / Maker Angle)

**Title:** `Gronckle: The lazy dragon's vault of underrated developer tools and AI stack architect [Open Source]`

**Body:**
Hey makers!

I got tired of digging through the same 10 hyped developer libraries for every new project, so I made **Gronckle** (https://gronckle.dev).

The concept: a sleepy baby dragon who hoards the best open-source repositories and is too lazy to search because he already knows what stack fits your requirements.

You can:
1. Describe your idea $\rightarrow$ Get an instant stack with setup terminal commands.
2. Export your dependencies directly to `package.json`.
3. Discover hidden repositories with live star counts.
4. Upvote community-submitted tools.

Check it out live: https://gronckle.dev  
GitHub: https://github.com/lithish/gronckle

Let me know what you think!

---

## 3. `r/InternetIsBeautiful` (Playful & Delightful Angle)

**Title:** `Gronckle: A sleepy dragon that curates hidden open-source tools and builds tech stacks for you`

**Body:**
If you build things for the web, here is a delightful, pure-black themed tool: https://gronckle.dev

Gronckle is an animated dragon that rests on top of a vault of underrated developer repositories. You can ask him to architect a stack for whatever you want to build, search through tools with a retro terminal, or browse community finds.

It has subtle animations (he breathes slowly, yawns when loading, and opens his glowing ember eye when you hover over him).

Completely free and open-source!
