'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { formatINR } from '@/src/lib/i18n';
import { StockPicker } from '@/src/components/StockPicker';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

interface PortfolioHolding {
  id: number;
  symbol: string;
  companyName: string;
  sector: string;
  quantity: number;
  avgBuyPrice: number;
  buyDate: string;
  invested: number;
  ltp: number | null;
  currentValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
}

export default function PortfolioPage() {
  const { t, language, user, getIdToken, openAuthModal, autoRefresh } = useApp();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [summary, setSummary] = useState({
    totalInvested: 0,
    totalCurrentValue: 0,
    totalUnrealizedPnl: 0,
    totalRealizedPnl: 0,
    overallReturnPct: 0,
  });
  const [symbol, setSymbol] = useState('RELIANCE');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('10');
  const [price, setPrice] = useState('');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState<string | null>(null);

  const loadPortfolio = useCallback(async () => {
    if (!user) return;
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch('/api/user/portfolio', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setHoldings(json.holdings ?? []);
      setSummary(json.summary ?? {});
    }
  }, [user, getIdToken]);

  useAutoRefresh(loadPortfolio, autoRefresh && Boolean(user), 5000);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadPortfolio();
    });
    return () => {
      active = false;
    };
  }, [loadPortfolio]);

  const sectorAllocation = useMemo(() => {
    const map = new Map<string, number>();
    const total = holdings.reduce((a, h) => a + (h.currentValue ?? h.invested), 0);
    for (const h of holdings) {
      const val = h.currentValue ?? h.invested;
      map.set(h.sector, (map.get(h.sector) ?? 0) + val);
    }
    return Array.from(map.entries()).map(([sector, value]) => ({
      sector,
      value,
      pct: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
    }));
  }, [holdings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return openAuthModal();
    const token = await getIdToken();
    if (!token) return;
    setMsg(null);
    const res = await fetch('/api/user/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        symbol,
        side,
        quantity: Number(quantity),
        price: Number(price),
        tradeDate,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json.error ?? 'Failed to record entry.');
      return;
    }
    setPrice('');
    await loadPortfolio();
  };

  const handleDelete = async (id: number) => {
    const token = await getIdToken();
    if (!token) return;
    await fetch(`/api/user/portfolio?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadPortfolio();
  };

  return (
    <TerminalShell breadcrumb={t.nav.portfolio}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {language === 'hi' ? 'व्यक्तिगत पोर्टफोलियो ट्रैकर' : 'Personal Portfolio Tracker (Manual Entry)'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'hi'
                ? 'अपने वास्तविक निवेश दर्ज करें और लाइव मार्केट वैल्यू, P&L और सेक्टर आवंटन ट्रैक करें। कोई ऑटोमैटिक ब्रोकर लिंक सक्रिय नहीं है।'
                : 'Track manually entered holdings with live market valuation, sector allocation, and realized/unrealized P&L. Direct brokerage sync is not enabled unless configured.'}
            </p>
          </div>
          <Link href="/paper-trading" className="text-xs font-medium text-blue-500 hover:underline">
            {language === 'hi' ? 'वर्चुअल पेपर ट्रेडिंग खोलें →' : 'Looking for ₹1,00,000 Virtual Paper Trading? →'}
          </Link>
        </div>

        {!user ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-8 text-center space-y-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Connect Gmail to access your private Portfolio
            </h2>
            <p className="text-sm text-slate-500">
              Sign in with your Gmail account to unlock real holdings tracking across 2,647+ NSE stocks in Cloud SQL.
            </p>
            <button
              type="button"
              onClick={openAuthModal}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
            >
              {language === 'hi' ? 'Gmail अकाउंट जोड़ें' : 'Connect Gmail Account'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                ['Total Invested', formatINR(summary.totalInvested)],
                ['Current Market Value', formatINR(summary.totalCurrentValue)],
                ['Unrealized P&L', formatINR(summary.totalUnrealizedPnl)],
                ['Realized P&L', formatINR(summary.totalRealizedPnl)],
                ['Portfolio Return', `${summary.overallReturnPct.toFixed(2)}%`],
              ].map(([label, val]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4"
                >
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="font-mono tabular-nums text-lg font-bold mt-1">{val}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleSubmit}
                className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-3 h-fit"
              >
                <h2 className="text-base font-semibold">Record Investment</h2>
                <div>
                  <label htmlFor="port-sym" className="block text-xs text-slate-500 mb-1">Stock Symbol (All 2,647+ NSE)</label>
                  <StockPicker
                    id="port-sym"
                    ariaLabel="Select portfolio stock symbol"
                    value={symbol}
                    onChange={setSymbol}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSide('BUY')}
                    className={`py-1.5 rounded text-xs font-semibold ${side === 'BUY' ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-slate-700'}`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('SELL')}
                    className={`py-1.5 rounded text-xs font-semibold ${side === 'SELL' ? 'bg-red-600 text-white' : 'border border-slate-300 dark:border-slate-700'}`}
                  >
                    SELL
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="port-qty" className="block text-xs text-slate-500 mb-1">Quantity</label>
                    <input
                      id="port-qty"
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="port-price" className="block text-xs text-slate-500 mb-1">Price (₹)</label>
                    <input
                      id="port-price"
                      type="number"
                      step="0.05"
                      min="0.05"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="1340.00"
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="port-date" className="block text-xs text-slate-500 mb-1">Purchase Date</label>
                  <input
                    id="port-date"
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 text-xs font-mono"
                  />
                </div>
                {msg && <p className="text-xs text-red-500">{msg}</p>}
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Save Transaction
                </button>
              </form>

              <div className="lg:col-span-8 space-y-5">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2.5 px-4">Holding</th>
                        <th className="py-2.5 px-4 text-right">Qty</th>
                        <th className="py-2.5 px-4 text-right">Avg Buy</th>
                        <th className="py-2.5 px-4 text-right">Live LTP</th>
                        <th className="py-2.5 px-4 text-right">Value</th>
                        <th className="py-2.5 px-4 text-right">P&L</th>
                        <th className="py-2.5 px-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            No portfolio holdings recorded yet. Add your first transaction on the left.
                          </td>
                        </tr>
                      ) : (
                        holdings.map((h) => (
                          <tr key={h.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800/60">
                            <td className="py-2.5 px-4">
                              <Link href={`/stocks/${h.symbol}`} className="font-mono font-semibold text-blue-500 hover:underline">
                                {h.symbol}
                              </Link>
                              <div className="text-slate-500">{h.sector}</div>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">{h.quantity}</td>
                            <td className="py-2.5 px-4 text-right font-mono">{formatINR(h.avgBuyPrice)}</td>
                            <td className="py-2.5 px-4 text-right font-mono">{formatINR(h.ltp)}</td>
                            <td className="py-2.5 px-4 text-right font-mono">{formatINR(h.currentValue)}</td>
                            <td
                              className={`py-2.5 px-4 text-right font-mono font-semibold ${
                                (h.unrealizedPnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'
                              }`}
                            >
                              {formatINR(h.unrealizedPnl)} ({h.unrealizedPnlPct?.toFixed(2) ?? '0.00'}%)
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                aria-label={`Delete ${h.symbol} holding`}
                                onClick={() => handleDelete(h.id)}
                                className="p-1 text-slate-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {sectorAllocation.length > 0 && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 space-y-2.5">
                    <h2 className="text-sm font-semibold">Sector Diversification</h2>
                    {sectorAllocation.map((s) => (
                      <div key={s.sector} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>{s.sector}</span>
                          <span className="font-mono tabular-nums">{s.pct}% ({formatINR(s.value)})</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${s.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </TerminalShell>
  );
}
