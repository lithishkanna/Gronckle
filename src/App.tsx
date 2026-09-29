import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { IntroScreen } from '@/sections/IntroScreen';
import { Navigation } from '@/sections/Navigation';
import { IntelHub } from '@/sections/IntelHub';
import { Footer } from '@/sections/Footer';
import { ProfilePage } from '@/sections/ProfilePage';
import { CmdKPalette } from '@/components/CmdKPalette';
import type { Page } from '@/types/database';
import './App.css';

// Lazy-load non-landing sections
const TheForge = lazy(() => import('@/sections/TheForge').then(m => ({ default: m.TheForge })));
const TheSource = lazy(() => import('@/sections/TheSource').then(m => ({ default: m.TheSource })));
const TheTerminal = lazy(() => import('@/sections/TheTerminal').then(m => ({ default: m.TheTerminal })));

const PAGE_TITLES: Record<Page, string> = {
  den: 'The Den — GRONCKLE',
  smelt: 'The Smelt — GRONCKLE',
  stash: 'The Stash — GRONCKLE',
  cave: 'The Cave — GRONCKLE',
  intel: 'The Den — GRONCKLE',
  forge: 'The Smelt — GRONCKLE',
  source: 'The Stash — GRONCKLE',
  terminal: 'The Cave — GRONCKLE',
};

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen pt-16 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <span
          className="text-white/30 text-xs uppercase tracking-widest"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Loading
        </span>
      </div>
    </div>
  );
}

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('den');
  const [showProfile, setShowProfile] = useState(false);

  // Check if intro already played
  useEffect(() => {
    const hasPlayed = sessionStorage.getItem('gronckle-intro-played');
    if (hasPlayed === 'true') {
      setShowIntro(false);
      setIntroComplete(true);
    }
  }, []);

  // Update page title
  useEffect(() => {
    if (showProfile) {
      document.title = 'Profile — GRONCKLE';
    } else {
      document.title = PAGE_TITLES[currentPage] || 'GRONCKLE — Hoard the Best. Build the Rest.';
    }
  }, [currentPage, showProfile]);

  // Handle stack share URLs (?stack=<id>)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stack')) {
      setCurrentPage('smelt');
    }
  }, []);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    setIntroComplete(true);
  }, []);

  const handleNavigate = useCallback((page: Page) => {
    setShowProfile(false);
    setCurrentPage(page);
  }, []);

  const renderPage = () => {
    if (showProfile) {
      return <ProfilePage onBack={() => setShowProfile(false)} />;
    }
    switch (currentPage) {
      case 'den':
      case 'intel':
        return <IntelHub />;
      case 'smelt':
      case 'forge':
        return <TheForge />;
      case 'stash':
      case 'source':
        return <TheSource />;
      case 'cave':
      case 'terminal':
        return <TheTerminal />;
      default:
        return <IntelHub />;
    }
  };

  return (
    <LayoutGroup>
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Intro Splash */}
        <AnimatePresence>
          {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
        </AnimatePresence>

        {/* Navigation — always rendered so layoutId target is available */}
        <Navigation
          currentPage={currentPage}
          onPageChange={handleNavigate}
          introComplete={introComplete}
          onProfileOpen={() => setShowProfile(true)}
        />

        {/* Cmd+K Global Command Palette */}
        {introComplete && <CmdKPalette onNavigate={handleNavigate} />}

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {introComplete && (
            <motion.main
              key={showProfile ? 'profile' : currentPage}
              className="flex-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0, 0, 0.58, 1] }}
            >
              <Suspense fallback={<PageLoader />}>
                {renderPage()}
              </Suspense>
            </motion.main>
          )}
        </AnimatePresence>

        {/* Footer */}
        {introComplete && !showProfile && <Footer />}

        {/* Toast notifications */}
        <Toaster position="bottom-right" theme="dark" />
      </div>
    </LayoutGroup>
  );
}

export default App;
