'use client';

import React, { useState } from 'react';
import { Mail, ShieldCheck, X } from 'lucide-react';
import {
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '@/src/lib/firebase';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!open) return null;

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gmail sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'forgot') {
        await resetPassword(email.trim());
        setNotice('Password reset instructions sent if this email is registered.');
      } else if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password);
        onClose();
      } else {
        await signInWithEmail(email.trim(), password);
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      setError(
        msg.includes('operation-not-allowed')
          ? 'Email/Password sign-in is not enabled. Please use Gmail Sign-In above.'
          : msg
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 id="auth-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {mode === 'login'
              ? 'Connect Gmail to Stock Mastery'
              : mode === 'signup'
                ? 'Create Stock Mastery Account'
                : 'Reset Password'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 mb-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Unlock All Cloud & Personal Features</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            Connect your Gmail account to unlock Portfolio Tracker, Custom Watchlists, Price Alerts, Saved Charts & Scanners, and Cloud Demo Trading Sync.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm"
        >
          <Mail className="w-4 h-4" />
          <span>Continue with Gmail (Google)</span>
        </button>

        <div className="relative my-5 flex items-center">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          <span className="px-3 text-xs text-slate-500">or email credentials</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Gmail or Email address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gmail.com"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {busy
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In with Email'
                : mode === 'signup'
                  ? 'Create Account'
                  : 'Send Reset Email'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          {mode !== 'login' ? (
            <button type="button" onClick={() => setMode('login')} className="hover:text-blue-500 underline">
              Back to Sign In
            </button>
          ) : (
            <button type="button" onClick={() => setMode('signup')} className="hover:text-blue-500 underline">
              Create an account
            </button>
          )}
          {mode !== 'forgot' && (
            <button type="button" onClick={() => setMode('forgot')} className="hover:text-blue-500 underline">
              Forgot password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
