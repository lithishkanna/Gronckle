import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getRepos, searchRepos, type Repo } from '@/lib/supabase';
import { fetchBatchRepoMetadata } from '@/lib/api';
import {
  getApprovedSubmissions,
  toggleSubmissionVote,
  getUserVotedSubmissions,
  type Submission
} from '@/lib/community';
import { useAuth } from '@/hooks/use-auth';
import {
  Star,
  GitFork,
  Check,
  ExternalLink,
  AlertTriangle,
  Search,
  Github,
  Terminal,
  BookOpen,
  Plus,
  Flag,
  ThumbsUp,
  Sparkles,
  Users
} from 'lucide-react';
import TargetCursor from '@/components/TargetCursor';
import { SubmitRepoForm } from '@/components/SubmitRepoForm';
import { ReportOutdatedDialog } from '@/components/ReportOutdatedDialog';
import { toast } from 'sonner';

// Stagger variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.58, 1] as const } },
};

export function TheSource() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'curated' | 'community'>('curated');

  // Curated repos
  const [repos, setRepos] = useState<Repo[]>([]);
  const [repoStars, setRepoStars] = useState<Record<string, number>>({});
  const [copiedRepo, setCopiedRepo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starsLoading, setStarsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Community submissions
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [communityLoading, setCommunityLoading] = useState(false);

  // Dialog states
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [reportModal, setReportModal] = useState<{
    open: boolean;
    repoId: string;
    repoName: string;
  }>({
    open: false,
    repoId: '',
    repoName: '',
  });

  useEffect(() => {
    async function loadRepos() {
      try {
        setLoading(true);
        const data = await getRepos();
        setRepos(data);
        await fetchStars(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadRepos();
  }, []);

  // Load community submissions when switching tabs
  useEffect(() => {
    if (activeTab === 'community') {
      loadCommunityData();
    }
  }, [activeTab, user]);

  async function loadCommunityData() {
    try {
      setCommunityLoading(true);
      const [subs, votes] = await Promise.all([
        getApprovedSubmissions(),
        getUserVotedSubmissions(),
      ]);
      setSubmissions(subs);
      setVotedIds(new Set(votes));
    } catch (err) {
      console.error('Failed to load community submissions:', err);
    } finally {
      setCommunityLoading(false);
    }
  }

  async function handleToggleVote(subId: string) {
    if (!user) {
      toast.error('Please sign in to upvote repositories.');
      return;
    }

    // Optimistic UI update
    const alreadyVoted = votedIds.has(subId);
    setVotedIds(prev => {
      const next = new Set(prev);
      if (alreadyVoted) next.delete(subId);
      else next.add(subId);
      return next;
    });

    setSubmissions(prev =>
      prev.map(s => {
        if (s.id === subId) {
          return {
            ...s,
            upvotes: alreadyVoted ? Math.max(0, s.upvotes - 1) : s.upvotes + 1,
          };
        }
        return s;
      })
    );

    try {
      await toggleSubmissionVote(subId);
      toast.success(alreadyVoted ? 'Upvote removed' : 'Repository upvoted!');
    } catch {
      // Revert on failure
      loadCommunityData();
      toast.error('Failed to update vote.');
    }
  }

  async function fetchStars(data: Repo[]) {
    setStarsLoading(true);
    try {
      const metadata = await fetchBatchRepoMetadata(
        data.map(r => ({ owner: r.owner, repo: r.repo }))
      );

      const stars: Record<string, number> = {};
      for (const repo of data) {
        const key = `${repo.owner}/${repo.repo}`;
        stars[key] = metadata[key]?.stars ?? repo.stars ?? 0;
      }
      setRepoStars(stars);
    } catch {
      const stars: Record<string, number> = {};
      for (const repo of data) {
        stars[`${repo.owner}/${repo.repo}`] = repo.stars || 0;
      }
      setRepoStars(stars);
    }
    setStarsLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (isSearching) return;

    try {
      setIsSearching(true);
      setLoading(true);
      setError(false);

      const query = searchQuery.trim();
      const data = query ? await searchRepos(query) : await getRepos();

      setRepos(data);
      await fetchStars(data);
    } catch (err) {
      console.error('Search failed:', err);
      setError(true);
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  }

  async function handleCopyClone(repo: Repo) {
    const cloneCommand = `git clone https://github.com/${repo.owner}/${repo.repo}.git`;
    try {
      await navigator.clipboard.writeText(cloneCommand);
      setCopiedRepo(`${repo.owner}/${repo.repo}`);
      toast.success('Clone command copied to clipboard!');
      setTimeout(() => setCopiedRepo(null), 2000);
    } catch {
      setCopiedRepo(null);
    }
  }

  function formatStars(count: number): string {
    if (count >= 100000) return `${(count / 1000).toFixed(0)}k`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  }

  return (
    <div className="min-h-screen pt-16 bg-[#0A0A0A] font-sans selection:bg-white/20">
      <TargetCursor 
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
        targetSelector=".card-glow, button, a, input"
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center">
        
        {/* -- 1. Hero Section & Branding -- */}
        <motion.div
          className="text-center mb-10 w-full"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium mb-6 backdrop-blur-md">
            <Github className="w-3.5 h-3.5 text-white/80" />
            <span>GRONCKLE Repository Stash</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/50 animate-text-gradient">
            The Stash
          </h1>
          <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto font-medium leading-relaxed">
            Discover, clone, and integrate top-tier community repositories — hoard the best, build the rest.
          </p>
        </motion.div>

        {/* -- 2. Tabs & Actions Bar -- */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('curated')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'curated'
                  ? 'bg-white text-black shadow-lg shadow-white/5'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Curated Vault ({repos.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'community'
                  ? 'bg-white text-black shadow-lg shadow-white/5'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Community Submissions</span>
            </button>
          </div>

          <button
            onClick={() => setIsSubmitOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF6B2B] text-white font-medium text-sm rounded-xl hover:bg-[#FF6B2B]/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#FF6B2B]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Repo</span>
          </button>
        </div>

        {/* -- 3. Curated Vault View -- */}
        {activeTab === 'curated' && (
          <>
            {/* Search Bar */}
            <motion.div
              className="w-full mb-12 relative z-20"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <form onSubmit={handleSearch} className="relative bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden focus-within:border-white/30 transition-colors duration-300 flex items-center p-2 backdrop-blur-xl">
                <div className="pl-4 pr-2">
                  <Search className={`w-5 h-5 ${isSearching || loading ? 'text-blue-400 animate-pulse' : 'text-white/30'}`} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories, frameworks, or tools..."
                  className="flex-1 bg-transparent border-none text-white text-base md:text-lg px-2 py-3 placeholder:text-white/20 focus:outline-none focus:ring-0"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={isSearching || loading}
                  className="mr-2 px-6 py-2.5 bg-white text-black font-semibold text-sm rounded-xl hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  {(isSearching || loading) && searchQuery !== '' ? 'Searching...' : 'Explore'}
                </button>
              </form>
            </motion.div>

            {/* Repos Grid */}
            <div className="w-full">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-6 animate-pulse">
                      <div className="flex justify-between mb-4">
                        <div className="h-6 bg-white/10 w-1/3 rounded" />
                        <div className="h-6 bg-white/10 w-8 rounded-full" />
                      </div>
                      <div className="h-4 bg-white/5 w-full rounded mb-2" />
                      <div className="h-4 bg-white/5 w-2/3 rounded mb-6" />
                      <div className="h-8 bg-white/10 w-full rounded-xl mt-auto" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-md mx-auto">
                  <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                  <p className="text-red-400 font-semibold mb-1">Connection Error</p>
                  <p className="text-white/50 text-sm">Failed to sync with the central database.</p>
                </div>
              ) : repos.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <GitFork className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/60 font-medium mb-2">No repositories found matching "{searchQuery}"</p>
                  <button onClick={() => { setSearchQuery(''); handleSearch({ preventDefault: () => {} } as React.FormEvent); }} className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                    Clear search filters
                  </button>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {repos.map((repo) => {
                    const repoKey = `${repo.owner}/${repo.repo}`;
                    const stars = repoStars[repoKey] || repo.stars || 0;
                    const isCopied = copiedRepo === repoKey;

                    return (
                      <motion.div
                        key={repo.id}
                        variants={itemVariants}
                        className="bg-[#111] border border-white/10 rounded-2xl p-6 card-glow group hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 flex flex-col h-full relative overflow-hidden"
                      >
                        <div className="flex flex-col h-full relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                <GitFork className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <h3 className="text-lg font-bold text-white leading-tight truncate max-w-[120px] sm:max-w-[160px]">{repo.repo}</h3>
                                <p className="text-white/40 text-xs font-medium truncate">{repo.owner}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {/* Report Outdated Button */}
                              <button
                                onClick={() => setReportModal({ open: true, repoId: repo.id, repoName: `${repo.owner}/${repo.repo}` })}
                                className="p-1.5 text-white/20 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                                title="Report outdated or broken repository"
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                              
                              <a
                                href={`https://github.com/${repo.owner}/${repo.repo}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-white/30 hover:text-white transition-colors flex-shrink-0"
                                aria-label={`View ${repo.repo} on GitHub`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>

                          <p className="text-white/50 text-sm mb-6 line-clamp-3 leading-relaxed flex-grow">
                            {repo.description}
                          </p>

                          <div className="mt-auto">
                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                                <Star className="w-3.5 h-3.5 text-yellow-500/70" />
                                <span className="text-white/70 text-xs font-medium">
                                  {starsLoading ? (
                                    <span className="inline-block w-6 h-2 bg-white/10 rounded animate-pulse"></span>
                                  ) : (
                                    formatStars(stars)
                                  )}
                                </span>
                              </div>

                              <button
                                onClick={() => handleCopyClone(repo)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium transition-all ${
                                  isCopied 
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                    : 'bg-[#222] text-white/70 hover:bg-[#333] hover:text-white hover:border-white/20'
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Terminal className="w-3.5 h-3.5" />
                                    <span>Clone</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </>
        )}

        {/* -- 4. Community Submissions View -- */}
        {activeTab === 'community' && (
          <div className="w-full">
            {communityLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-44 bg-[#111] border border-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-24 bg-[#111] border border-white/10 rounded-3xl p-8">
                <Sparkles className="w-10 h-10 text-[#FF6B2B] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No community submissions yet</h3>
                <p className="text-white/40 text-sm max-w-md mx-auto mb-6">
                  Be the first developer to share an underrated open-source gem with the Gronckle stash.
                </p>
                <button
                  onClick={() => setIsSubmitOpen(true)}
                  className="px-6 py-3 bg-[#FF6B2B] text-white font-semibold text-sm rounded-xl hover:bg-[#FF6B2B]/90 transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Submit the First Repo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {submissions.map((sub) => {
                  const hasVoted = votedIds.has(sub.id);

                  return (
                    <motion.div
                      key={sub.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-white/20 transition-all card-glow"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="text-lg font-bold text-white">{sub.title}</h3>
                          <a
                            href={sub.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-white/30 hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>

                        <p className="text-xs text-white/50 mb-4 line-clamp-2 leading-relaxed">
                          {sub.description || 'No description provided.'}
                        </p>

                        {sub.tags && sub.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-6">
                            {sub.tags.slice(0, 4).map(tag => (
                              <span
                                key={tag}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-white/40"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className="text-[11px] text-white/30">
                          {new Date(sub.created_at).toLocaleDateString()}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setReportModal({ open: true, repoId: sub.id, repoName: sub.title })}
                            className="p-1.5 text-white/20 hover:text-red-400 rounded-lg transition-colors"
                            title="Report this submission"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleVote(sub.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                              hasVoted
                                ? 'bg-[#FF6B2B]/10 border-[#FF6B2B]/40 text-[#FF6B2B]'
                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                            }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-current' : ''}`} />
                            <span>{sub.upvotes}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GitHub External Link */}
        <motion.div
           className="mt-16 text-center"
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 0.4, delay: 0.5 }}
        >
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all font-medium text-sm"
          >
            <Github className="w-4 h-4" />
            <span>Explore more on GitHub</span>
            <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
          </a>
        </motion.div>

      </div>

      {/* Submit Repo Modal */}
      <SubmitRepoForm
        open={isSubmitOpen}
        onOpenChange={setIsSubmitOpen}
        shareMessage={(msg) => {
          toast.success(msg);
          if (activeTab === 'community') loadCommunityData();
        }}
      />

      {/* Report Outdated Modal */}
      <ReportOutdatedDialog
        open={reportModal.open}
        onOpenChange={(open) => setReportModal(prev => ({ ...prev, open }))}
        repoId={reportModal.repoId}
        repoName={reportModal.repoName}
        shareMessage={(msg) => toast.success(msg)}
      />
    </div>
  );
}
