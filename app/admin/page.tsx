'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useState } from 'react';
import { Lock, Mail, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';

interface AdminPayload {
  ownerEmail: string;
  stats: {
    registeredUsers: number;
    dailyReportsStored: number;
    stockMasterCount: number;
    universeCount: number;
  };
  integrations: Array<{ name: string; status: string; detail: string }>;
  users: Array<{ id: number; email: string; displayName: string | null; preferredLanguage: string; role: string }>;
  auditLogs: Array<{ id: number; action: string; resource: string; createdAt: string }>;
  announcements: Array<{ id: number; title: string; body: string; severity: string }>;
}

export default function AdminDashboardPage() {
  const { t, user, authLoading, isAdmin, getIdToken, openAuthModal } = useApp();
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const loadAdmin = useCallback(async () => {
    if (!user || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch('/api/admin', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'Failed to load owner administration panel.');
        return;
      }
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, getIdToken]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadAdmin();
    });
    return () => {
      active = false;
    };
  }, [user, isAdmin, loadAdmin]);

  const handleSyncMaster = async () => {
    const token = await getIdToken();
    if (!token) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'syncMaster' }),
      });
      const json = await res.json();
      if (res.ok) {
        setToast(`Synchronized ${json.syncedCount.toLocaleString('en-IN')} NSE instruments into Cloud SQL stock_master.`);
        await loadAdmin();
      } else {
        setError(json.error ?? 'Master sync failed.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'createAnnouncement', title: annTitle, body: annBody }),
    });
    if (res.ok) {
      setAnnTitle('');
      setAnnBody('');
      setToast('Platform announcement published to dashboard.');
      await loadAdmin();
    }
  };

  return (
    <TerminalShell breadcrumb={t.nav.admin}>
      {authLoading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-8 text-center text-sm text-slate-500">
          Verifying owner credentials...
        </div>
      ) : !user ? (
        <div className="max-w-lg mx-auto mt-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-600/10 text-blue-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Owner-Only Administration Panel
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Access to Stock Mastery administration, NSE instrument master sync, user directory, and audit logs is restricted exclusively to the verified platform owner Gmail account.
          </p>
          <button
            type="button"
            onClick={openAuthModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
          >
            <Mail className="w-4 h-4" />
            <span>Sign In with Owner Gmail</span>
          </button>
        </div>
      ) : !isAdmin ? (
        <div className="max-w-lg mx-auto mt-8 rounded-xl border border-red-500/30 bg-white dark:bg-[#0F172A] p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            403 · Access Restricted to anandijain26@gmail.com
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Signed in as <span className="font-mono text-slate-800 dark:text-slate-200">{user.email}</span>. Only the designated administrator account (<span className="font-semibold text-blue-500">anandijain26@gmail.com</span>) can access the system administration panel.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Owner Session · {user.email}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                System Administration & Data Feed Control
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Monitor database connectivity, market data providers, NSE 2,646+ instrument master sync, users, and audit logs.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSyncMaster}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync All NSE Instruments</span>
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-500">
              {error}
            </div>
          )}

          {toast && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-500">
              {toast}
            </div>
          )}

          {loading && !data ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading admin telemetry...</div>
          ) : (
            data && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    ['Registered Users', data.stats.registeredUsers],
                    ['Daily Reports Archived', data.stats.dailyReportsStored],
                    ['Synced Master Instruments', data.stats.stockMasterCount],
                    ['Active NSE Universe', data.stats.universeCount],
                  ].map(([label, val]) => (
                    <div
                      key={String(label)}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4"
                    >
                      <div className="text-xs text-slate-500">{label}</div>
                      <div className="font-mono text-2xl font-bold mt-1">
                        {Number(val).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Data Provider & Integration Status */}
                  <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-3">
                    <h2 className="text-base font-semibold">Provider & Infrastructure Status</h2>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {data.integrations.map((intg) => (
                        <div key={intg.name} className="py-2.5 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{intg.name}</div>
                            <div className="text-slate-500">{intg.detail}</div>
                          </div>
                          <span
                            className={`font-mono font-semibold shrink-0 ${
                              intg.status === 'Connected' ||
                              intg.status === 'Online' ||
                              intg.status === 'Configured' ||
                              intg.status === 'Loaded'
                                ? 'text-emerald-500'
                                : 'text-amber-500'
                            }`}
                          >
                            {intg.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Publish Announcement */}
                  <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-3">
                    <h2 className="text-base font-semibold">Publish Platform Announcement</h2>
                    <form onSubmit={handlePublishAnnouncement} className="space-y-3">
                      <input
                        type="text"
                        aria-label="Announcement title"
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        placeholder="Announcement title (e.g. Muhurat Trading Schedule)"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-xs text-slate-900 dark:text-slate-100"
                      />
                      <textarea
                        aria-label="Announcement body"
                        rows={3}
                        value={annBody}
                        onChange={(e) => setAnnBody(e.target.value)}
                        placeholder="Details shown on dashboard..."
                        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-xs text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                      >
                        Publish Notice
                      </button>
                    </form>
                  </section>
                </div>

                {/* Registered Accounts */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-3">
                  <h2 className="text-base font-semibold">Registered User Accounts</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                          <th className="py-2 pr-4">Email</th>
                          <th className="py-2 pr-4">Name</th>
                          <th className="py-2 pr-4">Language</th>
                          <th className="py-2">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.users.map((u) => (
                          <tr key={u.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800/60">
                            <td className="py-2 pr-4 font-mono">{u.email}</td>
                            <td className="py-2 pr-4">{u.displayName ?? '—'}</td>
                            <td className="py-2 pr-4 uppercase font-mono">{u.preferredLanguage}</td>
                            <td className="py-2 font-mono">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  u.role === 'admin'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Audit Logs */}
                <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-3">
                  <h2 className="text-base font-semibold">Security & Sync Audit Log</h2>
                  <div className="space-y-1.5 text-xs font-mono">
                    {data.auditLogs.length === 0 ? (
                      <p className="text-slate-500">No audit entries recorded yet.</p>
                    ) : (
                      data.auditLogs.map((l) => (
                        <div key={l.id} className="flex justify-between py-1 border-b last:border-0 border-slate-100 dark:border-slate-800/60">
                          <span>{l.action} · {l.resource}</span>
                          <span className="text-slate-500">{new Date(l.createdAt).toLocaleString('en-IN')}</span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )
          )}
        </div>
      )}
    </TerminalShell>
  );
}
