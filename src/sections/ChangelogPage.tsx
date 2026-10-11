import { ArrowLeft, Sparkles, CheckCircle2, GitCommit, Layers, Search, ShieldCheck } from 'lucide-react';

interface ChangelogPageProps {
  onBack: () => void;
}

const RELEASES = [
  {
    version: 'v2.0.0',
    date: 'October 2026',
    title: 'The Recommendation & Hybrid Search Milestone',
    tag: 'Major Release',
    highlights: [
      {
        icon: Sparkles,
        title: '5-Step Architecture Recommendation Pipeline',
        desc: 'Understand, Retrieve, Rank, Explain, and Validate pipeline guarantees zero hallucinations by strictly grounding all tools in Gronckle’s database.',
      },
      {
        icon: Search,
        title: 'Hybrid Search with Reciprocal Rank Fusion (RRF)',
        desc: 'Combines full-text tsvector, pg_trgm fuzzy trigrams, and pgvector HNSW cosine embeddings into a single ranked score.',
      },
      {
        icon: Layers,
        title: 'Interactive Stack Blueprint Studio',
        desc: 'Lock architectural layers, swap with candidate alternatives, and generate shareable ?stack=<id> URLs with developer feedback collection.',
      },
      {
        icon: ShieldCheck,
        title: 'Deterministic Facet Filtering & URL State Sync',
        desc: 'Instant filtering by Category, Language, Framework, License, Pricing, Self-Hostable status, and Maintenance freshness.',
      },
      {
        icon: GitCommit,
        title: 'Evaluation Benchmark Suite & Automated CI',
        desc: '35 real developer test cases measuring latency, hit rate @ 3, and 0.0% hallucination guarantees with GitHub Actions CI.',
      },
    ],
  },
  {
    version: 'v1.2.0',
    date: 'September 2026',
    title: 'Community Repository Submissions & Live Badges',
    tag: 'Feature Release',
    highlights: [
      {
        icon: CheckCircle2,
        title: 'Automated GitHub Metadata Extraction',
        desc: 'Enriches submissions automatically with GitHub stars, open issues, license, primary language, and commit activity.',
      },
      {
        icon: Layers,
        title: 'Live Badge Preview & Reviewer Flow',
        desc: 'Visual preview and metadata editing before submitting new developer repositories to the community inbox.',
      },
    ],
  },
  {
    version: 'v1.0.0',
    date: 'March 2026',
    title: 'Initial Launch: Hoard the Best, Build the Rest',
    tag: 'Initial Release',
    highlights: [
      {
        icon: CheckCircle2,
        title: 'The Vault & Developer Den',
        desc: 'Curated directory of developer tools with authentication, personal bookmarks, and community upvotes.',
      },
    ],
  },
];

export function ChangelogPage({ onBack }: ChangelogPageProps) {
  return (
    <div className="min-h-screen pt-24 pb-20 max-w-4xl mx-auto px-4 sm:px-6 font-sans">
      <button
        onClick={onBack}
        className="text-white/50 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Return to Vault</span>
      </button>

      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
          <GitCommit className="w-3.5 h-3.5" />
          <span>Release Notes & Changelog</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3">
          Product Changelog
        </h1>
        <p className="text-white/60 text-sm max-w-2xl leading-relaxed">
          Track updates, architecture milestones, and new capabilities added to the Gronckle developer tool discovery engine.
        </p>
      </div>

      <div className="space-y-12 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-white/10">
        {RELEASES.map(release => (
          <div key={release.version} className="relative pl-10">
            <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-4 border-black" />

            <div className="p-6 rounded-3xl bg-[#121212] border border-white/10 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white font-mono">{release.version}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium">
                    {release.tag}
                  </span>
                </div>
                <span className="text-xs text-white/40 font-mono">{release.date}</span>
              </div>

              <h3 className="text-base font-semibold text-white/90 mb-6">{release.title}</h3>

              <div className="space-y-4">
                {release.highlights.map((h, i) => {
                  const Icon = h.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="p-2 rounded-lg bg-white/5 text-blue-400 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{h.title}</h4>
                        <p className="text-xs text-white/50 mt-1 leading-relaxed">{h.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
