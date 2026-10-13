import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GitPullRequest,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  FileCode,
  Github,
  RefreshCw,
} from 'lucide-react';
import { analyzeRepository, type AnalyzeRepoResult } from '@/lib/analyze';

interface AnalyzeRepoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnalyzeRepoModal({ open, onOpenChange }: AnalyzeRepoModalProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'paste'>('url');
  const [repoUrl, setRepoUrl] = useState('');
  const [manifestContent, setManifestContent] = useState('');
  const [manifestFilename, setManifestFilename] = useState('package.json');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeRepoResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (activeTab === 'url') {
        if (!repoUrl.trim()) throw new Error('Please enter a GitHub repository URL.');
        const res = await analyzeRepository({ repoUrl: repoUrl.trim() });
        setResult(res);
      } else {
        if (!manifestContent.trim()) throw new Error('Please paste your manifest file content.');
        const res = await analyzeRepository({
          manifestContent: manifestContent.trim(),
          manifestFilename,
        });
        setResult(res);
      }
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please check repository or manifest.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[#111418] border border-white/10 text-white rounded-2xl p-6 shadow-2xl">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <GitPullRequest className="w-5 h-5" />
            </span>
            <DialogTitle className="text-xl font-bold text-white">
              Analyze My Repository
            </DialogTitle>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Detect stack dependencies, flag deprecated or heavy packages, and discover modern underrated alternatives from the Gronckle vault.
          </p>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'url' ? 'bg-orange-500 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Repository URL</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'paste' ? 'bg-orange-500 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Paste Manifest File</span>
              </button>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-4">
              {activeTab === 'url' ? (
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Public GitHub URL
                  </label>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-orange-500/50"
                    disabled={loading}
                  />
                  <span className="text-[11px] text-white/40 block mt-1">
                    Gronckle inspects package.json, requirements.txt, or go.mod in public repos.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1.5">
                      Manifest Format
                    </label>
                    <div className="flex gap-2">
                      {['package.json', 'requirements.txt', 'go.mod'].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setManifestFilename(f)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono border transition-colors ${
                            manifestFilename === f
                              ? 'bg-white/15 text-white border-white/30'
                              : 'bg-white/5 text-white/40 border-white/5'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/70 mb-1.5">
                      File Content
                    </label>
                    <textarea
                      value={manifestContent}
                      onChange={(e) => setManifestContent(e.target.value)}
                      placeholder='{ "dependencies": { "moment": "^2.29.0", "express": "^4.18.0" } }'
                      rows={6}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono placeholder:text-white/20 focus:outline-none focus:border-orange-500/50"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Scanning Dependencies...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Stack</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Result Summary */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                  Analyzed Repository
                </span>
                <h4 className="text-base font-bold text-white">{result.repo}</h4>
                <span className="text-xs text-white/50 font-mono">
                  {result.manifest_filename} &bull; {result.dependencies_count} packages detected &bull; {result.primary_language}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-white/40 block">
                    Health Score
                  </span>
                  <span className={`text-2xl font-black font-mono ${
                    result.health_score >= 80 ? 'text-emerald-400' : result.health_score >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {result.health_score}/100
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                  title="Scan another repository"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Flagged Dependencies */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Flagged Packages & Recommendations ({result.flagged_dependencies.length})
              </h5>

              {result.flagged_dependencies.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>No legacy, heavy, or deprecated dependencies flagged!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.flagged_dependencies.map((flag, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#141820] border border-white/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-red-300">
                          {flag.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          flag.risk === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {flag.risk} risk
                        </span>
                      </div>
                      <p className="text-xs text-white/70 leading-relaxed">
                        {flag.issue}
                      </p>

                      {flag.suggested_alternatives.length > 0 && (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-[10px] uppercase font-bold text-orange-400 block mb-1.5">
                            Gronckle Vault Alternatives:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {flag.suggested_alternatives.map((alt) => (
                              <a
                                key={alt.id}
                                href={alt.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/5 hover:border-orange-500/30 transition-all flex items-center justify-between group"
                              >
                                <div>
                                  <div className="text-xs font-semibold text-white group-hover:text-orange-300">
                                    {alt.title}
                                  </div>
                                  <div className="text-[11px] text-white/40 line-clamp-1">
                                    {alt.description}
                                  </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-white/30 group-hover:text-orange-400 shrink-0 ml-2" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Architectural Capabilities */}
            {result.vault_recommendations.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Suggested Stack Additions
                </h5>
                <div className="space-y-2">
                  {result.vault_recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-blue-300 block mb-0.5">
                          {rec.layer}: {rec.suggested_tool.title}
                        </span>
                        <p className="text-white/60 text-[11px] leading-relaxed">
                          {rec.observation}
                        </p>
                      </div>
                      <a
                        href={rec.suggested_tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
