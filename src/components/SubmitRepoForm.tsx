import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { submitRepo } from '@/lib/community';
import { useAuth } from '@/hooks/use-auth';
import { enrichGitHubRepo, parseGitHubUrl, type EnrichedRepoData } from '@/lib/enrich';
import { Sparkles, Star, GitCommit, Scale, Code2, Loader2, CheckCircle2 } from 'lucide-react';

interface SubmitRepoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareMessage?: (message: string) => void;
}

const CATEGORIES = [
  'frontend',
  'backend',
  'database',
  'auth',
  'devops',
  'ai-ml',
  'security',
  'testing',
  'analytics',
  'documentation',
  'general',
];

export function SubmitRepoForm({ open, onOpenChange, shareMessage }: SubmitRepoFormProps) {
  const { user } = useAuth();
  const [repoUrl, setRepoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [useCases, setUseCases] = useState('');
  const [tags, setTags] = useState('');
  const [enrichedData, setEnrichedData] = useState<EnrichedRepoData | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-enrich when a valid GitHub URL is entered
  useEffect(() => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setEnrichedData(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setEnriching(true);
      setError(null);
      try {
        const enriched = await enrichGitHubRepo(repoUrl);
        if (!isMounted) return;
        setEnrichedData(enriched);
        setTitle(enriched.title);
        setDescription(enriched.description);
        setCategory(enriched.category);
        setUseCases(enriched.use_cases.join(', '));
        setTags(enriched.tags.join(', '));
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Could not auto-enrich from GitHub';
        console.warn('Enrich error:', msg);
      } finally {
        if (isMounted) setEnriching(false);
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [repoUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!repoUrl.startsWith('https://github.com/')) {
      setError('Repo URL must start with https://github.com/');
      return;
    }

    try {
      setLoading(true);
      const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      const parsedUseCases = useCases.split(',').map(u => u.trim()).filter(Boolean);

      const metadata: Record<string, unknown> = {
        category,
        use_cases: parsedUseCases,
        languages: enrichedData?.language ? [enrichedData.language] : [],
        frameworks: enrichedData?.frameworks || [],
        runtime: enrichedData?.runtime || [],
        license: enrichedData?.license || 'MIT',
        stars: enrichedData?.stars || 0,
        open_issues: enrichedData?.open_issues || 0,
        last_commit_date: enrichedData?.last_commit_date || new Date().toISOString(),
        pricing: 'open source',
        self_hostable: true,
      };

      await submitRepo({
        repo_url: repoUrl,
        title,
        description,
        tags: parsedTags,
        metadata,
      });

      if (shareMessage) {
        shareMessage('Repository submitted and enriched successfully!');
      } else {
        alert('Repository submitted successfully!');
      }

      setRepoUrl('');
      setTitle('');
      setDescription('');
      setCategory('general');
      setUseCases('');
      setTags('');
      setEnrichedData(null);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit repository';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border border-white/10 rounded-3xl text-white sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="text-xl font-bold">Submit a Repository</DialogTitle>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF6B2B]/20 text-[#FF6B2B] font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Auto-Enriching
            </span>
          </div>
        </DialogHeader>

        {!user ? (
          <div className="p-6 text-center text-gray-300">
            <p>Sign in with GitHub to submit and curate tools for the vault.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{error}</div>}

            {/* GitHub URL */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  GitHub Repository URL <span className="text-[#FF6B2B]">*</span>
                </label>
                {enriching && (
                  <span className="text-xs text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Fetching GitHub & AI drafts...
                  </span>
                )}
              </div>
              <input
                type="url"
                required
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>

            {/* Auto-detected metrics pill */}
            {enrichedData && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs text-gray-300">
                <span className="flex items-center gap-1 text-amber-300">
                  <Star className="w-3.5 h-3.5" /> {enrichedData.stars.toLocaleString()} stars
                </span>
                {enrichedData.language && (
                  <span className="flex items-center gap-1 text-blue-300">
                    <Code2 className="w-3.5 h-3.5" /> {enrichedData.language}
                  </span>
                )}
                {enrichedData.license && (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <Scale className="w-3.5 h-3.5" /> {enrichedData.license}
                  </span>
                )}
                <span className="flex items-center gap-1 text-gray-400">
                  <GitCommit className="w-3.5 h-3.5" /> {new Date(enrichedData.last_commit_date).toLocaleDateString()}
                </span>
                <span className="ml-auto text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Auto-Enriched
                </span>
              </div>
            )}

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">
                Title / Name <span className="text-[#FF6B2B]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Project Name"
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] transition-colors"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of the tool..."
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] min-h-[80px] transition-colors resize-none"
              />
            </div>

            {/* Use Cases */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">
                Use Cases <span className="text-xs text-gray-500">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={useCases}
                onChange={e => setUseCases(e.target.value)}
                placeholder="e.g. state synchronization, collaborative canvas"
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">
                Tags <span className="text-xs text-gray-500">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="react, typescript, ui, fast"
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#FF6B2B] transition-colors"
              />
            </div>

            {/* Reviewer Note */}
            <div className="text-xs text-gray-400 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
              💡 Review the auto-detected fields above. You can customize the title, tags, and category before saving.
            </div>

            <button
              type="submit"
              disabled={loading || enriching}
              className="mt-2 bg-[#FF6B2B] text-white py-3 rounded-xl hover:bg-[#FF6B2B]/90 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                'Approve & Submit Repository'
              )}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
