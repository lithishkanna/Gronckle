import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  onAuthStateChange,
  getProfile,
  signInWithGitHub,
  signOut as authSignOut,
  getUserLikes,
  type Profile,
} from '@/lib/auth';

// ─── Types ──────────────────────────────────────────────────────────

interface AuthContextValue {
  // State
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userLikes: Set<string>;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshLikes: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load profile and likes when user is authenticated
  const loadUserData = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setUserLikes(new Set());
      return;
    }

    try {
      const [profileData, likesData] = await Promise.all([
        getProfile(),
        getUserLikes(),
      ]);
      setProfile(profileData);
      setUserLikes(likesData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Use setTimeout to avoid potential Supabase deadlock
        // when calling other Supabase functions inside the callback
        setTimeout(() => {
          loadUserData(newSession?.user ?? null).finally(() => {
            setIsLoading(false);
          });
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUserLikes(new Set());
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [loadUserData]);

  const signIn = useCallback(async () => {
    try {
      await signInWithGitHub();
    } catch (error) {
      console.error('Sign-in failed:', error);
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authSignOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserLikes(new Set());
    } catch (error) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const profileData = await getProfile();
    setProfile(profileData);
  }, []);

  const refreshLikes = useCallback(async () => {
    const likesData = await getUserLikes();
    setUserLikes(likesData);
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    userLikes,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    refreshProfile,
    refreshLikes,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
