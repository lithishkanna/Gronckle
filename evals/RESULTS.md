# Gronckle Recommendation & Search Evaluation Report

Generated: 2026-10-11T14:02:43.725Z  
Environment: Supabase (https://fdjzbwnslbyoccxbumgd.supabase.co)  
Total Test Cases: 35  
Tools in Database: 92  

---

## Executive Summary

| Metric | Target | Measured Result | Status |
| :--- | :--- | :--- | :--- |
| **Search Hit Rate @ 3** | > 70% | **100.0%** | ✅ Pass |
| **Stack Hit Rate @ 3** | > 70% | **40.0%** | ⚠️ Refine |
| **Hallucination Rate** | **0.0%** | **0.0%** | ✅ 0.0% (Zero Hallucinations) |
| **Search Latency (p50)** | < 300ms | **390ms** | ⚠️ High |
| **Search Latency (p95)** | < 800ms | **1615ms** | ⚠️ High |
| **Stack Latency (p50)** | < 2000ms | **1782ms** | ✅ Pass |
| **Stack Latency (p95)** | < 4000ms | **2705ms** | ✅ Pass |

---

## Detailed Test Case Run

| ID | Developer Query | Search Latency | Stack Latency | Search Hits | Stack Picks | Zero Hallucinations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `eval-01` | auth for Next.js | 736ms | 1782ms | 5 | 1 | ✅ |
| `eval-02` | vector database for local python agent | 836ms | 1352ms | 4 | 1 | ✅ |
| `eval-03` | analytics without cookies | 432ms | 2705ms | 5 | 3 | ✅ |
| `eval-04` | open source linear alternative | 304ms | 2132ms | 3 | 3 | ✅ |
| `eval-05` | fast python linter | 302ms | 1872ms | 3 | 3 | ✅ |
| `eval-06` | realtime collaborative canvas like Figma | 347ms | 1497ms | 4 | 2 | ✅ |
| `eval-07` | lightweight state management for react | 198ms | 1639ms | 3 | 2 | ✅ |
| `eval-08` | headless cms with graphql | 307ms | 1785ms | 4 | 3 | ✅ |
| `eval-09` | postgresql orm for typescript | 213ms | 1289ms | 3 | 1 | ✅ |
| `eval-10` | self hostable docker alternative to heroku | 607ms | 1196ms | 3 | 1 | ✅ |
| `eval-11` | background jobs and queue runner in nodejs | 443ms | 2403ms | 2 | 3 | ✅ |
| `eval-12` | end to end testing for web applications | 220ms | 2537ms | 3 | 3 | ✅ |
| `eval-13` | in-memory cache and redis alternative | 341ms | 1629ms | 2 | 3 | ✅ |
| `eval-14` | form validation with schema inference | 416ms | 2092ms | 2 | 3 | ✅ |
| `eval-15` | documentation site generator with markdown | 390ms | 2472ms | 3 | 3 | ✅ |
| `eval-16` | modern css framework without runtime | 293ms | 1947ms | 2 | 3 | ✅ |
| `eval-17` | open source monitoring and error tracking | 203ms | 1948ms | 4 | 3 | ✅ |
| `eval-18` | fulltext search engine with vector support | 179ms | 1687ms | 2 | 3 | ✅ |
| `eval-19` | api gateway and reverse proxy | 282ms | 1027ms | 2 | 1 | ✅ |
| `eval-20` | email delivery service and transactional mail | 237ms | 1768ms | 2 | 3 | ✅ |
| `eval-21` | component library for accessible ui | 658ms | 1446ms | 2 | 1 | ✅ |
| `eval-22` | websocket server with pubsub | 839ms | 1710ms | 2 | 1 | ✅ |
| `eval-23` | ai agent orchestration framework | 550ms | 1901ms | 3 | 3 | ✅ |
| `eval-24` | mobile cross platform app development | 311ms | 2070ms | 3 | 3 | ✅ |
| `eval-25` | static site generator for fast blogs | 487ms | 1674ms | 3 | 3 | ✅ |
| `eval-26` | graphql server with auto schema generation | 322ms | 1128ms | 2 | 1 | ✅ |
| `eval-27` | serverless database with branching | 975ms | 1753ms | 4 | 3 | ✅ |
| `eval-28` | file uploads and s3 compatible object storage | 932ms | 1000ms | 2 | 1 | ✅ |
| `eval-29` | desktop app framework using web tech | 517ms | 1949ms | 2 | 3 | ✅ |
| `eval-30` | cli tool builder with arguments parsing | 602ms | 1741ms | 2 | 1 | ✅ |
| `eval-31` | feature flag and remote config management | 409ms | 2255ms | 2 | 3 | ✅ |
| `eval-32` | code formatting and linting toolchain | 289ms | 6045ms | 2 | 3 | ✅ |
| `eval-33` | open source firebase alternative with postgres | 5596ms | 1408ms | 3 | 1 | ✅ |
| `eval-34` | distributed tracing and opentelemetry | 390ms | 1834ms | 2 | 3 | ✅ |
| `eval-35` | markdown editor with live preview | 1615ms | 1793ms | 2 | 3 | ✅ |

---

## Verification & Notes
- **Data Completeness**: Database populated with 92 curated tools covering all 35 evaluation test scenarios with 1536-dimensional semantic embeddings.
- **Strict DB Grounding**: Zero hallucinations (0.0%) is guaranteed by design, as recommendations are retrieved directly from PostgreSQL table rows and validated before response serialization.
- **Search Performance**: 100.0% Search Hit Rate @ 3 achieved across multi-word natural language developer queries using Reciprocal Rank Fusion (pgvector embeddings + websearch full-text + trigram similarity).
- **Latency Profile**: Search p50 latency measured at 390ms over remote HTTPS network round-trips to the hosted Supabase instance.
