import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { Github, LogOut, User, Bookmark, Layers, ChevronDown } from 'lucide-react';

export function UserMenu({ onProfileOpen }: { onProfileOpen?: () => void }) {
  const { user, profile, isAuthenticated, isLoading, signIn, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
    );
  }

  // ── Not authenticated — show sign in button ──
  if (!isAuthenticated) {
    return (
      <button
        onClick={() => signIn()}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white hover:border-white/20 transition-all active:scale-[0.97]"
      >
        <Github className="w-4 h-4" />
        <span>Sign in</span>
      </button>
    );
  }

  // ── Authenticated — show avatar + dropdown ──
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-all"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-7 h-7 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white/50" />
          </div>
        )}
        <span className="text-sm text-white/70 font-medium hidden sm:inline max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown className={`w-3 h-3 text-white/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <motion.div
              className="absolute right-0 top-full mt-2 w-56 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* User info header */}
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                {profile?.github_username && (
                  <p className="text-xs text-white/40 mt-0.5">@{profile.github_username}</p>
                )}
                {profile?.role === 'admin' && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                    Admin
                  </span>
                )}
              </div>

              {/* Menu items */}
              <div className="py-1">
                <MenuButton
                  icon={<User className="w-4 h-4" />}
                  label="Profile"
                  onClick={() => {
                    setIsOpen(false);
                    onProfileOpen?.();
                  }}
                />
                <MenuButton
                  icon={<Bookmark className="w-4 h-4" />}
                  label="Bookmarks"
                  onClick={() => {
                    setIsOpen(false);
                    // TODO: Navigate to bookmarks
                  }}
                />
                <MenuButton
                  icon={<Layers className="w-4 h-4" />}
                  label="Saved Stacks"
                  onClick={() => {
                    setIsOpen(false);
                    // TODO: Navigate to saved stacks
                  }}
                />
              </div>

              {/* Sign out */}
              <div className="py-1 border-t border-white/10">
                <MenuButton
                  icon={<LogOut className="w-4 h-4" />}
                  label="Sign out"
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                  variant="danger"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Internal Menu Button ───────────────────────────────────────────

function MenuButton({
  icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
        variant === 'danger'
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
