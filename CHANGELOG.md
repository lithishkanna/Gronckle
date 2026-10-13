# Changelog

All notable changes to Gronckle will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-13

### Added
- **Zero Hallucination Recommendation Pipeline**: Grounded strictly in database entries with structured reasoning, alternative fallbacks, license compatibility checks, and missing architectural layer detection.
- **Unified LLM Adapter**: Provider-agnostic engine supporting OpenAI (`gpt-4o-mini`) and Google Gemini (`gemini-1.5-flash`), featuring strict JSON schema validation, 8s timeouts, single retry, delimiter protection against prompt injection, and BYOK (Bring Your Own Key).
- **Preset Re-Ranking**: 5 instant architectural presets:
  - *Balanced*: optimal blend of maintenance, maturity, and license.
  - *Cheapest*: prioritizes free and open-source stacks with lowest tier costs.
  - *Fastest to ship*: prioritizes developer velocity, batteries-included services, and managed DX.
  - *Fully open source*: enforces permissive and non-proprietary licenses.
  - *Most mature*: favors battle-tested, high-adoption tooling.
- **Underrated Score**: Proprietary metric computing quality-to-popularity ratio to surface high-velocity developer tools before they become mainstream incumbents.
- **Cost Estimation**: Estimates monthly expenditure across *Hobby* ($0/mo), *Startup*, and *Large* scale tiers with parsed free-tier rules.
- **Export Utilities**: Export full stack to Mermaid architecture diagrams, production `package.json`, generated `README.md`, or one-line terminal install commands.
- **Repository Dependency Analyzer**: Scans GitHub repositories or pasted package manifests (`package.json`, `requirements.txt`, `go.mod`), detects bloated or deprecated dependencies, and suggests modern Gronckle alternatives.
- **Tool Comparison & Badges**: Side-by-side comparison modal with trade-off analysis ("Why Switch") and embeddable SVG Markdown badges.
- **Atomic Likes RPC**: Replaced client-side read-modify-write with Postgres `increment_tool_likes` and `decrement_tool_likes` functions.
- **Evaluation Suite**: 35 standard cases and 18 held-out generalization cases with automatic latency, hit rate, and hallucination tracking.
- **Bundle Optimization**: Rollup manual chunking reducing initial bundle footprint from 740 kB to 208 kB (gzip: ~60 kB).

### Security & Hardening
- Parameterized and sanitized PostgREST `.or(...)` query inputs to eliminate injection vectors and filter syntax errors.
- Confirmed zero exposure of Supabase `service_role` keys in client code.
- XML delimiter encapsulation protecting LLM prompts against prompt injection.
