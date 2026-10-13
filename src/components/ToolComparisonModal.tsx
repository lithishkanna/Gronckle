import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Star,
  Activity,
  ExternalLink,
  Flame,
  Check,
  Copy,
  Shield,
  ArrowRightLeft,
  Code2,
} from 'lucide-react';
import type { Tool } from '@/types/database';
import { calculateUnderratedScore } from '@/lib/recommendations';
import { getMaintenanceStatus } from '@/lib/filters';

interface ToolComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tools: Tool[];
  availableTools: Tool[];
  onSelectTool?: (slotIndex: number, tool: Tool) => void;
}

export function ToolComparisonModal({
  open,
  onOpenChange,
  tools: initialTools,
  availableTools,
}: ToolComparisonModalProps) {
  const [copiedBadge, setCopiedBadge] = useState<string | null>(null);
  const selectedTools = initialTools.length >= 2
    ? initialTools.slice(0, 3)
    : availableTools.slice(0, 2);

  const handleCopyBadge = async (slug: string) => {
    const badgeMd = `[![Featured on Gronckle](https://img.shields.io/badge/Featured%20on-Gronckle-FF6B2B?style=flat&logo=target)](https://gronckle.dev/tool/${slug})`;
    await navigator.clipboard.writeText(badgeMd);
    setCopiedBadge(slug);
    setTimeout(() => setCopiedBadge(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto bg-[#111418] border border-white/10 text-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <ArrowRightLeft className="w-5 h-5" />
            </span>
            <DialogTitle className="text-xl font-bold text-white">
              Tool Comparison &amp; Why Switch
            </DialogTitle>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Side-by-side architectural trade-off analysis, maintenance posture, and license inspection.
          </p>
        </DialogHeader>

        {selectedTools.length === 0 ? (
          <div className="p-8 text-center text-white/40 text-sm">
            No tools selected for comparison.
          </div>
        ) : (
          <div className="space-y-6">
            {/* ─── Comparison Matrix Table ─── */}
            <div className="overflow-x-auto border border-white/10 rounded-xl bg-[#0B0D10]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="p-3.5 font-bold uppercase tracking-wider text-white/40 w-40">
                      Metric
                    </th>
                    {selectedTools.map((t) => (
                      <th key={t.id} className="p-3.5 font-bold text-white">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-white">{t.title}</span>
                          <a
                            href={t.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white/40 hover:text-white"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <span className="text-[11px] text-white/40 block mt-0.5 font-mono">
                          {t.category}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {/* Underrated Score */}
                  <tr>
                    <td className="p-3.5 font-semibold text-white/60">Underrated Score</td>
                    {selectedTools.map((t) => {
                      const { score, reason } = calculateUnderratedScore(t);
                      return (
                        <td key={t.id} className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-orange-500/15 text-orange-400 border border-orange-500/30 inline-flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {score}/99
                          </span>
                          <span className="text-[10px] text-white/40 block mt-1 line-clamp-2 leading-tight">
                            {reason}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Stars / Adoption */}
                  <tr>
                    <td className="p-3.5 font-semibold text-white/60">Community Stars</td>
                    {selectedTools.map((t) => (
                      <td key={t.id} className="p-3.5 font-mono">
                        <span className="flex items-center gap-1 text-white">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400/20" />
                          {t.stars ? (t.stars >= 1000 ? `${(t.stars / 1000).toFixed(1)}k` : t.stars) : 'N/A'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Maintenance Status */}
                  <tr>
                    <td className="p-3.5 font-semibold text-white/60">Maintainer Velocity</td>
                    {selectedTools.map((t) => {
                      const maint = getMaintenanceStatus(t.last_commit_date);
                      return (
                        <td key={t.id} className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] border inline-flex items-center gap-1 ${
                              maint === 'active'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                : maint === 'slowing'
                                ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                            }`}
                          >
                            <Activity className="w-3 h-3" />
                            {maint === 'active' ? 'Active (<90d)' : maint === 'slowing' ? 'Slowing (<180d)' : 'Quiet'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* License */}
                  <tr>
                    <td className="p-3.5 font-semibold text-white/60">License</td>
                    {selectedTools.map((t) => (
                      <td key={t.id} className="p-3.5 font-mono text-white/80">
                        {t.license || 'Proprietary / Custom'}
                      </td>
                    ))}
                  </tr>

                  {/* Self-Hostable */}
                  <tr>
                    <td className="p-3.5 font-semibold text-white/60">Self-Hostable</td>
                    {selectedTools.map((t) => (
                      <td key={t.id} className="p-3.5">
                        {t.self_hostable ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Yes
                          </span>
                        ) : (
                          <span className="text-white/40">Cloud-hosted only</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Pricing & Free Tier */}
                  <tr>
                    <td className="p-3.5 font-semibold text-white/60">Free Tier / Pricing</td>
                    {selectedTools.map((t) => (
                      <td key={t.id} className="p-3.5 text-white/70">
                        <span className="font-semibold text-emerald-300 block mb-0.5">
                          {t.pricing || 'Free / Open Source'}
                        </span>
                        {t.free_tier_note && (
                          <span className="text-[11px] text-white/40 block leading-tight">
                            {t.free_tier_note}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Install Command */}
                  <tr>
                    <td className="p-3.5 font-semibold text-white/60">Install Command</td>
                    {selectedTools.map((t) => (
                      <td key={t.id} className="p-3.5 font-mono text-[11px]">
                        {t.install_command ? (
                          <code className="p-1.5 rounded bg-black/60 border border-white/5 text-orange-200 block truncate">
                            {t.install_command}
                          </code>
                        ) : t.npm_package ? (
                          <code className="p-1.5 rounded bg-black/60 border border-white/5 text-orange-200 block truncate">
                            npm i {t.npm_package}
                          </code>
                        ) : (
                          <span className="text-white/30">N/A (Service / Web app)</span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ─── Why Switch / Trade-offs View ─── */}
            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/15 space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Why Switch: Architectural Decision Points
              </h5>
              <p className="text-xs text-white/70 leading-relaxed">
                When migrating between these options, prioritize <strong>maintainer commit velocity</strong> and{' '}
                <strong>license portability</strong>. Tools with higher Underrated Scores typically minimize bundle overhead
                and avoid vendor lock-in.
              </p>
            </div>

            {/* ─── Embed Badge (Phase D) ─── */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-orange-400" />
                    &ldquo;Featured on Gronckle&rdquo; Maintainer Badge
                  </h5>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    Embed this badge in your README to showcase your tool in the developer vault.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedTools.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#141820] border border-white/5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://img.shields.io/badge/Featured%20on-Gronckle-FF6B2B?style=flat&logo=target`}
                        alt="Featured on Gronckle"
                        className="h-5"
                      />
                      <span className="text-xs font-mono text-white/70">{t.title}</span>
                    </div>
                    <button
                      onClick={() => handleCopyBadge(t.slug || t.title.toLowerCase())}
                      className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors flex items-center gap-1"
                    >
                      {copiedBadge === (t.slug || t.title.toLowerCase()) ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
