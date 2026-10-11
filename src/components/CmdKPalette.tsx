import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { executeHybridSearch, getAutocomplete, type AutocompleteItem } from '@/lib/search';
import type { Tool } from '@/types/database';
import { Command, Search, X, ArrowRight, Sparkles, HelpCircle, Layers } from 'lucide-react';
import type { Page } from '@/types/database';

interface CmdKPaletteProps {
  onNavigate: (page: Page) => void;
}

const pages: { id: Page; label: string; description: string }[] = [
  { id: 'den', label: 'The Den', description: 'Curated tools & tech news' },
  { id: 'smelt', label: 'The Smelt', description: 'AI-powered stack generator' },
  { id: 'stash', label: 'The Stash', description: 'GitHub repository explorer' },
  { id: 'cave', label: 'The Cave', description: 'Contact & support' },
];

const SUGGESTED_QUERIES = ['auth', 'database', 'realtime', 'ui components', 'caching', 'vector search'];

export function CmdKPalette({ onNavigate }: CmdKPaletteProps) {
  const { isAuthenticated, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [autocomplete, setAutocomplete] = useState<AutocompleteItem[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => {
          const next = !prev;
          if (next) {
            setQuery('');
            setTools([]);
            setAutocomplete([]);
            setDidYouMean(null);
            setSelectedIdx(0);
          }
          return next;
        });
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Debounced hybrid search with stale request cancellation
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setTools([]);
      setAutocomplete([]);
      setDidYouMean(null);
      setIsSearching(false);
      return;
    }

    // Cancel prior request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);

    // Instant autocomplete (<50ms)
    getAutocomplete(trimmed, 4).then(items => {
      if (!controller.signal.aborted) {
        setAutocomplete(items);
      }
    });

    const timer = setTimeout(async () => {
      try {
        const result = await executeHybridSearch(trimmed, {
          limit: 6,
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setTools(result.tools);
          setDidYouMean(result.didYouMean);
          setIsSearching(false);
          setSelectedIdx(0);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Keyboard navigation
  const allItems = query.trim() ? tools : pages;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (query.trim() && tools[selectedIdx]) {
          window.open(tools[selectedIdx].url, '_blank', 'noopener');
          setOpen(false);
        } else if (!query.trim() && pages[selectedIdx]) {
          onNavigate(pages[selectedIdx].id);
          setOpen(false);
        }
      }
    },
    [allItems.length, query, tools, selectedIdx, onNavigate]
  );

  // Auto-scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={() => setOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

        {/* Palette Modal */}
        <motion.div
          className="relative w-full max-w-xl bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          initial={{ y: -20, scale: 0.97, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: -20, scale: 0.97, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
            <Search className={`w-5 h-5 flex-shrink-0 ${isSearching ? 'text-[#FF6B2B] animate-pulse' : 'text-white/30'}`} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAuthenticated
                  ? `Search tools, tech, or shortcuts, ${profile?.display_name?.split(' ')[0] || 'user'}...`
                  : 'Search tools, tech stack, or commands...'
              }
              className="flex-1 bg-transparent text-white text-base placeholder:text-white/25 outline-none font-sans"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-white/20 text-xs">
              esc
            </kbd>
          </div>

          {/* Autocomplete Predictions Bar */}
          {autocomplete.length > 0 && query.trim().length >= 2 && (
            <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-white/30 flex items-center gap-1 text-[11px] font-mono">
                <Sparkles className="w-3 h-3 text-[#FF6B2B]" /> MATCHES:
              </span>
              {autocomplete.map(item => (
                <button
                  key={item.id}
                  onClick={() => setQuery(item.name || item.title)}
                  className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center gap-1 shrink-0"
                >
                  <span>{item.name || item.title}</span>
                  {item.category && (
                    <span className="text-[10px] text-white/30 uppercase">{item.category}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Results Area */}
          <div ref={listRef} className="max-h-[380px] overflow-y-auto py-2">
            {/* Tool search results */}
            {query.trim() && (
              <>
                {isSearching && tools.length === 0 && (
                  <div className="px-4 py-8 text-center text-white/40 text-sm flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FF6B2B] animate-ping" />
                    Searching database...
                  </div>
                )}

                {/* Did You Mean suggestion */}
                {didYouMean && (
                  <div className="mx-4 my-2 px-3 py-2 rounded-xl bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 flex items-center justify-between text-xs">
                    <span className="text-white/70 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#FF6B2B]" />
                      Did you mean{' '}
                      <button
                        onClick={() => setQuery(didYouMean)}
                        className="text-[#FF6B2B] font-semibold underline hover:text-white transition-colors ml-1"
                      >
                        "{didYouMean}"
                      </button>
                      ?
                    </span>
                    <button
                      onClick={() => setQuery(didYouMean)}
                      className="px-2 py-0.5 rounded bg-[#FF6B2B] text-white text-[11px] font-medium hover:bg-[#FF6B2B]/90"
                    >
                      Search
                    </button>
                  </div>
                )}

                {!isSearching && tools.length === 0 && (
                  <div className="px-6 py-8 text-center">
                    <div className="text-white/40 text-sm mb-4">
                      No tools found for "<span className="text-white/70">{query}</span>"
                    </div>
                    <div className="text-xs text-white/30 uppercase tracking-wider mb-2 font-mono">
                      Try searching for
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {SUGGESTED_QUERIES.map(sq => (
                        <button
                          key={sq}
                          onClick={() => setQuery(sq)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors"
                        >
                          {sq}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tools.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30 flex items-center justify-between">
                      <span>Vault Tools ({tools.length})</span>
                      <span className="text-white/20 font-mono text-[9px]">Hybrid Ranked</span>
                    </div>
                    {tools.map((tool, i) => (
                      <button
                        key={tool.id}
                        data-idx={i}
                        onClick={() => {
                          window.open(tool.url, '_blank', 'noopener');
                          setOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          i === selectedIdx ? 'bg-white/10' : 'hover:bg-white/5'
                        }`}
                        onMouseEnter={() => setSelectedIdx(i)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#FF6B2B]/10 border border-[#FF6B2B]/20 flex-shrink-0 flex items-center justify-center text-[#FF6B2B]">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white truncate">{tool.name || tool.title}</span>
                            {tool.category && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-white/40 font-mono uppercase">
                                {tool.category}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/40 truncate">{tool.description}</div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Navigation items (no query) */}
            {!query.trim() && (
              <div>
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                  Navigate
                </div>
                {pages.map((page, i) => (
                  <button
                    key={page.id}
                    data-idx={i}
                    onClick={() => {
                      onNavigate(page.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      i === selectedIdx ? 'bg-white/5' : 'hover:bg-white/3'
                    }`}
                    onMouseEnter={() => setSelectedIdx(i)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                      <Command className="w-3.5 h-3.5 text-white/30" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{page.label}</div>
                      <div className="text-xs text-white/40">{page.description}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 text-[11px] text-white/20">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 bg-white/5 border border-white/10 rounded text-[10px]">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 bg-white/5 border border-white/10 rounded text-[10px]">↵</kbd> open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 bg-white/5 border border-white/10 rounded text-[10px]">esc</kbd> close
              </span>
            </div>
            <span className="text-[10px] text-white/30 font-mono">Gronckle Vault Search</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook to programmatically open the palette
export function useCmdK() {
  const open = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  }, []);
  return { open };
}

// Hint badge for nav (shows shortcut)
export function CmdKBadge({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/25 text-xs hover:bg-white/8 hover:text-white/40 transition-colors"
    >
      <Command className="w-3 h-3" />
      <span>K</span>
    </button>
  );
}
