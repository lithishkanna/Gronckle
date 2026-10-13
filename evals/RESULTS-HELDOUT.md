# Gronckle Recommendation & Search Evaluation Report (Held-Out Test Cases)

Generated: 2026-10-13T08:58:16.857Z  
Environment: Supabase (https://fdjzbwnslbyoccxbumgd.supabase.co)  
Suite: Held-Out (18 un-tuned test cases)  
Total Test Cases: 18  
Tools in Database: 92  

---

## Executive Summary

| Metric | Target | Measured Result | Status |
| :--- | :--- | :--- | :--- |
| **Search Hit Rate @ 3** | > 70% | **11.1%** | ⚠️ Refine |
| **Stack Hit Rate @ 3** | > 70% | **5.6%** | ⚠️ Refine |
| **Hallucination Rate** | **0.0%** | **0.0%** | ✅ 0.0% (Zero Hallucinations) |
| **Search Latency (p50)** | < 300ms | **200ms** | ✅ Pass |
| **Search Latency (p95)** | < 800ms | **754ms** | ✅ Pass |
| **Stack Latency (p50)** | < 2000ms | **1637ms** | ✅ Pass |
| **Stack Latency (p95)** | < 4000ms | **2169ms** | ✅ Pass |

---

## Detailed Test Case Run

| ID | Developer Query | Search Latency | Stack Latency | Search Hits | Stack Picks | Zero Hallucinations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `heldout-01` | multi-tenant schema migration runner | 295ms | 2169ms | 0 | 3 | ✅ |
| `heldout-02` | iot mqtt broker with low memory footprint | 367ms | 2096ms | 0 | 3 | ✅ |
| `heldout-03` | distributed event sourcing and cqrs framework | 223ms | 1818ms | 0 | 3 | ✅ |
| `heldout-04` | resilient background job queue with rate limiting | 305ms | 2146ms | 0 | 3 | ✅ |
| `heldout-05` | zero config api mocking server for frontend teams | 176ms | 1402ms | 0 | 2 | ✅ |
| `heldout-06` | lightweight embedded time series storage | 170ms | 1417ms | 0 | 1 | ✅ |
| `heldout-07` | high throughput websocket gateway with auth | 754ms | 1418ms | 0 | 1 | ✅ |
| `heldout-08` | server-side pdf generation with custom html templates | 400ms | 1711ms | 0 | 1 | ✅ |
| `heldout-09` | privacy focused website visitor session recording | 175ms | 1911ms | 0 | 3 | ✅ |
| `heldout-10` | cross platform secure secret and credential manager | 175ms | 2113ms | 0 | 3 | ✅ |
| `heldout-11` | edge computing runtime for latency sensitive apis | 169ms | 1126ms | 0 | 1 | ✅ |
| `heldout-12` | automated pr screenshot diffing and visual regression | 200ms | 1705ms | 0 | 3 | ✅ |
| `heldout-13` | self-hosted alternative to zapier for webhook workflows | 169ms | 1637ms | 0 | 2 | ✅ |
| `heldout-14` | dead simple error tracking for mobile react native | 168ms | 843ms | 0 | 1 | ✅ |
| `heldout-15` | ai prompt evaluation and llm tracing playground | 255ms | 1727ms | 0 | 3 | ✅ |
| `heldout-16` | dns management api with dynamic record updates | 440ms | 916ms | 0 | 1 | ✅ |
| `heldout-17` | transactional email sending with react template components | 174ms | 1197ms | 1 | 1 | ✅ |
| `heldout-18` | open source feature flagging with a/b testing experiments | 313ms | 1599ms | 1 | 3 | ✅ |

---

## Verification & Notes
- **Data Completeness**: Database populated with curated tools covering evaluation test scenarios with 1536-dimensional embeddings.
- **Strict DB Grounding**: Zero hallucinations (0.0%) is guaranteed by design, as recommendations are retrieved directly from PostgreSQL table rows and validated before response serialization.
- **Search Performance**: Hybrid search powered by PostgreSQL Reciprocal Rank Fusion (pgvector embeddings + websearch full-text + trigram similarity).
- **Latency Profile**: Search p50 latency is measured at 200ms over remote HTTPS PostgREST round-trips to the hosted Supabase instance (exceeds the 300ms local SLA target due to cross-region WAN network latency).
