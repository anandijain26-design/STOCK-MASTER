'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bot, Send } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';
import { formatINR } from '@/src/lib/i18n';
import { MarkdownProse } from '@/src/components/MarkdownProse';

interface ResearchResult {
  query: string;
  language: 'en' | 'hi';
  analysis: string;
  factualSnapshots: Array<{
    symbol: string;
    companyName: string;
    price: number | null;
    changePercent: number | null;
    rsi14: number | null;
    supertrend: string;
    supports: number[];
    resistances: number[];
    timestamp: string | null;
  }>;
  generatedAt: string;
}

const SUGGESTED_EN = [
  'Analyse Reliance Industries technicals, fundamentals, and support/resistance levels.',
  'Which NSE stocks are showing strong bullish momentum and volume breakouts right now?',
  'Which stocks have RSI below 30 or oversold conditions?',
  "Analyse today's NIFTY 50 movement and key levels to watch.",
  'Compare TCS and INFY on valuation, ROE, and technical trend.',
];

const SUGGESTED_HI = [
  'Reliance Industries का तकनीकी, फंडामेंटल और सपोर्ट/रेज़िस्टेंस विश्लेषण करें।',
  'कौन से NSE शेयर अभी मजबूत बुलिश मोमेंटम और वॉल्यूम ब्रेकआउट दिखा रहे हैं?',
  'किन शेयरों का RSI 30 से नीचे या ओवरसोल्ड ज़ोन में है?',
  'आज के NIFTY 50 मूवमेंट और अगले प्रमुख स्तरों का विश्लेषण करें।',
  'TCS और INFY की वैल्यूएशन, ROE और तकनीकी ट्रेंड की तुलना करें।',
];

export default function AiAnalystPage() {
  const { t, language } = useApp();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ResearchResult[]>([]);

  const submitQuery = async (textToRun: string) => {
    const clean = textToRun.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: clean, language }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to run AI research.');
        return;
      }
      setHistory((prev) => [json, ...prev]);
      setQuery('');
    } catch {
      setError('Network error reaching AI research endpoint.');
    } finally {
      setBusy(false);
    }
  };

  const prompts = language === 'hi' ? SUGGESTED_HI : SUGGESTED_EN;

  return (
    <TerminalShell breadcrumb={t.nav.aiAnalyst}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-500" />
            <span>{t.aiAnalyst.title}</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t.aiAnalyst.subtitle} · {t.aiAnalyst.languageNote}:{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {language === 'hi' ? 'हिन्दी (Hindi)' : 'English'}
            </span>
          </p>
        </div>

        {/* Query Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuery(query);
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-4 space-y-3"
        >
          <label htmlFor="ai-query-input" className="sr-only">
            Research question
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="ai-query-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.aiAnalyst.placeholder}
              className="flex-1 h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm"
            />
            <button
              type="submit"
              disabled={busy || !query.trim()}
              className="h-11 px-5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>{busy ? t.common.loading : t.aiAnalyst.askButton}</span>
            </button>
          </div>

          <div className="pt-1">
            <div className="text-xs text-slate-500 mb-2">{t.aiAnalyst.suggestedQueries}:</div>
            <div className="flex flex-wrap gap-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => submitQuery(p)}
                  className="text-left text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </form>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Research Responses */}
        <div className="space-y-5">
          {history.length === 0 && !busy && !error && (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-[#0F172A]/60 p-6 text-center space-y-2">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {language === 'hi'
                  ? 'सभी 2,647+ NSE शेयरों का AI विश्लेषण तैयार है'
                  : 'Full-Market AI Research Ready (All 2,647+ NSE Stocks)'}
              </div>
              <p className="text-xs text-slate-500 max-w-2xl mx-auto">
                {language === 'hi'
                  ? 'IRFC, MRF, MAZDOCK, RELIANCE या किसी भी भारतीय कंपनी का नाम लिखें या ऊपर दिए गए सुझावों पर क्लिक करें।'
                  : 'Mention any listed NSE ticker (e.g., IRFC, MRF, MAZDOCK, RELIANCE, HDFCBANK) to pull live technicals, support/resistance levels, and Gemini-powered institutional synthesis.'}
              </p>
            </div>
          )}
          {history.map((item, idx) => (
            <article
              key={`${item.generatedAt}-${idx}`}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  {item.query}
                </h2>
                <span className="text-xs font-mono text-slate-500">
                  {new Date(item.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </span>
              </div>

              {/* Factual Telemetry Strip (Clearly separated from Model Opinion) */}
              {item.factualSnapshots.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">
                    {language === 'hi'
                      ? 'वास्तविक बाज़ार डेटा (Factual Market Telemetry)'
                      : 'Factual Market Telemetry (Live Exchange Feed)'}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {item.factualSnapshots.map((snap) => (
                      <div
                        key={snap.symbol}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex justify-between font-semibold">
                          <Link href={`/stocks/${snap.symbol}`} className="font-mono text-blue-500 hover:underline">
                            {snap.symbol}
                          </Link>
                          <span className="font-mono tabular-nums">{formatINR(snap.price)}</span>
                        </div>
                        <div className="text-slate-500 flex justify-between font-mono tabular-nums">
                          <span>RSI: {snap.rsi14 ?? '—'}</span>
                          <span>Trend: {snap.supertrend}</span>
                        </div>
                        <div className="text-slate-500 font-mono tabular-nums">
                          S: {snap.supports.slice(0, 2).join(', ') || '—'} · R: {snap.resistances.slice(0, 2).join(', ') || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model-Generated Research Opinion */}
              <div>
                <div className="text-xs font-semibold text-blue-500 mb-2">
                  {language === 'hi'
                    ? 'AI शोध व्याख्या (Model-Generated Opinion)'
                    : 'AI Research Synthesis (Model-Generated Opinion)'}
                </div>
                <MarkdownProse content={item.analysis} />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                {t.aiAnalyst.disclaimer}
              </div>
            </article>
          ))}
        </div>
      </div>
    </TerminalShell>
  );
}
