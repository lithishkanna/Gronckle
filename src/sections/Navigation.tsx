import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Github } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { UserMenu } from '@/components/UserMenu';
import { CmdKBadge } from '@/components/CmdKPalette';
import type { Page } from '@/types/database';

interface NavigationProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  introComplete: boolean;
  onProfileOpen: () => void;
}

const navItems: { id: Page; label: string }[] = [
  { id: 'den', label: 'Den' },
  { id: 'smelt', label: 'Smelt' },
  { id: 'stash', label: 'Stash' },
  { id: 'cave', label: 'Cave' },
];

export function Navigation({ currentPage, onPageChange, introComplete, onProfileOpen }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleNav(page: Page) {
    onPageChange(page);
    setMobileOpen(false);
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-sm border-b border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo — centered SVG mascot */}
            <button
              onClick={() => handleNav('den')}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <Logo className="w-11 h-11 text-white" />
              <div className="flex flex-col">
                <motion.span
                  layoutId="logo"
                  className="text-white font-bold text-lg uppercase block tracking-[0.15em]"
                  style={{ fontFamily: "'Geist Mono', 'JetBrains Mono', monospace" }}
                >
                  GRONCKLE
                </motion.span>
                <span
                  className="text-white/25 text-[8px] uppercase tracking-[0.25em] hidden sm:block leading-none mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Hoard the Best. Build the Rest.
                </span>
              </div>
            </button>

            {/* Desktop Nav Links */}
            <motion.div
              className="hidden sm:flex items-center space-x-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: introComplete ? 1 : 0 }}
              transition={{ duration: 0.5, delay: introComplete ? 0.3 : 0 }}
            >
              {navItems.map((item) => {
                const isActive = currentPage === item.id ||
                  (item.id === 'den' && currentPage === 'intel') ||
                  (item.id === 'smelt' && currentPage === 'forge') ||
                  (item.id === 'stash' && currentPage === 'source') ||
                  (item.id === 'cave' && currentPage === 'terminal');
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`relative px-4 py-2 text-sm transition-colors ${isActive
                        ? 'text-white font-semibold'
                        : 'text-white/40 hover:text-white/80'
                      }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    aria-label={`Navigate to ${item.label}`}
                  >
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-white rounded-full"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>

            {/* Cmd+K Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: introComplete ? 1 : 0 }}
              transition={{ duration: 0.5, delay: introComplete ? 0.35 : 0 }}
            >
              <CmdKBadge />
            </motion.div>

            {/* GitHub Star Link */}
            <motion.a
              href="https://github.com/lithish/gronckle"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0 }}
              animate={{ opacity: introComplete ? 1 : 0 }}
              transition={{ duration: 0.5, delay: introComplete ? 0.38 : 0 }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs font-mono"
              title="Star Gronckle on GitHub"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Star</span>
            </motion.a>

            {/* User Menu (Auth) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: introComplete ? 1 : 0 }}
              transition={{ duration: 0.5, delay: introComplete ? 0.4 : 0 }}
            >
              <UserMenu onProfileOpen={onProfileOpen} />
            </motion.div>

            {/* Mobile Hamburger */}
            <motion.button
              className="sm:hidden p-2 text-white/50 hover:text-white transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              initial={{ opacity: 0 }}
              animate={{ opacity: introComplete ? 1 : 0 }}
              transition={{ duration: 0.5, delay: introComplete ? 0.3 : 0 }}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/95 nav-overlay pt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="flex flex-col items-center justify-center h-full gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {navItems.map((item, i) => {
                const isActive = currentPage === item.id ||
                  (item.id === 'den' && currentPage === 'intel') ||
                  (item.id === 'smelt' && currentPage === 'forge') ||
                  (item.id === 'stash' && currentPage === 'source') ||
                  (item.id === 'cave' && currentPage === 'terminal');
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`text-2xl font-bold lowercase transition-colors ${isActive
                        ? 'text-white'
                        : 'text-white/30 hover:text-white/70'
                      }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                    aria-label={`Navigate to ${item.label}`}
                  >
                    {item.label}
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
