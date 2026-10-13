import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
  ExternalLink,
  Share2,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Scale,
  Star,
  Activity,
  Server,
  ChevronDown,
  Copy,
  Check,
  FileJson,
  FileText,
  Terminal,
  Zap,
  Flame,
  DollarSign,
  ArrowRight,
  PlusCircle,
  Code2,
} from 'lucide-react';
import type {
  StackRecommendationResult,
  PipelineStep,
  Tool,
} from '@/types/database';
import { getMaintenanceStatus } from '@/lib/filters';
import {
  saveSharedStack,
  submitRecommendationFeedback,
  applyPresetReRanking,
  exportPackageJson,
  exportReadme,
  exportInstallCommands,
  generateArchitectureDiagram,
} from '@/lib/recommendations';

interface StackRecommendationsProps {
  result: StackRecommendationResult | null;
  pipelineStep: PipelineStep;
  loading: boolean;
  onReroll: () => void;
  onToggleLock: (toolId: string) => void;
  onSwapTool: (category: string, altId: string) => void;
  onPresetChange?: (preset: 'balanced' | 'cheapest' | 'fastest' | 'open_source' | 'mature') => void;
  onScaleChange?: (scale: 'hobby' | 'startup' | 'large') => void;
  onFollowUp?: (prompt: string) => void;
  allTools: Tool[];
}

