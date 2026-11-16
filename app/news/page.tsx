'use client';

import React, { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { TerminalShell } from '@/src/components/TerminalShell';
import { useApp } from '@/src/components/AppProviders';

interface Article {
  id: string;
  title: string;
  link: string;
  source: string;
  category: string;
  publishedAt: string;
  summary: string;
}

export default function NewsPage() {
  const { t, language } = useApp();
  const [articles, setArticles] = useState<Article[]>([]);
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/market/news')
      .then((r) => r.json())
      .then((d) => setArticles(d.articles ?? []))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['ALL', ...Array.from(new Set(articles.map((a) => a.category)))];
  const filtered = category === 'ALL' ? articles : articles.filter((a) => a.category === category);

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

  return (
    <TerminalShell breadcrumb={t.nav.news}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'hi'
              ? 'भारतीय वित्तीय समाचार व कॉर्पोरेट घोषणाएं'
              : 'Indian Financial News & Corporate Announcements'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Live RSS headlines with original source attribution, timestamps, and on-demand AI summaries.
          </p>
        </div>

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

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">{t.common.loading}</div>
          ) : (
            filtered.map((art) => (
              <article key={art.id} className="p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {art.source} · {art.category} ·{' '}
                    {new Date(art.publishedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                  </span>
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
