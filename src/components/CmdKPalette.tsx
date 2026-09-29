import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { searchTools, type Tool } from '@/lib/supabase';
import { Command, Search, X, ArrowRight } from 'lucide-react';
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

export function CmdKPalette({ onNavigate }: CmdKPaletteProps) {
  const { isAuthenticated, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
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
      setQuery('');
      setTools([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced tool search
  useEffect(() => {
    if (!query.trim()) {
      setTools([]);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(async () => {
      const results = await searchTools(query);
      setTools(results.slice(0, 5));
      setIsSearching(false);
      setSelectedIdx(0);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  // Keyboard navigation
  const allItems = query.trim()
    ? tools
    : pages;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [allItems.length, query, tools, selectedIdx, onNavigate]);

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
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Palette */}
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
            <Search className={`w-5 h-5 flex-shrink-0 ${isSearching ? 'text-blue-400 animate-pulse' : 'text-white/30'}`} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAuthenticated ? `Search tools or navigate, ${profile?.display_name?.split(' ')[0] || 'user'}...` : 'Search tools or navigate...'}
              className="flex-1 bg-transparent text-white text-base placeholder:text-white/25 outline-none"
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

          {/* Results */}
          <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
            {/* Tool search results */}
            {query.trim() && (
              <>
                {isSearching && (
                  <div className="px-4 py-6 text-center text-white/30 text-sm">Searching...</div>
                )}
                {!isSearching && tools.length === 0 && (
                  <div className="px-4 py-6 text-center text-white/30 text-sm">No tools found for "{query}"</div>
                )}
                {!isSearching && tools.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">Tools</div>
                    {tools.map((tool, i) => (
                      <button
                        key={tool.id}
                        data-idx={i}
                        onClick={() => { window.open(tool.url, '_blank', 'noopener'); setOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i === selectedIdx ? 'bg-white/5' : 'hover:bg-white/3'}`}
                        onMouseEnter={() => setSelectedIdx(i)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                          <Search className="w-3.5 h-3.5 text-white/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{tool.title}</div>
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
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">Navigate</div>
                {pages.map((page, i) => (
                  <button
                    key={page.id}
                    data-idx={i}
                    onClick={() => { onNavigate(page.id); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${i === selectedIdx ? 'bg-white/5' : 'hover:bg-white/3'}`}
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
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/10 text-[11px] text-white/20">
            <span className="flex items-center gap-1"><kbd className="px-1 bg-white/5 border border-white/10 rounded text-[10px]">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 bg-white/5 border border-white/10 rounded text-[10px]">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="px-1 bg-white/5 border border-white/10 rounded text-[10px]">esc</kbd> close</span>
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