export function StackRecommendations({
  result: initialResult,
  pipelineStep,
  loading,
  onReroll,
  onToggleLock,
  onSwapTool,
  onPresetChange,
  onScaleChange,
  onFollowUp,
}: StackRecommendationsProps) {
  const [activeSwapCategory, setActiveSwapCategory] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [copiedType, setCopiedType] = useState<'url' | 'json' | 'readme' | 'commands' | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, 'up' | 'down'>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showDiagram, setShowDiagram] = useState(false);
  const [localPreset, setLocalPreset] = useState<'balanced' | 'cheapest' | 'fastest' | 'open_source' | 'mature'>(
    initialResult?.preset || 'balanced'
  );

  // If local preset is selected, derive re-ranked result
  const result = initialResult && localPreset !== 'balanced' && (!initialResult.preset || initialResult.preset !== localPreset)
    ? applyPresetReRanking(initialResult, localPreset)
    : initialResult;

  // Sharing stack handler
  const handleShare = async () => {
    if (!result || sharing) return;
    setSharing(true);
    try {
      const stackId = await saveSharedStack({
        title: `${result.query.slice(0, 35)} Stack`,
        query: result.query,
        result,
        is_public: true,
      });

      const shareUrl = `${window.location.origin}${window.location.pathname}?stack=${stackId}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess(true);
      setCopiedType('url');
      setTimeout(() => {
        setShareSuccess(false);
        setCopiedType(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to share stack:', err);
    } finally {
      setSharing(false);
    }
  };

  // Feedback handler
  const handleFeedback = async (toolId: string | null, type: 'up' | 'down') => {
    if (!result) return;
    const key = toolId || 'stack-overall';
    if (feedbackSent[key]) return;

    setFeedbackSent(prev => ({ ...prev, [key]: type }));
    setFeedbackMessage(type === 'up' ? 'Helpful feedback recorded!' : 'Feedback noted for ranking eval.');
    setTimeout(() => setFeedbackMessage(null), 2500);

    await submitRecommendationFeedback({
      query: result.query,
      tool_id: toolId,
      feedback: type === 'up' ? 'thumbs_up' : 'thumbs_down',
      metadata: { source: result.source },
    });
  };

  // Export handlers using pure recommendations export utilities
  const handleExportJson = async () => {
    if (!result) return;
    const content = exportPackageJson(result.tools, 'my-gronckle-stack');
    await navigator.clipboard.writeText(content);
    setCopiedType('json');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleExportReadme = async () => {
    if (!result) return;
    const content = exportReadme(result);
    await navigator.clipboard.writeText(content);
    setCopiedType('readme');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyCommands = async () => {
    if (!result) return;
    const content = exportInstallCommands(result.tools);
    await navigator.clipboard.writeText(content || result.setup_commands.join('\n'));
    setCopiedType('commands');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const pipelineSteps: Array<{ key: PipelineStep; label: string; desc: string }> = [
    { key: 'understanding', label: '1. Understand', desc: 'Parsing requirements & constraints' },
    { key: 'retrieving', label: '2. Retrieve', desc: 'Querying Gronckle tools database' },
    { key: 'ranking', label: '3. Rank', desc: 'Scoring compatibility & underrated score' },
    { key: 'explaining', label: '4. Explain', desc: 'Grounded rationale & alternatives' },
  ];

  const currentStepIndex = pipelineSteps.findIndex(s => s.key === pipelineStep);

  return (
    <div className="w-full max-w-5xl mx-auto mb-20">
      {/* ─── Pipeline Progress Indicator ─── */}
      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-8 p-6 rounded-2xl bg-[#141414] border border-white/10 shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-orange-400 animate-spin" />
            <span className="text-sm font-semibold text-white tracking-wide uppercase">
              Pipeline In Progress
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {pipelineSteps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-orange-500/10 border-orange-500/30 text-white shadow-lg shadow-orange-500/10'
                      : isPast
                      ? 'bg-white/5 border-green-500/20 text-white/70'
                      : 'bg-white/[0.02] border-white/5 text-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{step.label}</span>
                    {isPast && <Check className="w-3.5 h-3.5 text-green-400" />}
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />}
                  </div>
                  <p className="text-[11px] opacity-70 leading-tight">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Recommendation Results ─── */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.query}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Top Bar / Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-[#111418] border border-white/10 shadow-xl">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {result.tools.length} Tools Recommended
                  </span>
                  {result.estimated_monthly_cost && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
                      <DollarSign className="w-3 h-3" />
                      {result.estimated_monthly_cost}
                    </span>
                  )}
                  {result.source === 'db_fallback' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-white/50 border border-white/10">
                      Deterministic DB Vault
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      AI Synthesized & Grounded
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white leading-snug">
                  Stack Blueprint for &ldquo;{result.query}&rdquo;
                </h3>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowDiagram(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    showDiagram ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                  }`}
                  title="View Mermaid architecture diagram"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Diagram</span>
                </button>

                <button
                  onClick={onReroll}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5"
                  title="Re-roll unlocked tools"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-roll Unlocked</span>
                </button>

                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    shareSuccess
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {shareSuccess ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{shareSuccess ? 'Link Copied!' : 'Share Stack'}</span>
                </button>

                {/* Overall Feedback */}
                <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                  <button
                    onClick={() => handleFeedback(null, 'up')}
                    className={`p-1.5 rounded-xl border transition-colors ${
                      feedbackSent['stack-overall'] === 'up'
                        ? 'bg-green-500/20 border-green-500/40 text-green-400'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                    }`}
                    title="Helpful stack"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleFeedback(null, 'down')}
                    className={`p-1.5 rounded-xl border transition-colors ${
                      feedbackSent['stack-overall'] === 'down'
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                    }`}
                    title="Needs improvement"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Phase C Presets & Scale Selector Controls ─── */}
            <div className="p-4 rounded-xl bg-[#111418] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-white/40 font-bold mr-1">
                  Preset:
                </span>
                {(
                  [
                    { key: 'balanced', label: 'Balanced' },
                    { key: 'cheapest', label: 'Cheapest' },
                    { key: 'fastest', label: 'Fastest to ship' },
                    { key: 'open_source', label: 'Fully open source' },
                    { key: 'mature', label: 'Most mature' },
                  ] as const
                ).map(p => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setLocalPreset(p.key);
                      onPresetChange?.(p.key);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      localPreset === p.key
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20 font-semibold'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Scale Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-white/40 font-bold mr-1">
                  Scale:
                </span>
                {(
                  [
                    { key: 'hobby', label: 'Hobby ($0)' },
                    { key: 'startup', label: 'Startup' },
                    { key: 'large', label: 'Large Team' },
                  ] as const
                ).map(s => (
                  <button
                    key={s.key}
                    onClick={() => onScaleChange?.(s.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      (result.scale || 'hobby') === s.key
                        ? 'bg-white/20 text-white border border-white/30 font-semibold'
                        : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback notification toast */}
            {feedbackMessage && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            {/* ─── Architecture Diagram Preview ─── */}
            {showDiagram && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-5 rounded-2xl bg-[#0B0D10] border border-orange-500/30 overflow-hidden font-mono text-xs"
              >
                <div className="flex items-center justify-between mb-3 text-white/60">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-orange-400" />
                    Architecture Flow (Mermaid Diagram)
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.mermaid_diagram || generateArchitectureDiagram(result.tools))}
                    className="text-[11px] text-orange-400 hover:underline"
                  >
                    Copy Mermaid Code
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-black/60 border border-white/5 text-orange-200/90 overflow-x-auto whitespace-pre">
                  {result.mermaid_diagram || generateArchitectureDiagram(result.tools)}
                </pre>
              </motion.div>
            )}

            {/* ─── Missing Layers Alert (Step 6 Gaps) ─── */}
            {result.missing_layers && result.missing_layers.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-amber-300">
                      Unfulfilled Architectural Layers:
                    </span>
                    <p className="text-xs text-amber-200/80 mt-0.5">
                      Nothing in the Gronckle vault matched:{' '}
                      <strong className="text-white">{result.missing_layers.join(', ')}</strong>.
                    </p>
                  </div>
                </div>
                <a
                  href="#submit"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('open-submit-tool'));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-medium border border-amber-500/30 flex items-center gap-1 shrink-0"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Submit Tool</span>
                </a>
              </div>
            )}

            {/* ─── Compatibility Warnings ─── */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="space-y-2">
                {result.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-300">{warning.title}</h4>
                      <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                        {warning.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── Tool Cards Grid ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.tools.map(tool => {
                const isLocked = !!tool.is_locked;
                const maint = getMaintenanceStatus(tool.last_commit_date);
                const isSwapping = activeSwapCategory === tool.category;

                return (
                  <div
                    key={tool.id}
                    className={`relative p-6 rounded-2xl border transition-all ${
                      isLocked
                        ? 'bg-[#151821] border-orange-500/40 shadow-lg shadow-orange-500/5'
                        : 'bg-[#111418] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Header: Category, Underrated Score & Lock */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                          {tool.category}
                        </span>
                        {tool.underrated_score !== undefined && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-1 font-mono"
                            title={tool.underrated_reason || 'Quality signals vs popularity metric'}
                          >
                            <Flame className="w-2.5 h-2.5" />
                            {tool.underrated_score}/99
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => onToggleLock(tool.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                          isLocked
                            ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                            : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                        }`}
                        title={isLocked ? 'Locked (won’t change on re-roll)' : 'Lock tool in this slot'}
                      >
                        {isLocked ? <Lock className="w-3 h-3 text-orange-400" /> : <Unlock className="w-3 h-3" />}
                        <span>{isLocked ? 'Locked' : 'Lock'}</span>
                      </button>
                    </div>

                    {/* Title & External Link */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="text-lg font-bold text-white group-hover:text-orange-300 transition-colors">
                          <a
                            href={`/tool/${tool.slug || tool.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                            onClick={(e) => {
                              e.preventDefault();
                              const s = tool.slug || tool.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                              window.history.pushState(null, '', `/tool/${s}`);
                              window.dispatchEvent(new PopStateEvent('popstate'));
                            }}
                            className="hover:underline"
                          >
                            {tool.title}
                          </a>
                        </h4>
                        {tool.slug && (
                          <span className="text-xs text-white/30 font-mono">@{tool.slug}</span>
                        )}
                      </div>
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        title="View repository / website"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-white/60 mb-4 line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4 text-[11px]">
                      {tool.estimated_cost && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono">
                          {tool.estimated_cost}
                        </span>
                      )}
                      {tool.stars !== undefined && tool.stars > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 flex items-center gap-1 font-mono">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400/20" />
                          {tool.stars >= 1000 ? `${(tool.stars / 1000).toFixed(1)}k` : tool.stars}
                        </span>
                      )}
                      {tool.license && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 flex items-center gap-1">
                          <Scale className="w-3 h-3 text-white/40" />
                          {tool.license}
                        </span>
                      )}
                      {maint && (
                        <span
                          className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                            maint === 'active'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                              : maint === 'slowing'
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                          }`}
                        >
                          <Activity className="w-3 h-3" />
                          {maint === 'active' ? 'Active' : maint === 'slowing' ? 'Slowing' : 'Quiet'}
                        </span>
                      )}
                      {tool.self_hostable && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center gap-1">
                          <Server className="w-3 h-3" />
                          Self-Host
                        </span>
                      )}
                    </div>

                    {/* Why Chosen Reason Box */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-3 text-xs">
                      <div className="text-[10px] font-semibold uppercase text-white/40 mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-orange-400" />
                        Rationale
                      </div>
                      <p className="text-white/80 leading-relaxed">{tool.reason}</p>
                    </div>

                    {/* Gotchas if available */}
                    {tool.gotchas && tool.gotchas.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-4 text-[11px] text-amber-300/80">
                        <span className="font-semibold text-amber-400 block mb-0.5">Production Notes:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {tool.gotchas.map((g, gi) => (
                            <li key={gi}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Swap With Alternatives Dropdown */}
                    <div className="relative pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setActiveSwapCategory(isSwapping ? null : tool.category)}
                          disabled={tool.alternatives.length === 0}
                          className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <span>Swap with alternative ({tool.alternatives.length})</span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${isSwapping ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {/* Thumbs up/down per tool */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFeedback(tool.id, 'up')}
                            className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${
                              feedbackSent[tool.id] === 'up' ? 'text-green-400' : 'text-white/30'
                            }`}
                            title="Great fit"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(tool.id, 'down')}
                            className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${
                              feedbackSent[tool.id] === 'down' ? 'text-red-400' : 'text-white/30'
                            }`}
                            title="Poor fit"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Alternatives Dropdown Menu */}
                      {isSwapping && tool.alternatives.length > 0 && (
                        <div className="mt-3 space-y-2 p-2 rounded-xl bg-[#181818] border border-white/10 shadow-2xl">
                          <span className="text-[10px] uppercase font-bold text-white/40 px-2 block">
                            Database Candidates
                          </span>
                          {tool.alternatives.map(alt => (
                            <button
                              key={alt.id}
                              onClick={() => {
                                onSwapTool(tool.category, alt.id);
                                setActiveSwapCategory(null);
                              }}
                              className="w-full text-left p-2.5 rounded-lg hover:bg-white/10 border border-transparent hover:border-white/10 transition-all flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="text-xs font-semibold text-white">{alt.title}</div>
                                <div className="text-[11px] text-white/40 line-clamp-1">{alt.description}</div>
                              </div>
                              <div className="text-right shrink-0">
                                {alt.stars !== undefined && alt.stars > 0 && (
                                  <span className="text-[11px] text-white/40 flex items-center gap-1 font-mono">
                                    <Star className="w-2.5 h-2.5 text-yellow-400" />
                                    {alt.stars >= 1000 ? `${(alt.stars / 1000).toFixed(1)}k` : alt.stars}
                                  </span>
                                )}
                                <span className="text-[10px] text-orange-400">Select</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ─── Follow-Up Quick Action Chips (Phase C) ─── */}
            <div className="p-4 rounded-xl bg-[#111418] border border-white/5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/50 font-medium mr-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                Refine stack:
              </span>
              {[
                'Make it cheaper',
                'No paid services',
                'Replace the database',
                'Add real-time capabilities',
              ].map(chip => (
                <button
                  key={chip}
                  onClick={() => onFollowUp?.(chip)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 text-white/80 hover:text-orange-300 text-xs border border-white/10 transition-colors flex items-center gap-1"
                >
                  <span>{chip}</span>
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </button>
              ))}
            </div>

            {/* ─── Export & Setup Commands ─── */}
            <div className="p-6 rounded-2xl bg-[#111418] border border-white/10 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">Quickstart & Exports</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleExportJson}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors flex items-center gap-1.5"
                  >
                    {copiedType === 'json' ? <Check className="w-3 h-3 text-green-400" /> : <FileJson className="w-3 h-3" />}
                    <span>{copiedType === 'json' ? 'Copied' : 'package.json'}</span>
                  </button>
                  <button
                    onClick={handleExportReadme}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs border border-white/10 transition-colors flex items-center gap-1.5"
                  >
                    {copiedType === 'readme' ? <Check className="w-3 h-3 text-green-400" /> : <FileText className="w-3 h-3" />}
                    <span>{copiedType === 'readme' ? 'Copied' : 'README.md'}</span>
                  </button>
                </div>
              </div>

              {/* Terminal Code Box */}
              <div className="relative p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs">
                {result.setup_commands.map((cmd, i) => (
                  <div key={i} className="flex items-start gap-2 py-0.5">
                    <span className="text-emerald-500/70 select-none">$</span>
                    <span className="text-white/80">{cmd}</span>
                  </div>
                ))}
                <button
                  onClick={handleCopyCommands}
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                  title="Copy terminal commands"
                >
                  {copiedType === 'commands' ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedType === 'commands' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
