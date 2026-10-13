import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getNews, type NewsItem } from '@/lib/supabase';
import { ExternalLink, Newspaper, ArrowDown, AlertTriangle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { DenStackChat } from '@/components/DenStackChat';
import type { Page } from '@/types/database';

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0, 0, 0.58, 1] as const } },
};

export interface IntelHubProps {
  onNavigate?: (page: Page) => void;
  onOpenTool?: (slug: string) => void;
}

export function IntelHub({ onNavigate, onOpenTool }: IntelHubProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);

  useEffect(() => {
    async function loadNews() {
      try {
        setNewsLoading(true);
        const newsData = await getNews();
        setNews(newsData);
      } catch {
        setNewsError(true);
      } finally {
        setNewsLoading(false);
      }
    }

    loadNews();
  }, []);

  return (
    <div className="min-h-screen pt-16">
      {/* ── Hero Section — Brand Exposure ─────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-[50vh] px-4 border-b border-[#1A1A1A] overflow-hidden">
        {/* Subtle radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,107,43,0.04) 0%, transparent 70%)',
          }}
        />

        <motion.div
          className="text-center relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Tiny badge */}
          <motion.div
            className="mb-8 inline-flex items-center gap-2 px-3 py-1 border border-[#1A1A1A] text-white/30"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Live Den Feed
            </span>
          </motion.div>

          {/* Dragon Logo */}
          <motion.div
            className="mb-6 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
          >
            <Logo className="w-20 h-20 md:w-28 md:h-28 text-white/90 drop-shadow-[0_0_30px_rgba(255,255,255,0.08)]" />
          </motion.div>

          {/* Main brand text */}
          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-[0.08em] text-shimmer-ember"
            style={{ fontFamily: "'Geist Mono', 'JetBrains Mono', monospace" }}
          >
            Gronckle
          </h1>

          {/* Slogan */}
          <p
            className="mt-6 text-base md:text-lg text-white/40 max-w-lg mx-auto leading-relaxed uppercase tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Hoard the Best. Build the Rest.
          </p>

          {/* Sub-stats */}
          <div className="mt-10 flex items-center justify-center gap-8 text-xs text-white/20 uppercase tracking-widest font-mono">
            <span>AI Stack Architect</span>
            <span className="w-px h-4 bg-white/10" />
            <span>Tech Pulse</span>
            <span className="w-px h-4 bg-white/10" />
            <span>Curated Vault</span>
          </div>

          {/* Scroll indicator */}
          <motion.div
            className="mt-12 flex flex-col items-center text-white/15"
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          >
            <ArrowDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Interactive Stack Architect Chat (replaces Highest Rated) ── */}
        <DenStackChat
          onOpenTool={onOpenTool}
          onNavigateToSmelt={(query, _stack) => {
            if (onNavigate) {
              const searchParams = new URLSearchParams(window.location.search);
              if (query) searchParams.set('q', query);
              const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
              window.history.pushState(null, '', newUrl);
              onNavigate('smelt');
            }
          }}
        />

        {/* ── Tech Pulse ───────────────────────────────────────── */}
        <section className="py-12 pb-20">
          <div className="flex items-center gap-2 mb-8">
            <Newspaper className="w-4 h-4 text-white/50" />
            <h2
              className="text-sm font-medium text-white uppercase tracking-wider"
              style={{ fontFamily: "'Geist Mono', 'JetBrains Mono', monospace" }}
            >
              Tech Pulse
            </h2>
          </div>

          {newsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border border-[#1A1A1A] p-4 animate-pulse">
                  <div className="h-3 bg-white/10 w-1/4 mb-2" />
                  <div className="h-4 bg-white/5 w-3/4" />
                </div>
              ))}
            </div>
          ) : newsError ? (
            <div className="border border-red-500/20 p-6 text-center">
              <AlertTriangle className="w-5 h-5 text-red-400/60 mx-auto mb-2" />
              <p className="text-red-400/60 text-xs uppercase tracking-widest font-mono">System Offline</p>
              <p className="text-white/30 text-xs mt-1 font-mono">News feed unavailable</p>
            </div>
          ) : news.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8 font-mono">No news items in the database.</p>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              {news.map((item: NewsItem) => (
                <motion.a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variants={itemVariants}
                  className="block border border-[#1A1A1A] p-4 hover:border-white/20 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className="text-[10px] text-white/25 uppercase tracking-wider font-mono"
                      >
                        {item.source}
                      </span>
                      <h3 className="text-white text-sm mt-1.5 group-hover:text-white/80 transition-colors leading-relaxed">
                        {item.headline}
                      </h3>
                    </div>
                    <ExternalLink className="w-3 h-3 text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0 ml-3 mt-1" />
                  </div>
                </motion.a>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </div>
  );
}
