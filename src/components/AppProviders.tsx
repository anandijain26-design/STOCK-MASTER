'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  isGmailConnected,
  linkGmailAccount,
  logoutUser,
} from '@/src/lib/firebase';
import { AppLanguage, DICTIONARY, Translations } from '@/src/lib/i18n';
import { AuthModal } from './AuthModal';

export interface DbUserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  preferredLanguage: AppLanguage;
  preferredTheme: 'dark' | 'light';
  role: string;
  dashboardLayout: string[];
}

interface AppContextValue {
  user: User | null;
  authLoading: boolean;
  dbProfile: DbUserProfile | null;
  isAdmin: boolean;
  gmailConnected: boolean;
  linkGmail: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  openAuthModal: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: Translations;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbProfile, setDbProfile] = useState<DbUserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [autoRefresh, setAutoRefreshState] = useState<boolean>(true);

  // Hydrate client preferences from localStorage safely
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const savedLang = window.localStorage.getItem('sm_lang');
        if (savedLang === 'en' || savedLang === 'hi') {
          setLanguageState(savedLang);
        }
        const savedTheme = window.localStorage.getItem('sm_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
          document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        } else {
          document.documentElement.classList.add('dark');
        }
        const savedAuto = window.localStorage.getItem('sm_auto_refresh');
        if (savedAuto === 'false') {
          setAutoRefreshState(false);
        }
      } catch {
        document.documentElement.classList.add('dark');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const syncProfileFromBackend = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setDbProfile(null);
      setIsAdmin(false);
      return;
    }
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(Boolean(data.isAdmin));
        if (data.user) {
          setDbProfile(data.user);
          if (data.user.preferredLanguage === 'en' || data.user.preferredLanguage === 'hi') {
            setLanguageState(data.user.preferredLanguage);
            window.localStorage.setItem('sm_lang', data.user.preferredLanguage);
          }
          if (data.user.preferredTheme === 'dark' || data.user.preferredTheme === 'light') {
            setThemeState(data.user.preferredTheme);
            document.documentElement.classList.toggle('dark', data.user.preferredTheme === 'dark');
            window.localStorage.setItem('sm_theme', data.user.preferredTheme);
          }
        }
      }
    } catch (e) {
      console.warn('Profile sync skipped:', e);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      await syncProfileFromBackend(u);
    });
    return () => unsub();
  }, [syncProfileFromBackend]);

  const setLanguage = useCallback(
    async (lang: AppLanguage) => {
      setLanguageState(lang);
      try {
        window.localStorage.setItem('sm_lang', lang);
      } catch {
        // ignore storage errors
      }
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ preferredLanguage: lang }),
        }).catch(() => {});
      }
    },
    []
  );

  const toggleTheme = useCallback(async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      window.localStorage.setItem('sm_theme', next);
    } catch {
      // ignore
    }
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferredTheme: next }),
      }).catch(() => {});
    }
  }, [theme]);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('sm_auto_refresh', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setDbProfile(null);
    setIsAdmin(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    await syncProfileFromBackend(auth.currentUser);
  }, [syncProfileFromBackend]);

  const linkGmail = useCallback(async () => {
    await linkGmailAccount();
    await syncProfileFromBackend(auth.currentUser);
  }, [syncProfileFromBackend]);

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        dbProfile,
        isAdmin,
        gmailConnected: isGmailConnected(user),
        linkGmail,
        getIdToken,
        openAuthModal: () => setAuthModalOpen(true),
        logout,
        refreshProfile,
        language,
        setLanguage,
        t: DICTIONARY[language],
        theme,
        toggleTheme,
        autoRefresh,
        toggleAutoRefresh,
      }}
    >
      {children}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProviders');
  return ctx;
}
