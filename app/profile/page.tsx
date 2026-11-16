'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { deleteCurrentFirebaseUser } from '@/src/lib/firebase';

export default function ProfileSettingsPage() {
  const {
    t,
    language,
    setLanguage,
    theme,
    toggleTheme,
    user,
    dbProfile,
    isAdmin,
    gmailConnected,
    linkGmail,
    getIdToken,
    openAuthModal,
    logout,
    refreshProfile,
  } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;
    const nextName = dbProfile?.displayName ?? user?.displayName ?? '';
    Promise.resolve().then(() => {
      if (active) setDisplayName(nextName);
    });
    return () => {
      active = false;
    };
  }, [dbProfile?.displayName, user?.displayName]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return openAuthModal();
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ displayName, preferredLanguage: language, preferredTheme: theme }),
    });
    if (res.ok) {
      await refreshProfile();
      setNotice(language === 'hi' ? 'प्रोफ़ाइल सफलतापूर्वक सहेजी गई।' : 'Profile preferences saved.');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleLinkGmail = async () => {
    setLinkErr(null);
    try {
      await linkGmail();
      setNotice('Gmail account connected & verified.');
    } catch (e) {
      setLinkErr(e instanceof Error ? e.message : 'Unable to connect Gmail account.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const token = await getIdToken();
    if (token) {
      await fetch('/api/user/profile', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    await deleteCurrentFirebaseUser().catch(() => {});
    await logout();
    setConfirmDelete(false);
  };

  return (
    <TerminalShell breadcrumb={t.nav.profile}>
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.profile.title}</h1>

        {/* Gmail Connection & Feature Unlock Status */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span>Gmail Account Connection</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect your Gmail account to sync Portfolio holdings, custom Watchlists, Price Alerts, Saved Charts, and Demo Trading Simulation across devices.
              </p>
            </div>

            {!user ? (
              <button
                type="button"
                onClick={openAuthModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Connect Gmail Account</span>
              </button>
            ) : gmailConnected ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs font-semibold shrink-0">
                <CheckCircle2 className="w-4 h-4" />
                <span>Gmail Connected</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLinkGmail}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Link Gmail Account</span>
              </button>
            )}
          </div>

          {user && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D1A] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-mono font-semibold text-slate-900 dark:text-white">
                  {user.email}
                </div>
                <div className="text-slate-500 mt-0.5">
                  All platform features unlocked · Free Access (No Subscription Tiers)
                </div>
              </div>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-500 font-mono font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Owner Admin Enabled</span>
                </span>
              )}
            </div>
          )}

          {linkErr && <p className="text-xs text-red-500">{linkErr}</p>}
        </section>

        {/* Language Switcher Section */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-3">
          <h2 className="text-base font-semibold">{t.profile.languageSettings}</h2>
          <p className="text-xs text-slate-500">{t.profile.languageDesc}</p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                language === 'en'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                language === 'hi'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              हिन्दी (Hindi)
            </button>
          </div>
        </section>

        {/* Theme & User Account Section */}
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">{t.common.theme}</h2>
              <p className="text-xs text-slate-500">
                Active: {theme === 'dark' ? t.common.darkMode : t.common.lightMode}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200"
            >
              Switch to {theme === 'dark' ? t.common.lightMode : t.common.darkMode}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-semibold mb-3">{t.profile.accountSection}</h2>
            {!user ? (
              <button
                type="button"
                onClick={openAuthModal}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Sign In with Gmail or Email
              </button>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div className="text-xs text-slate-500 font-mono">
                  UID: {user.uid} · Email: {user.email}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    aria-label="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-sm text-slate-900 dark:text-slate-100 w-64"
                  />
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                  >
                    {t.common.save}
                  </button>
                </div>
                {notice && <p className="text-xs text-emerald-500">{notice}</p>}

                <div className="pt-4">
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      {t.profile.deleteAccount}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-red-500">Confirm permanent deletion of your data?</span>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        className="px-3 py-1 rounded bg-red-600 text-white font-semibold"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700"
                      >
                        {t.common.cancel}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </TerminalShell>
  );
}
