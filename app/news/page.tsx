'use client';

export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, Calendar, Clock, RefreshCw, Search, Sparkles } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { MarkdownProse } from '@/src/components/MarkdownProse';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';

interface Article {
  id: string;
  title: string;
  link: string;
  source: string;
  category: string;
  publishedAt: string;
  newsDate?: string;
  summary: string;
  symbol?: string;
}

interface DailyDigest {
  digestDate: string;
  articleCount: number;
  aiDigestEn: string;
  aiDigestHi: string | null;
  status: string;
  lastSyncedAt: string;
}

interface ArchiveDate {
  date: string;
  articleCount: number;
  lastSyncedAt: string;
}

interface AutoUpdaterMeta {
  enabled: boolean;
  cadenceLabel: string;
  nextSyncLabel: string;
  todayIst: string;
  justSynced: boolean;
  lastSyncedAt: string;
}

export default function NewsPage() {
  const { t, language } = useApp();
  const [articles, setArticles] = useState<Article[]>([]);
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [archiveDates, setArchiveDates] = useState<ArchiveDate[]>([]);
  const [autoUpdater, setAutoUpdater] = useState<AutoUpdaterMeta | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [category, setCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoPollEnabled, setAutoPollEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [syncingNow, setSyncingNow] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const loadNews = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const sp = new URLSearchParams();
        if (selectedDate) sp.set('date', selectedDate);
        const res = await fetch(`/api/market/news?${sp.toString()}`, { cache: 'no-store' });
        if (res.ok) {
          const d = await res.json();
          setArticles(d.articles ?? []);
          setDigest(d.digest ?? null);
          setArchiveDates(d.archiveDates ?? []);
          setAutoUpdater(d.autoUpdater ?? null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadNews();
    });
    return () => {
      active = false;
    };
  }, [loadNews]);

  // Auto-check every 60s when enabled on News terminal
  useAutoRefresh(() => loadNews(true), autoPollEnabled, 60_000);

  const handleForceDailySync = async () => {
    setSyncingNow(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/market/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate || undefined }),
      });
      const d = await res.json();
      if (res.ok) {
        setArticles(d.articles ?? []);
        setDigest(d.digest ?? null);
        setArchiveDates(d.archiveDates ?? []);
        setAutoUpdater(d.autoUpdater ?? null);
        setSyncNotice(
          language === 'hi'
            ? `दैनिक समाचार सिंक पूर्ण (${(d.articles ?? []).length} समाचार अपडेट किए गए)।`
            : `Daily news feed synced (${(d.articles ?? []).length} headlines archived in Cloud SQL).`
        );
      }
    } finally {
      setSyncingNow(false);
    }
  };

  const handleSummarize = async (art: Article) => {
    setSummarizingId(art.id);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: art.title,
          summary: art.summary,
          source: art.source,
          language,
        }),
      });
      const json = await res.json();
      if (json.aiSummary) {
        setAiSummaries((prev) => ({ ...prev, [art.id]: json.aiSummary }));
      }
    } finally {
      setSummarizingId(null);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(articles.map((a) => a.category)))];
  const filtered = articles.filter((a) => {
    if (category !== 'ALL' && a.category !== category) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q) ||
        (a.symbol && a.symbol.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const digestText =
    language === 'hi' && digest?.aiDigestHi ? digest.aiDigestHi : digest?.aiDigestEn ?? '';

  return (
    <TerminalShell breadcrumb={t.nav.news}>
      <div className="space-y-6">
        {/* Title & Auto Daily News Updater Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {language === 'hi'
                ? 'स्वचालित दैनिक भारतीय वित्तीय समाचार (Auto Daily News)'
                : 'Auto-Updated Indian Financial News & Daily Digest'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {language === 'hi'
                ? 'Economic Times, Mint और Moneycontrol RSS से स्वचालित दैनिक सिंक, NSE स्टॉक टैगिंग व AI सारांश।'
                : 'Automatic daily & hourly news aggregation from Economic Times, Mint & Moneycontrol archived in Cloud SQL with NSE symbol detection.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoPollEnabled((v) => !v)}
              aria-pressed={autoPollEnabled}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                autoPollEnabled
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {autoPollEnabled
                  ? language === 'hi'
                    ? 'ऑटो दैनिक अपडेटर: चालू'
                    : 'Auto Daily Sync: ON'
                  : language === 'hi'
                    ? 'ऑटो दैनिक अपडेटर: बंद'
                    : 'Auto Daily Sync: PAUSED'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleForceDailySync}
              disabled={syncingNow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
              <span>
                {syncingNow
                  ? t.common.loading
                  : language === 'hi'
                    ? 'अभी समाचार सिंक करें'
                    : 'Sync Daily News Now'}
              </span>
            </button>
          </div>
        </div>

        {/* Auto Daily Updater Telemetry Strip */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {language === 'hi' ? 'ऑटो न्यूज़ अपडेटर सक्रिय' : 'Auto Daily Updater Active'}
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              {autoUpdater?.cadenceLabel ?? 'Hourly + Automatic IST Daily Rollover'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Last Synced:{' '}
              {autoUpdater?.lastSyncedAt
                ? `${new Date(autoUpdater.lastSyncedAt).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                  })} IST`
                : 'Syncing...'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Next Cycle: {autoUpdater?.nextSyncLabel ?? 'Scheduled IST'}</span>
          </div>
        </div>

        {syncNotice && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
            {syncNotice}
          </div>
        )}

        {/* Daily AI Market News Briefing */}
        {digestText && (
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span>
                  {language === 'hi'
                    ? `दैनिक AI बाज़ार समाचार बुलेटिन (${digest?.digestDate})`
                    : `Daily Auto-Compiled Market News Briefing (${digest?.digestDate})`}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {digest?.articleCount ?? filtered.length} headlines indexed
              </span>
            </div>
            <MarkdownProse content={digestText} />
          </section>
        )}

        {/* Archive Date Pills + Search + Category Filter */}
        <div className="space-y-3">
          {archiveDates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'दैनिक आर्काइव:' : 'Daily Feed:'}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className={`px-2.5 py-1 rounded-md font-mono ${
                  selectedDate === ''
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Latest ({articles.length})
              </button>
              {archiveDates.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDate(d.date)}
                  className={`px-2.5 py-1 rounded-md font-mono ${
                    selectedDate === d.date
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {d.date} ({d.articleCount})
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    category === cat
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Search market news headlines or symbols"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by headline or ticker (e.g. IRFC)..."
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Headlines Feed */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">{t.common.loading}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No market headlines matched the active filters.
            </div>
          ) : (
            filtered.map((art) => (
              <article key={art.id} className="p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      {art.source} · {art.category} ·{' '}
                      {new Date(art.publishedAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}{' '}
                      IST
                    </span>
                    {art.symbol && (
                      <Link
                        href={`/stocks/${art.symbol}`}
                        className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                      >
                        {art.symbol} →
                      </Link>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSummarize(art)}
                    disabled={summarizingId === art.id}
                    className="inline-flex items-center gap-1 text-blue-500 hover:underline font-medium"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>
                      {summarizingId === art.id
                        ? t.common.loading
                        : language === 'hi'
                          ? 'AI सारांश (हिन्दी)'
                          : 'AI Summary'}
                    </span>
                  </button>
                </div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  <a href={art.link} target="_blank" rel="noreferrer" className="hover:text-blue-500">
                    {art.title}
                  </a>
                </h2>
                {art.summary && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">{art.summary}</p>
                )}
                {aiSummaries[art.id] && (
                  <div className="mt-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                    {aiSummaries[art.id]}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </TerminalShell>
  );
}
