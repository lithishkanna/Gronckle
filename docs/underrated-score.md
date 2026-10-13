# Gronckle Underrated Score Specification

## Purpose
The **Underrated Score** (1–99) highlights exceptional developer tools that deliver high architectural quality, performance, and maintainer dedication, but receive disproportionately less social media hype or GitHub stars compared to mainstream incumbents.

---

## The Formula

The score balances **Quality & Velocity Signals ($Q$)** against a **Logarithmic Popularity Metric ($P$)**, boosted by developer upvotes:

$$\text{Underrated Score} = \text{clamp}\left(1, 99, \text{round}\left( \frac{Q}{\max(1.0, \log_{10}(\max(S, 100)) - 1.5)} \times \left(1 + 0.1 \cdot \ln(1 + L)\right) \right)\right)$$

Where:
- $S$ = GitHub Stars (or equivalent public popularity counter)
- $L$ = Gronckle community likes/upvotes (`likes_count`)
- $Q$ = Aggregate Quality & Health score (0–100)

---

## Quality Component Breakdown ($Q$)

| Signal | Evaluation | Points |
| :--- | :--- | :--- |
| **Commit Velocity** | Last commit < 30 days ago | **+30** |
| | Last commit < 90 days ago | **+20** |
| | Last commit < 180 days ago | **+10** |
| | Last commit > 365 days ago | **-20** (decay penalty) |
| **Self-Hostable Freedom** | Operable on custom infrastructure without SaaS tie-in | **+15** |
| **License Permissiveness** | MIT, Apache-2.0, ISC, BSD | **+10** |
| | AGPL / Copyleft without commercial dual license | **0** |
| **Clean Packaging** | Native npm package or clean CLI install command available | **+15** |
| **Issue Health** | Low open issue count relative to usage | **+15** |
| **TypeScript / Modern Runtime** | Zero-config type safety & ESM support | **+15** |

---

## Why Logarithmic Damping?

A linear star count unfairly favors 10-year-old projects with 100,000+ stars that may be bloated or slowly moving. By applying logarithmic damping:
- A tool with **2,500 stars** and active commits every week achieves an **Underrated Score of 88–95** ("Hidden gem: lean, active, and punches far above its star count").
- A giant framework with **210,000 stars** is normalized to **40–55** ("Mainstream standard: reliable and universally recognized, but widely known").

---

## One-Line Reason Generation

Every pick displays an automated one-line reason summarizing its score:
- **Score ≥ 80**: *"Hidden gem: modern architecture, active maintainer velocity, and low overhead relative to adoption."*
- **Score 60–79**: *"Well-balanced tool: reliable production track record with strong developer ergonomics."*
- **Score < 60**: *"Industry incumbent: massive community and documentation with high adoption."*
