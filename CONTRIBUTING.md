# Contributing to Gronckle 🐉

Thank you for your interest in contributing to **Gronckle** — the lazy dragon's vault of underrated developer tools!

We welcome contributions of all kinds: bug fixes, new features, documentation improvements, UI polish, and curated tool additions.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Supabase Account**: (Optional for local UI development, required for Edge Functions & database changes)

### Getting Started

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/gronckle.git
   cd gronckle
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Start the local dev server:**
   ```bash
   npm run dev
   ```

---

## 📋 Code Style & Quality Guidelines

- **TypeScript Strictness:** Keep all files strictly typed. No implicit `any`.
- **Linting & Type Checking:** Run before opening a PR:
  ```bash
  npx tsc --noEmit
  npm run lint
  npm run build
  ```
- **Styling:** We use **Tailwind CSS** with pure black dark aesthetics (`#0A0A0A` background) and the signature Gronckle Ember Accent (`#FF6B2B`).
- **Icons:** Use `lucide-react`.

---

## 💡 Suggesting a New Tool or Repository

Want to add an underrated open-source gem to the vault?
1. You can submit it directly in the app via **The Source $\rightarrow$ Submit Repo**.
2. Or open an issue using the [Tool Suggestion Template](.github/ISSUE_TEMPLATE/feature_request.md).

Requirements for curated additions:
- Open source on GitHub
- Active maintenance or high utility value
- Solves a real developer problem without unnecessary bloat

---

## 🚀 Pull Request Workflow

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
2. Commit with conventional commit messages:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation updates
   - `style:` visual polish or formatting
   - `perf:` performance improvements
3. Push to your fork and submit a PR to `main`.
4. Fill out the Pull Request template completely.

---

## 💬 Community & Help

- Join our [Discord Server](https://discord.gg/gronckle)
- Report bugs via [GitHub Issues](https://github.com/your-username/gronckle/issues)

Happy building! 🐲🔥
