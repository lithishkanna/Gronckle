import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, GitCommit, CheckCircle2, Flame, Shield, Cpu, Users } from 'lucide-react';

interface ChangelogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChangelogEntry {
  version: string;
  title: string;
  date: string;
  badge: string;
  icon: React.ReactNode;
  highlights: string[];
}

const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: 'v5.0.0',
    title: 'Growth, Open Source & Public Launch',
    date: 'September 2026',
    badge: 'Latest Release',
    icon: <Flame className="w-4 h-4 text-[#FF6B2B]" />,
    highlights: [
      'Core repository 100% open-sourced under MIT License with comprehensive documentation and contributor guidelines.',
      'Interactive in-app Changelog modal and terminal commands (`changelog`, `discord`).',
      'Full public launch kits prepared for Product Hunt, Hacker News, Reddit, Twitter/X, and Dev.to.',
      'Active newsletter subscriber onboarding in Footer with instant confirmation.',
    ],
  },
  {
    version: 'v4.0.0',
    title: 'Vector Search & Community Features',
    date: 'September 2026',
    badge: 'Major',
    icon: <Cpu className="w-4 h-4 text-purple-400" />,
    highlights: [
      'pgvector cosine similarity enabled in PostgreSQL with `similar-stacks` Edge Function.',
      '"Similar Stacks" recommendations automatically generated in The Smelt.',
      'Community repository submission modal and upvoting system in The Stash.',
      '"Report Outdated" crowdsourced quality control for broken or unmaintained repos.',
      'Automated daily GitHub repo metadata sync webhook and client Token Bucket rate limiter.',
      'GitHub Actions CI/CD pipeline, Vercel configuration, and lightweight PostHog & Sentry telemetry.',
    ],
  },
  {
    version: 'v3.0.0',
    title: 'UI/UX Expansion & Shareability',
    date: 'September 2026',
    badge: 'Feature',
    icon: <Sparkles className="w-4 h-4 text-yellow-400" />,
    highlights: [
      'Global `Cmd+K` / `Ctrl+K` command palette with debounced tool search and fast keyboard navigation.',
      'Dedicated User Profile page displaying saved stacks, bookmarks, and account metadata.',
      'Single-click tool bookmarking persisted to database with guest prompts.',
      'Deep-linked shareable stack URLs (`?stack=<id>`) with pre-populated architectures.',
    ],
  },
  {
    version: 'v2.0.0',
    title: 'Live Data & Real AI Architect',
    date: 'September 2026',
    badge: 'Feature',
    icon: <Users className="w-4 h-4 text-blue-400" />,
    highlights: [
      'Real LLM integration (Claude Sonnet & GPT-4o-mini) in The Smelt via Deno Edge Functions.',
      'Batched GitHub API proxy with Redis and in-memory caching to eliminate rate limits.',
      'One-click export of generated architectures to `package.json` and formatted `README.md`.',
      'Save stack history directly to database tied to authenticated developer profiles.',
    ],
  },
  {
    version: 'v1.0.0',
    title: 'Foundation & Authentication',
    date: 'September 2026',
    badge: 'Initial',
    icon: <Shield className="w-4 h-4 text-green-400" />,
    highlights: [
      'Initial release of Gronckle / StackForge with dark aesthetics and retro hacker terminal.',
      'Supabase PostgreSQL schema, RLS policies, and atomic RPC functions.',
      'GitHub OAuth developer login with session persistence.',
    ],
  },
];

export function ChangelogModal({ open, onOpenChange }: ChangelogModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border border-white/10 rounded-3xl text-white sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#FF6B2B]/10 text-[#FF6B2B] border border-[#FF6B2B]/20">
              <GitCommit className="w-4 h-4" />
            </span>
            <DialogTitle className="text-xl font-bold">Changelog & Evolution</DialogTitle>
          </div>
          <p className="text-xs text-white/40">
            A chronological timeline of updates and feature releases in Gronckle.
          </p>
        </DialogHeader>

        <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
          {CHANGELOG_DATA.map((entry, index) => (
            <div key={entry.version} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[27px] top-1 w-6 h-6 rounded-full bg-[#161616] border border-white/20 flex items-center justify-center">
                {entry.icon}
              </div>

              {/* Content */}
              <div className="bg-white/5 border border-white/5 group-hover:border-white/15 rounded-2xl p-4 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">{entry.version}</span>
                    <span className="text-xs text-white/60 font-medium">— {entry.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                      index === 0
                        ? 'bg-[#FF6B2B]/10 border-[#FF6B2B]/30 text-[#FF6B2B]'
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}>
                      {entry.badge}
                    </span>
                    <span className="text-[11px] text-white/30">{entry.date}</span>
                  </div>
                </div>

                <ul className="space-y-1.5 mt-3">
                  {entry.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-white/60 leading-relaxed flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white/30 mt-0.5 flex-shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
