import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchTools, incrementLikes, decrementLikes, getComments, addComment, subscribeToToolLikes, subscribeToNewTools, type Tool, type Comment } from '@/lib/supabase';
import { toggleBookmark, getUserBookmarks } from '@/lib/auth';
import { useAuth } from '@/hooks/use-auth';
import { Search, Heart, MessageSquare, Share2, ExternalLink, Send, BookOpen, Star, Scale, AlertTriangle, Layers, Bookmark, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToolFilters } from '@/components/ToolFilters';
import { fetchFilterCountsFromSql } from '@/lib/search';
import TargetCursor from '@/components/TargetCursor';
import {
  type FilterState,
  type FilterCounts,
  DEFAULT_FILTER_STATE,
  parseFiltersFromUrl,
  serializeFiltersToUrl,
  computeFilterCounts,
  getMaintenanceStatus,
} from '@/lib/filters';

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

// localStorage key for liked tools
const LIKES_KEY = 'gronckle-liked-tools';

function loadLikedTools(): Set<string> {
  try {
    const data = localStorage.getItem(LIKES_KEY);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch {
    return new Set();
  }
}

function saveLikedTools(liked: Set<string>) {
  localStorage.setItem(LIKES_KEY, JSON.stringify([...liked]));
}

export function TheForge() {
  const { isAuthenticated, userLikes } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [filters, setFilters] = useState<FilterState>(() =>
    parseFiltersFromUrl(new URLSearchParams(window.location.search))
  );
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [likedTools, setLikedTools] = useState<Set<string>>(loadLikedTools);
  const [bookmarkedTools, setBookmarkedTools] = useState<Set<string>>(new Set());
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [animatingHeart, setAnimatingHeart] = useState<string | null>(null);
  const [sqlCounts, setSqlCounts] = useState<FilterCounts | null>(null);

  // Sync filters to URL query string
  useEffect(() => {
    const url = new URL(window.location.href);
    const serialized = serializeFiltersToUrl(filters);
    url.search = serialized;
    window.history.replaceState({}, '', url.toString());
  }, [filters]);

  // Load SQL facet counts on mount
  useEffect(() => {
    fetchFilterCountsFromSql()
      .then(counts => {
        if (counts) setSqlCounts(counts as unknown as FilterCounts);
      })
      .catch(() => {});
  }, []);

  // Debounced SQL search whenever any filter or search query changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setFetchError(false);
        const searchParams = {
          category: filters.category,
          subcategories: filters.subcategories,
          languages: filters.languages,
          frameworks: filters.frameworks,
          license: filters.license,
          pricing: filters.pricing,
          selfHostable: filters.selfHostable,
          type: filters.type,
          minStars: filters.minStars,
          tags: filters.tags,
          maintenance: filters.maintenance,
          sort: filters.sort,
        };
        const results = await searchTools(filters.search.trim(), {
          filters: searchParams,
          limit: 100,
        });
        setTools(results);
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [filters]);



  // Cache comments per tool so they persist across dialog opens
  const commentsCache = useRef<Record<string, Comment[]>>({});

  useEffect(() => {
    // Realtime subscription for live likes updates
    const unsubscribeLikes = subscribeToToolLikes(({ id, likes_count }) => {
      setTools(prev => prev.map(tool =>
        tool.id === id ? { ...tool, likes_count } : tool
      ));
    });

    // Realtime subscription for new tool additions
    const unsubscribeNew = subscribeToNewTools((newTool) => {
      setTools(prev => {
        // Avoid duplicates if the tool was added locally
        if (prev.some(t => t.id === newTool.id)) return prev;
        return [newTool, ...prev];
      });
    });

    return () => {
      unsubscribeLikes();
      unsubscribeNew();
    };
  }, []);

  // Load bookmarks when authenticated
  useEffect(() => {
    if (!isAuthenticated) { setBookmarkedTools(new Set()); return; }
    getUserBookmarks().then(ids => setBookmarkedTools(new Set(ids))).catch(() => {});
  }, [isAuthenticated]);

  // Sync liked tools from server when authenticated
  useEffect(() => {
    if (isAuthenticated && userLikes.size > 0) {
      setLikedTools(prev => new Set([...prev, ...userLikes]));
    }
  }, [isAuthenticated, userLikes]);

  // Toggle bookmark
  async function handleBookmark(toolId: string) {
    if (!isAuthenticated) {
      setShareMessage('Sign in to bookmark tools');
      setTimeout(() => setShareMessage(null), 2000);
      return;
    }
    try {
      const isNowBookmarked = await toggleBookmark(toolId);
      setBookmarkedTools(prev => {
        const next = new Set(prev);
        if (isNowBookmarked) next.add(toolId);
        else next.delete(toolId);
        return next;
      });
      setShareMessage(isNowBookmarked ? 'Bookmarked!' : 'Bookmark removed');
      setTimeout(() => setShareMessage(null), 1800);
    } catch {
      setShareMessage('Failed to bookmark');
      setTimeout(() => setShareMessage(null), 2000);
    }
  }





  // Random tool suggestion for empty search results
  // (Removed to clean up unused variable warning)

  async function handleLike(toolId: string) {
    // Heart pop animation
    setAnimatingHeart(toolId);
    setTimeout(() => setAnimatingHeart(null), 400);

    if (likedTools.has(toolId)) {
      // ── Unlike: optimistic UI ──
      const prevLiked = new Set(likedTools);
      const newLiked = new Set(likedTools);
      newLiked.delete(toolId);
      setLikedTools(newLiked);
      saveLikedTools(newLiked);

      setTools(prev => prev.map(tool =>
        tool.id === toolId ? { ...tool, likes_count: Math.max(0, tool.likes_count - 1) } : tool
      ));

      try {
        await decrementLikes(toolId);
        console.log('Vault Updated: Unlike registered.');
      } catch (error) {
        // Revert optimistic UI on failure
        console.error('Unlike failed to save:', error);
        setLikedTools(prevLiked);
        saveLikedTools(prevLiked);
        setTools(prev => prev.map(tool =>
          tool.id === toolId ? { ...tool, likes_count: tool.likes_count + 1 } : tool
        ));
      }
    } else {
      // ── Like: optimistic UI ──
      const prevLiked = new Set(likedTools);
      const newLiked = new Set(likedTools).add(toolId);
      setLikedTools(newLiked);
      saveLikedTools(newLiked);

      setTools(prev => prev.map(tool =>
        tool.id === toolId ? { ...tool, likes_count: tool.likes_count + 1 } : tool
      ));

      try {
        await incrementLikes(toolId);
        console.log('Vault Updated: Like registered.');
      } catch (error) {
        // Revert optimistic UI on failure
        console.error('Like failed to save:', error);
        setLikedTools(prevLiked);
        saveLikedTools(prevLiked);
        setTools(prev => prev.map(tool =>
          tool.id === toolId ? { ...tool, likes_count: Math.max(0, tool.likes_count - 1) } : tool
        ));
      }
    }
  }

  async function handleShare(tool: Tool) {
    const url = `${window.location.origin}/smelt?tool=${tool.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage('Link copied to clipboard');
      setTimeout(() => setShareMessage(null), 2000);
    } catch {
      setShareMessage('Failed to copy link');
      setTimeout(() => setShareMessage(null), 2000);
    }
  }

  async function openComments(tool: Tool) {
    setSelectedTool(tool);
    setShowComments(true);

    // If we have cached comments for this tool, show them immediately
    const cached = commentsCache.current[tool.id];
    if (cached && cached.length > 0) {
      setComments(cached);
    }

    // Fetch fresh from server and merge
    try {
      const serverData = await getComments(tool.id);

      // Merge: keep any locally-added comments not in server data
      const serverIds = new Set(serverData.map((c: Comment) => c.id));
      const localOnly = (cached || []).filter((c: Comment) => !serverIds.has(c.id));
      const merged = [...localOnly, ...serverData];

      setComments(merged);
      commentsCache.current[tool.id] = merged;
    } catch {
      if (!cached || cached.length === 0) {
        setComments([]);
      }
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTool || !newComment.trim() || !commentAuthor.trim()) return;

    let newCommentObj: Comment;

    try {
      const added = await addComment({
        tool_id: selectedTool.id,
        author: commentAuthor,
        content: newComment.trim(),
        parent_id: null,
      });
      if (!added) throw new Error('Return data was null');
      newCommentObj = added;
    } catch {
      // Create local comment as fallback
      newCommentObj = {
        id: `local-${Date.now()}`,
        tool_id: selectedTool.id,
        author: commentAuthor,
        content: newComment.trim(),
        parent_id: null,
        created_at: new Date().toISOString(),
      };
    }

    // Update state and cache
    const updated = [newCommentObj, ...comments];
    setComments(updated);
    commentsCache.current[selectedTool.id] = updated;
    setNewComment('');
  }

  const counts = sqlCounts || computeFilterCounts(tools);
  const filteredTools = tools;

  return (
    <div className="min-h-screen pt-16 bg-black font-sans selection:bg-[#FF6B2B]/20">
      <TargetCursor 
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
        targetSelector=".card-glow, button, a, input, select, textarea"
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
            <Filter className="w-3.5 h-3.5 text-[#FF6B2B]" />
            <span>292 tools &mdash; filter, search, explore</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/50 animate-text-gradient">
            The Smelt
          </h1>
          <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed">
            Dig through hundreds of hand-picked dev tools. Filter by category, language, license, and more — find what actually fits your stack.
          </p>
        </motion.div>

        {/* -- 4. Search & Tools Grid -- */}
        <div className="w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-white/50" />
                The Vault
              </h2>
              <p className="text-xs text-white/40 mt-1">
                Filter and discover curated tools, libraries, and open-source infrastructure.
              </p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search tools by name, tag, or tech..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full bg-[#111] border border-white/10 text-white pl-11 pr-4 py-2.5 rounded-xl text-sm placeholder:text-white/30 focus:border-[#FF6B2B] focus:ring-1 focus:ring-[#FF6B2B]/20 transition-all"
              />
            </div>
          </div>

          <ToolFilters
            filters={filters}
            counts={counts}
            totalFiltered={filteredTools.length}
            totalAll={tools.length}
            onChange={(updated) => setFilters(prev => ({ ...prev, ...updated }))}
            onReset={() => setFilters(DEFAULT_FILTER_STATE)}
          />

          {/* Grid Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-[#111] border border-white/5 rounded-2xl p-6 animate-pulse">
                  <div className="h-5 bg-white/10 w-1/3 rounded mb-3" />
                  <div className="h-4 bg-white/5 w-full rounded mb-2" />
                  <div className="h-4 bg-white/5 w-2/3 rounded mb-6" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-white/5 w-16 rounded-full" />
                    <div className="h-6 bg-white/5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-md mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 font-semibold mb-1">Connection Error</p>
              <p className="text-white/50 text-sm">Failed to sync with the central database.</p>
            </div>
          ) : filteredTools.length === 0 ? (
             <div className="text-center py-16 bg-white/[0.01] border border-white/5 rounded-3xl p-8">
               <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                 <Search className="w-7 h-7 text-white/30" />
               </div>
               <p className="text-white/70 font-semibold mb-1 text-base">
                 No tools match your current filter selection
               </p>
               <p className="text-white/40 text-xs max-w-md mx-auto mb-6">
                 Try broadening your filters or clearing tags and framework constraints.
               </p>
               <div className="flex flex-wrap items-center justify-center gap-3">
                 <button
                   onClick={() => setFilters(DEFAULT_FILTER_STATE)}
                   className="px-4 py-2 rounded-xl bg-[#FF6B2B] text-white text-xs font-semibold hover:bg-[#FF6B2B]/90 transition-colors"
                 >
                   Clear All Filters
                 </button>
                 <button
                   onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                   className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-medium hover:bg-white/10 transition-colors"
                 >
                   Reset Search Query
                 </button>
               </div>
             </div>
          ) : (
            <motion.div
               className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
               variants={containerVariants}
               initial="hidden"
               animate="visible"
             >
              <AnimatePresence mode="popLayout">
                {filteredTools.map((tool) => {
                  const maint = getMaintenanceStatus(tool.last_commit_date);
                  return (
                    <motion.div
                      key={tool.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                      className="bg-[#111] border border-white/10 rounded-2xl p-6 card-glow group hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 flex flex-col h-full"
                    >
                      <div className="flex flex-col h-full">
                        {/* Header: Icon, Category & Link */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#FF6B2B]/10 group-hover:border-[#FF6B2B]/30 transition-colors text-white/70 group-hover:text-[#FF6B2B]">
                              <Layers className="w-5 h-5 transition-colors" />
                            </div>
                            {tool.category && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 font-mono uppercase">
                                {tool.category}
                              </span>
                            )}
                          </div>
                          <a
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 -m-2 text-white/30 hover:text-white transition-colors"
                            aria-label={`Visit ${tool.name || tool.title} website`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                        
                        {/* Title & Description */}
                        <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-[#FF6B2B] transition-colors">
                          <a
                            href={`/tool/${tool.slug || (tool.name || tool.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                            onClick={(e) => {
                              e.preventDefault();
                              const s = tool.slug || (tool.name || tool.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                              window.history.pushState(null, '', `/tool/${s}`);
                              window.dispatchEvent(new PopStateEvent('popstate'));
                            }}
                            className="hover:underline"
                          >
                            {tool.name || tool.title}
                          </a>
                        </h3>
                        <p className="text-white/50 text-sm mb-4 line-clamp-3 leading-relaxed flex-grow">
                          {tool.description}
                        </p>

                        {/* Metadata Pills */}
                        <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] text-white/40">
                          {typeof tool.stars === 'number' && tool.stars > 0 && (
                            <span className="flex items-center gap-1 text-amber-300 font-medium">
                              <Star className="w-3 h-3 fill-current" />
                              {tool.stars.toLocaleString()}
                            </span>
                          )}
                          {tool.license && (
                            <span className="flex items-center gap-1 text-emerald-300">
                              <Scale className="w-3 h-3" />
                              {tool.license}
                            </span>
                          )}
                          {tool.pricing && (
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-white/50 capitalize">
                              {tool.pricing}
                            </span>
                          )}
                          <span className="flex items-center gap-1 ml-auto">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                maint === 'active'
                                  ? 'bg-emerald-400'
                                  : maint === 'slowing'
                                  ? 'bg-amber-400'
                                  : 'bg-zinc-500'
                              }`}
                            />
                            <span className="capitalize">{maint}</span>
                          </span>
                        </div>

                        {/* Frameworks & Tags */}
                        <div className="mt-auto">
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {(tool.frameworks || []).slice(0, 2).map((fw) => (
                              <span
                                key={fw}
                                className="text-[10px] font-medium text-blue-300 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md"
                              >
                                {fw}
                              </span>
                            ))}
                            {(tool.tags || []).slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="text-[10px] font-medium text-white/60 px-2 py-0.5 bg-white/5 border border-white/10 rounded-md"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/10">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleLike(tool.id)}
                                className={`p-2 -ml-2 rounded-full hover:bg-white/10 transition-all ${
                                  likedTools.has(tool.id)
                                    ? 'text-red-500 hover:text-red-400'
                                    : 'text-white/40 hover:text-white'
                                }`}
                                aria-label={`Like ${tool.name || tool.title}`}
                              >
                                <Heart
                                  className={`w-4 h-4 ${likedTools.has(tool.id) ? 'fill-current' : ''} ${
                                    animatingHeart === tool.id ? 'heart-pop scale-125' : ''
                                  }`}
                                />
                              </button>
                              <span className="text-sm font-medium text-white/50 min-w-[1.5rem]">
                                {tool.likes_count}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openComments(tool)}
                                className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                aria-label={`View comments for ${tool.name || tool.title}`}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleBookmark(tool.id)}
                                className={`p-2 rounded-full transition-all ${
                                  bookmarkedTools.has(tool.id)
                                    ? 'text-yellow-400 hover:text-yellow-300'
                                    : 'text-white/40 hover:text-white hover:bg-white/10'
                                }`}
                                aria-label={`Bookmark ${tool.name || tool.title}`}
                              >
                                <Bookmark className={`w-4 h-4 ${bookmarkedTools.has(tool.id) ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                onClick={() => handleShare(tool)}
                                className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                aria-label={`Share ${tool.name || tool.title}`}
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Comments Dialog... */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="bg-[#111] border border-white/10 max-w-lg max-h-[80vh] overflow-hidden rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-white text-xl font-bold flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-white/50" />
              Community Notes
            </DialogTitle>
            <p className="text-white/50 text-sm mt-1">Discussions regarding {selectedTool?.title}</p>
          </DialogHeader>

          <div className="flex flex-col h-full">
            <form onSubmit={handleSubmitComment} className="mb-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-white/30 transition-colors">
                <input
                  type="text"
                  placeholder="Display name"
                  value={commentAuthor}
                  onChange={(e) => setCommentAuthor(e.target.value)}
                  className="w-full bg-transparent text-white px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none mb-1 font-medium"
                />
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="Add a note or review..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-transparent text-white px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || !commentAuthor.trim()}
                    className="p-2 bg-white text-black rounded-xl hover:bg-white/90 transition-all disabled:opacity-50 disabled:hover:scale-100 hover:scale-[1.05] active:scale-[0.95]"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-5 h-5 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">No notes yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-semibold">{comment.author}</span>
                      <span className="text-white/40 text-xs font-medium bg-white/5 px-2 py-0.5 rounded-full">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {shareMessage && (
          <motion.div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full text-sm font-bold shadow-2xl z-50 flex items-center gap-2"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Star className="w-4 h-4" />
            {shareMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
