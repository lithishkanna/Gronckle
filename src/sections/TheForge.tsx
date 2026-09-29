import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTools, searchTools, incrementLikes, decrementLikes, getComments, addComment, subscribeToToolLikes, subscribeToNewTools, type Tool, type Comment } from '@/lib/supabase';
import { generateStackWithAI, exportAsPackageJson, exportAsReadme, fetchSimilarStacks, type LLMStackResult, type SimilarToolResult } from '@/lib/api';
import { saveStack, toggleBookmark, getUserBookmarks } from '@/lib/auth';
import { useAuth } from '@/hooks/use-auth';
import { Search, Heart, MessageSquare, Share2, ExternalLink, Send, Sparkles, AlertTriangle, ArrowRight, Layers, Terminal as TerminalIcon, BookOpen, Save, FileJson, FileText, Copy, Check, Bookmark } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TargetCursor from '@/components/TargetCursor';

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
  const [searchQuery, setSearchQuery] = useState('');
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

  // Oracle state
  const [oracleInput, setOracleInput] = useState('');
  const [oracleResult, setOracleResult] = useState<LLMStackResult | null>(null);
  const [similarTools, setSimilarTools] = useState<SimilarToolResult[]>([]);
  const [similarMethod, setSimilarMethod] = useState<'vector' | 'tags' | 'keyword'>('vector');
  const [oracleLoading, setOracleLoading] = useState(false);
  const [oracleDisplayText, setOracleDisplayText] = useState('');
  const [oracleTypingDone, setOracleTypingDone] = useState(false);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Save & Export state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedExport, setCopiedExport] = useState<'json' | 'readme' | null>(null);

  // Cache comments per tool so they persist across dialog opens
  const commentsCache = useRef<Record<string, Comment[]>>({});

  useEffect(() => {
    loadTools();

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

  async function loadTools() {
    try {
      setLoading(true);
      setFetchError(false);
      const data = await getTools();
      setTools(data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

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

  // Oracle query handler — uses real LLM for authenticated users, local fallback otherwise
  async function handleOracleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!oracleInput.trim() || oracleLoading || tools.length === 0) return;

    // Reset previous result
    setOracleResult(null);
    setSimilarTools([]);
    setOracleDisplayText('');
    setOracleTypingDone(false);
    setSaveSuccess(false);
    if (typingRef.current) clearInterval(typingRef.current);

    setOracleLoading(true);
    try {
      const result = await generateStackWithAI(oracleInput, tools);
      setOracleResult(result);

      // Asynchronously fetch vector-similar stacks
      if (result?.tool?.id) {
        fetchSimilarStacks({ tool_id: result.tool.id, limit: 3 })
          .then(res => {
            setSimilarTools(res.data);
            setSimilarMethod(res.method);
          })
          .catch(() => {});
      }

      // Start typing animation for reasoning text
      let charIndex = 0;
      const fullText = result.reasoning;
      setOracleDisplayText('');
      typingRef.current = setInterval(() => {
        charIndex++;
        if (charIndex <= fullText.length) {
          setOracleDisplayText(fullText.slice(0, charIndex));
        } else {
          if (typingRef.current) clearInterval(typingRef.current);
          setOracleTypingDone(true);
        }
      }, 18);
    } catch {
      setOracleResult(null);
    } finally {
      setOracleLoading(false);
    }
  }

  // Save generated stack to user's profile
  async function handleSaveStack() {
    if (!oracleResult || !isAuthenticated || isSaving) return;
    setIsSaving(true);
    try {
      await saveStack({
        title: `${oracleResult.tool.title} Stack`,
        query: oracleInput,
        result: oracleResult as unknown as Record<string, unknown>,
        is_public: false,
      });
      setSaveSuccess(true);
      setShareMessage('Stack saved to your profile!');
      setTimeout(() => setShareMessage(null), 2500);
    } catch (error) {
      console.error('Failed to save stack:', error);
      setShareMessage('Failed to save stack');
      setTimeout(() => setShareMessage(null), 2500);
    } finally {
      setIsSaving(false);
    }
  }

  // Export stack as package.json or README
  async function handleExport(format: 'json' | 'readme') {
    if (!oracleResult) return;
    const content = format === 'json'
      ? exportAsPackageJson(oracleResult)
      : exportAsReadme(oracleResult, oracleInput);
    
    try {
      await navigator.clipboard.writeText(content);
      setCopiedExport(format);
      setShareMessage(`${format === 'json' ? 'package.json' : 'README.md'} copied to clipboard!`);
      setTimeout(() => {
        setCopiedExport(null);
        setShareMessage(null);
      }, 2500);
    } catch {
      // Fallback: download as file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'json' ? 'package.json' : 'README.md';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // Backend fuzzy search with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      if (!searchQuery.trim()) {
        const data = await getTools();
        setTools(data);
      } else {
        const results = await searchTools(searchQuery.trim());
        setTools(results);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

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

  return (
    <div className="min-h-screen pt-16 bg-[#0A0A0A] font-sans selection:bg-white/20">
      <TargetCursor 
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
        targetSelector=".card-glow, button, a"
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center">
        
        {/* -- 1. Hero Section & Branding -- */}
        <motion.div
          className="text-center mb-12 w-full"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>AI-Powered Stack Generator</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/50 animate-text-gradient">
            The Smelt
          </h1>
          <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto font-medium leading-relaxed">
            Describe your project, and our Oracle will smelt the perfect modern development stack in seconds.
          </p>
        </motion.div>

        {/* -- 2. The Generator Input (Oracle) -- */}
        <motion.div
          className="w-full max-w-3xl mb-16 relative z-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
          <form onSubmit={handleOracleQuery} className="relative bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden focus-within:border-white/30 transition-colors duration-300 flex items-center p-2 backdrop-blur-xl">
            <div className="pl-4 pr-2">
              <Sparkles className={`w-6 h-6 ${oracleLoading ? 'text-blue-400 animate-spin' : 'text-white/30 animate-float'}`} />
            </div>
            <input
              type="text"
              value={oracleInput}
              onChange={(e) => setOracleInput(e.target.value)}
              placeholder="e.g., I need a scalable real-time chat app with a dark UI..."
              className="flex-1 bg-transparent border-none text-white text-lg px-2 py-4 placeholder:text-white/20 focus:outline-none focus:ring-0"
              disabled={oracleLoading}
            />
            <button
              type="submit"
              disabled={!oracleInput.trim() || oracleLoading}
              className="mr-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
            >
              {oracleLoading ? 'Architecting...' : 'Generate Stack'}
              {!oracleLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </motion.div>

        {/* -- 3. Recommendation Results -- */}
        <AnimatePresence mode="wait">
          {oracleResult && (
            <motion.div
              key="oracle-result"
              className="w-full max-w-4xl mb-24"
              initial={{ opacity: 0, height: 0, y: 20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <div className="bg-[#111]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  
                  {/* Left Column: Recommended Tool Info */}
                  <div className="w-full md:w-1/3 flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                        <Layers className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{oracleResult.tool.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium tracking-wide uppercase">
                            {oracleResult.confidence} Match
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {oracleResult.tool.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-3 py-1 text-xs font-medium bg-white/5 border border-white/10 rounded-full text-white/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-white/50 text-sm">
                      <Heart className="w-4 h-4" /> 
                      <span>{oracleResult.tool.likes_count} developers use this</span>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-white/10">
                      {isAuthenticated && (
                        <button 
                          onClick={handleSaveStack}
                          disabled={isSaving || saveSuccess}
                          className={`w-full py-3 px-4 font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${
                            saveSuccess 
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                              : 'bg-white text-black hover:bg-white/90'
                          }`}
                        >
                          {saveSuccess ? (
                            <><Check className="w-4 h-4" /> Saved</>
                          ) : isSaving ? (
                            <><Save className="w-4 h-4 animate-spin" /> Saving...</>
                          ) : (
                            <><Save className="w-4 h-4" /> Save Stack</>
                          )}
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleExport('json')}
                          className="flex-1 py-2.5 px-4 bg-[#222] text-white font-medium rounded-xl border border-white/10 hover:bg-[#333] transition-all hover:border-white/20 flex items-center justify-center gap-2"
                        >
                          {copiedExport === 'json' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <FileJson className="w-3.5 h-3.5" />}
                          package.json
                        </button>
                        <button 
                          onClick={() => handleExport('readme')}
                          className="flex-1 py-2.5 px-4 bg-[#222] text-white font-medium rounded-xl border border-white/10 hover:bg-[#333] transition-all hover:border-white/20 flex items-center justify-center gap-2"
                        >
                          {copiedExport === 'readme' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <FileText className="w-3.5 h-3.5" />}
                          README.md
                        </button>
                      </div>
                      <a 
                        href={oracleResult.tool.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 bg-[#222] text-white font-medium rounded-xl border border-white/10 hover:bg-[#333] transition-all hover:border-white/20 flex items-center justify-center gap-2"
                      >
                        Docs <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Right Column: AI Reasoning + Stack Details */}
                  <div className="w-full md:w-2/3 flex flex-col h-full pl-0 md:pl-8 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <h4 className="text-lg font-semibold text-white">Why this stack?</h4>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <p className={`text-white/70 text-base leading-relaxed ${!oracleTypingDone ? 'oracle-typing-cursor' : ''}`}>
                        {oracleDisplayText}
                      </p>
                    </div>

                    {/* Suggested Stack Table */}
                    {oracleTypingDone && oracleResult.suggested_stack && oracleResult.suggested_stack.length > 0 && (
                      <motion.div
                        className="mt-6"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <h5 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5" />
                          Full Stack Breakdown
                        </h5>
                        <div className="space-y-2">
                          {oracleResult.suggested_stack.map((item, i) => (
                            <div key={i} className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-xl px-4 py-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 mt-0.5 min-w-[70px]">{item.category}</span>
                              <div>
                                <span className="text-sm font-semibold text-white">{item.tool}</span>
                                <p className="text-xs text-white/40 mt-0.5">{item.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Setup Commands */}
                    {oracleTypingDone && oracleResult.setup_commands && oracleResult.setup_commands.length > 0 && (
                      <motion.div
                        className="mt-6"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                      >
                        <h5 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <TerminalIcon className="w-3.5 h-3.5" />
                          Quick Setup
                        </h5>
                        <div className="bg-black/50 border border-white/10 rounded-xl p-4 font-mono text-sm">
                          {oracleResult.setup_commands.map((cmd, i) => (
                            <div key={i} className="flex items-start gap-2 py-0.5">
                              <span className="text-green-400/60 select-none">$</span>
                              <span className="text-white/70">{cmd}</span>
                            </div>
                          ))}
                          <button
                            onClick={async () => {
                              const cmds = oracleResult!.setup_commands.join('\n');
                              await navigator.clipboard.writeText(cmds);
                              setShareMessage('Commands copied!');
                              setTimeout(() => setShareMessage(null), 2000);
                            }}
                            className="mt-3 text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy all
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Vector Search: Similar Recommendations */}
                    {oracleTypingDone && similarTools.length > 0 && (
                      <motion.div
                        className="mt-6 pt-6 border-t border-white/10"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-[#FF6B2B]" />
                            Similar Stacks (Vector Embeddings)
                          </h5>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/5 text-[#FF6B2B] border border-[#FF6B2B]/20">
                            {similarMethod === 'vector' ? 'pgvector Cosine 0.7+' : 'Semantic Match'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {similarTools.map((sim) => (
                            <a
                              key={sim.id}
                              href={sim.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl transition-all block group"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-white group-hover:text-[#FF6B2B] transition-colors truncate">
                                  {sim.title}
                                </span>
                                <ExternalLink className="w-3 h-3 text-white/30 group-hover:text-white" />
                              </div>
                              <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">
                                {sim.description}
                              </p>
                            </a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* -- 4. Search & Tools Grid -- */}
        <div className="w-full">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-white/50" />
              Explore Components
            </h2>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111] border border-white/10 text-white pl-11 pr-4 py-2.5 rounded-xl text-sm placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>
          </div>

          {/* Grid... */}
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
          ) : tools.length === 0 ? (
             <div className="text-center py-20">
               <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                 <Search className="w-8 h-8 text-white/20" />
               </div>
               <p className="text-white/60 font-medium mb-2">No components found matching "{searchQuery}"</p>
               <button onClick={() => setSearchQuery('')} className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
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
              <AnimatePresence mode="popLayout">
                {tools.map((tool) => (
                  <motion.div
                    key={tool.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                    className="bg-[#111] border border-white/10 rounded-2xl p-6 card-glow group hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-white/5 flex flex-col h-full"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <Layers className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                        </div>
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 -m-2 text-white/30 hover:text-white transition-colors"
                          aria-label={`Visit ${tool.title} website`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-2">{tool.title}</h3>
                      <p className="text-white/50 text-sm mb-6 line-clamp-3 leading-relaxed flex-grow">{tool.description}</p>

                      <div className="mt-auto">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {tool.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[10px] font-medium text-white/60 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleLike(tool.id)}
                              className={`p-2 -ml-2 rounded-full hover:bg-white/10 transition-all ${likedTools.has(tool.id) ? 'text-red-500 hover:text-red-400' : 'text-white/40 hover:text-white'}`}
                              aria-label={`Like ${tool.title}`}
                            >
                              <Heart
                                className={`w-4 h-4 ${likedTools.has(tool.id) ? 'fill-current' : ''} ${animatingHeart === tool.id ? 'heart-pop scale-125' : ''}`}
                              />
                            </button>
                            <span className="text-sm font-medium text-white/50 min-w-[1.5rem]">
                              {tool.likes_count}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openComments(tool)}
                              className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
                              aria-label={`View comments for ${tool.title}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleBookmark(tool.id)}
                              className={`p-2 rounded-full transition-all ${bookmarkedTools.has(tool.id) ? 'text-yellow-400 hover:text-yellow-300' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
                              aria-label={`Bookmark ${tool.title}`}
                            >
                              <Bookmark className={`w-4 h-4 ${bookmarkedTools.has(tool.id) ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              onClick={() => handleShare(tool)}
                              className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all"
                              aria-label={`Share ${tool.title}`}
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
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
            <Sparkles className="w-4 h-4" />
            {shareMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
