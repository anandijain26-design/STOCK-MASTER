'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { StockPicker } from '@/src/components/StockPicker';

interface WatchlistRow {
  id: number;
  name: string;
  symbols: string[];
}

interface AlertRow {
  id: number;
  symbol: string;
  alertType: string;
  conditionLabel: string;
  thresholdValue: string | null;
  channels: string[];
  isActive: boolean;
}

export default function WatchlistsAndAlertsPage() {
  const { t, user, getIdToken, openAuthModal } = useApp();
  const [watchlists, setWatchlists] = useState<WatchlistRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [newListName, setNewListName] = useState('');
  const [addSymbol, setAddSymbol] = useState('RELIANCE');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  const [alertSymbol, setAlertSymbol] = useState('RELIANCE');
  const [alertType, setAlertType] = useState('TARGET_PRICE');
  const [threshold, setThreshold] = useState('1400');

  const loadAll = useCallback(async () => {
    if (!user) return;
    const token = await getIdToken();
    if (!token) return;
    const [wRes, aRes] = await Promise.all([
      fetch('/api/user/watchlists', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/user/alerts', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (wRes.ok) {
      const wj = await wRes.json();
      setWatchlists(wj.watchlists ?? []);
      if (!selectedListId && wj.watchlists?.[0]) setSelectedListId(wj.watchlists[0].id);
    }
    if (aRes.ok) {
      const aj = await aRes.json();
      setAlerts(aj.alerts ?? []);
    }
  }, [user, getIdToken, selectedListId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadAll();
    });
    return () => {
      active = false;
    };
  }, [loadAll]);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/user/watchlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'create', name: newListName.trim(), symbols: [] }),
    });
    if (res.ok) {
      setNewListName('');
      await loadAll();
    }
  };

  const handleSymbolAction = async (watchlistId: number, action: 'addSymbol' | 'removeSymbol', sym: string) => {
    const token = await getIdToken();
    if (!token) return;
    await fetch('/api/user/watchlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, watchlistId, symbol: sym }),
    });
    await loadAll();
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = await getIdToken();
    if (!token) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    await fetch('/api/user/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        symbol: alertSymbol,
        alertType,
        conditionLabel: `${alertType.replace('_', ' ')} @ ${threshold}`,
        thresholdValue: Number(threshold),
        channels: ['in_app', 'browser'],
      }),
    });
    await loadAll();
  };

  const handleDeleteAlert = async (id: number) => {
    const token = await getIdToken();
    if (!token) return;
    await fetch(`/api/user/alerts?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadAll();
  };

  return (
    <TerminalShell breadcrumb={t.nav.watchlists}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Watchlists, Price Alerts & Notifications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize multiple custom NSE/BSE watchlists and configure price or technical indicator triggers.
          </p>
        </div>

        {!user ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-8 text-center space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Connect Gmail to manage private Watchlists &amp; Alerts
            </h2>
            <p className="text-sm text-slate-500">
              Monitor any of the 2,647+ NSE stocks with synced custom watchlists and price triggers.
            </p>
            <button
              type="button"
              onClick={openAuthModal}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
            >
              Connect Gmail Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Watchlists */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">My Watchlists</h2>
                <form onSubmit={handleCreateWatchlist} className="flex items-center gap-2">
                  <input
                    type="text"
                    aria-label="New watchlist name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="New watchlist name..."
                    className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 text-xs"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create</span>
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                {watchlists.map((wl) => (
                  <div
                    key={wl.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{wl.name}</span>
                      <div className="flex items-center gap-2">
                        <StockPicker
                          ariaLabel={`Add stock to ${wl.name}`}
                          value={addSymbol}
                          onChange={setAddSymbol}
                          className="w-48"
                        />
                        <button
                          type="button"
                          onClick={() => handleSymbolAction(wl.id, 'addSymbol', addSymbol)}
                          className="h-9 px-3 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs font-medium"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {wl.symbols.length === 0 ? (
                        <span className="text-xs text-slate-500">No stocks in this watchlist yet.</span>
                      ) : (
                        wl.symbols.map((sym) => (
                          <div
                            key={sym}
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs"
                          >
                            <Link href={`/stocks/${sym}`} className="font-mono font-semibold text-blue-500 hover:underline">
                              {sym}
                            </Link>
                            <button
                              type="button"
                              aria-label={`Remove ${sym} from ${wl.name}`}
                              onClick={() => handleSymbolAction(wl.id, 'removeSymbol', sym)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-500" />
                <span>Price & Technical Alerts</span>
              </h2>
              <form onSubmit={handleCreateAlert} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <StockPicker
                    ariaLabel="Alert symbol"
                    value={alertSymbol}
                    onChange={setAlertSymbol}
                  />
                  <select
                    aria-label="Alert condition type"
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value)}
                    className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 text-xs"
                  >
                    <option value="TARGET_PRICE">Target Price (₹)</option>
                    <option value="STOP_LOSS">Stop-Loss Price (₹)</option>
                    <option value="RSI_ABOVE">RSI Above</option>
                    <option value="RSI_BELOW">RSI Below</option>
                    <option value="MACD_CROSS">MACD Crossover</option>
                    <option value="BREAKOUT">Price Breakout</option>
                    <option value="VOLUME_SPIKE">Unusual Volume</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    aria-label="Alert threshold value"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 text-sm font-mono"
                  />
                  <button
                    type="submit"
                    className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                  >
                    Create Alert
                  </button>
                </div>
              </form>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No active alerts configured.</p>
                ) : (
                  alerts.map((al) => (
                    <div key={al.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-semibold text-blue-500">{al.symbol}</span>
                        <span className="ml-2 text-slate-700 dark:text-slate-300">{al.conditionLabel}</span>
                        <div className="text-[11px] text-slate-500">Channels: {al.channels.join(', ')}</div>
                      </div>
                      <button
                        type="button"
                        aria-label={`Delete alert ${al.id}`}
                        onClick={() => handleDeleteAlert(al.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </TerminalShell>
  );
}
