import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { getUserStacks, getUserBookmarks, deleteStack, type SavedStack } from '@/lib/auth';
import { getTools, type Tool } from '@/lib/supabase';
import {
  User, Bookmark, Layers, Trash2, ExternalLink,
  Github, Calendar, Eye, EyeOff, Copy, Check,
  ArrowLeft
} from 'lucide-react';

interface ProfilePageProps {
  onBack: () => void;
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, profile, isAuthenticated, signIn } = useAuth();
  const [tab, setTab] = useState<'stacks' | 'bookmarks'>('stacks');
  const [stacks, setStacks] = useState<SavedStack[]>([]);
  const [bookmarkedTools, setBookmarkedTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    async function load() {
      setLoading(true);
      try {
        const [stacksData, bookmarkIds, allTools] = await Promise.all([
          getUserStacks(),
          getUserBookmarks(),
          getTools(),
        ]);
        setStacks(stacksData);
        const bookmarked = allTools.filter(t => bookmarkIds.includes(t.id));
        setBookmarkedTools(bookmarked);
      } catch (e) {
        console.error('Failed to load profile data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAuthenticated]);

  async function handleDeleteStack(id: string) {
    setDeletingId(id);
    try {
      await deleteStack(id);
      setStacks(prev => prev.filter(s => s.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopyShareLink(stackId: string) {
    const url = `${window.location.origin}?stack=${stackId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(stackId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen pt-16 bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Not authenticated */}
        {!isAuthenticated && (
          <div className="text-center py-24">
            <User className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Sign in to view your profile</h2>
            <p className="text-white/40 mb-6">Save stacks, bookmark tools, and track your history.</p>
            <button
              onClick={signIn}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all mx-auto"
            >
              <Github className="w-4 h-4" />
              Sign in with GitHub
            </button>
          </div>
        )}

        {/* Authenticated */}
        {isAuthenticated && (
          <>
            {/* Profile Header */}
            <motion.div
              className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10 p-6 bg-[#111] border border-white/10 rounded-2xl"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-20 h-20 rounded-2xl border-2 border-white/10 object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white/5 border-2 border-white/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-white/30" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">{displayName}</h1>
                  {profile?.role === 'admin' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                {profile?.github_username && (
                  <a
                    href={`https://github.com/${profile.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm mt-1 transition-colors w-fit"
                  >
                    <Github className="w-3.5 h-3.5" />
                    @{profile.github_username}
                  </a>
                )}
                {profile?.bio && (
                  <p className="text-white/50 text-sm mt-2">{profile.bio}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                  {joinDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Joined {joinDate}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {stacks.length} stacks
                  </span>
                  <span className="flex items-center gap-1">
                    <Bookmark className="w-3 h-3" />
                    {bookmarkedTools.length} bookmarks
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
              {(['stacks', 'bookmarks'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    tab === t
                      ? 'bg-white text-black'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {t === 'stacks' ? `Saved Stacks (${stacks.length})` : `Bookmarks (${bookmarkedTools.length})`}
                </button>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}

            {/* Saved Stacks */}
            <AnimatePresence mode="wait">
              {!loading && tab === 'stacks' && (
                <motion.div
                  key="stacks"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {stacks.length === 0 ? (
                    <div className="text-center py-16 text-white/30">
                      <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No saved stacks yet.</p>
                      <p className="text-sm mt-1">Generate a stack in The Smelt and save it!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {stacks.map(stack => (
                        <motion.div
                          key={stack.id}
                          layout
                          className="bg-[#111] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-white text-sm leading-snug flex-1">{stack.title}</h3>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {stack.is_public ? (
                                <span title="Public"><Eye className="w-3.5 h-3.5 text-green-400/60" /></span>
                              ) : (
                                <span title="Private"><EyeOff className="w-3.5 h-3.5 text-white/20" /></span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-white/40 line-clamp-2 mb-3 leading-relaxed">{stack.query}</p>

                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <span className="text-[10px] text-white/25">
                              {new Date(stack.created_at).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {stack.is_public && (
                                <button
                                  onClick={() => handleCopyShareLink(stack.id)}
                                  className="p-1.5 text-white/30 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                                  title="Copy share link"
                                >
                                  {copiedId === stack.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteStack(stack.id)}
                                disabled={deletingId === stack.id}
                                className="p-1.5 text-white/20 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/5 disabled:opacity-50"
                                title="Delete stack"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Bookmarks */}
              {!loading && tab === 'bookmarks' && (
                <motion.div
                  key="bookmarks"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {bookmarkedTools.length === 0 ? (
                    <div className="text-center py-16 text-white/30">
                      <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No bookmarks yet.</p>
                      <p className="text-sm mt-1">Bookmark tools in The Smelt to find them here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bookmarkedTools.map(tool => (
                        <motion.div
                          key={tool.id}
                          layout
                          className="bg-[#111] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-white text-sm leading-snug flex-1">{tool.title}</h3>
                            <a
                              href={tool.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white/20 hover:text-white transition-colors flex-shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <p className="text-xs text-white/40 line-clamp-2 mb-3 leading-relaxed">{tool.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {tool.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[10px] px-2 py-0.5 bg-white/5 text-white/30 rounded-full border border-white/5">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
