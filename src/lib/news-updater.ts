import { desc, eq } from 'drizzle-orm';
import { db } from '@/src/db/index.ts';
import { marketNewsItems, newsDailyDigests } from '@/src/db/schema.ts';
import { fetchIndianFinancialNews } from './market-data';
import { generateBilingualNewsDigest, isGeminiConfigured } from './gemini';
import {
  buildFallbackDailyNewsDigest,
  buildNewsArticleKey,
  extractMatchedSymbol,
  formatNextIstSyncLabel,
  getIstDateKey,
  shouldRunDailyNewsSync,
} from './news-updater-logic';

declare global {
  var _newsSchedulerStarted: boolean | undefined;
  var _newsSyncPromise: Promise<void> | undefined;
}

export function ensureDailyNewsScheduler() {
  if (global._newsSchedulerStarted) return;
  global._newsSchedulerStarted = true;

  // Hourly check + automatic IST midnight rollover sync
  const timer = setInterval(() => {
    void syncDailyIndianNews({ staleMinutes: 60 }).catch((e) => {
      console.warn('Scheduled daily news sync skipped:', e instanceof Error ? e.message : e);
    });
  }, 60 * 60_000);

  if (typeof timer === 'object' && 'unref' in timer && typeof timer.unref === 'function') {
    timer.unref();
  }
}

export async function syncDailyIndianNews(options?: {
  force?: boolean;
  staleMinutes?: number;
}): Promise<{ synced: boolean; digestDate: string; articleCount: number }> {
  const todayIst = getIstDateKey();

  if (!options?.force) {
    const existing = await db
      .select()
      .from(newsDailyDigests)
      .where(eq(newsDailyDigests.digestDate, todayIst))
      .limit(1);

    const row = existing[0] ?? null;
    if (
      row &&
      !shouldRunDailyNewsSync({
        digestDate: row.digestDate,
        lastSyncedAt: row.lastSyncedAt,
        articleCount: row.articleCount,
        staleMinutes: options?.staleMinutes ?? 60,
      })
    ) {
      return {
        synced: false,
        digestDate: row.digestDate,
        articleCount: row.articleCount,
      };
    }
  }

  if (global._newsSyncPromise) {
    await global._newsSyncPromise;
    const latest = await db
      .select()
      .from(newsDailyDigests)
      .where(eq(newsDailyDigests.digestDate, todayIst))
      .limit(1);
    return {
      synced: false,
      digestDate: todayIst,
      articleCount: latest[0]?.articleCount ?? 0,
    };
  }

  global._newsSyncPromise = (async () => {
    const liveArticles = await fetchIndianFinancialNews(Boolean(options?.force));
    if (liveArticles.length === 0) {
      return;
    }

    // Deduplicate and upsert live headlines in parallel chunks
    const dedupedMap = new Map<
      string,
      {
        articleKey: string;
        newsDate: string;
        title: string;
        link: string;
        source: string;
        category: string;
        summary: string;
        symbol: string | null;
        publishedAt: Date;
      }
    >();

    for (const art of liveArticles) {
      const pubDate = new Date(art.publishedAt);
      const validPub = Number.isNaN(pubDate.getTime()) ? new Date() : pubDate;
      const articleDate = getIstDateKey(validPub);
      const bucketDate = articleDate >= todayIst ? todayIst : articleDate;
      const articleKey = buildNewsArticleKey(art.title, art.link);
      const matchedSymbol = art.symbol ?? extractMatchedSymbol(art.title, art.summary);

      if (!dedupedMap.has(articleKey)) {
        dedupedMap.set(articleKey, {
          articleKey,
          newsDate: bucketDate,
          title: art.title,
          link: art.link,
          source: art.source,
          category: art.category,
          summary: art.summary ?? '',
          symbol: matchedSymbol,
          publishedAt: validPub,
        });
      }
    }

    const rowsToUpsert = Array.from(dedupedMap.values());
    const CHUNK_SIZE = 15;
    for (let i = 0; i < rowsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToUpsert.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map((row) =>
          db
            .insert(marketNewsItems)
            .values(row)
            .onConflictDoUpdate({
              target: marketNewsItems.articleKey,
              set: {
                title: row.title,
                summary: row.summary,
                symbol: row.symbol,
                publishedAt: row.publishedAt,
              },
            })
        )
      );
    }

    const headlinesText = liveArticles
      .slice(0, 12)
      .map((a, idx) => `${idx + 1}. [${a.category}] ${a.title} (${a.source})`)
      .join('\n');

    let aiDigestEn = buildFallbackDailyNewsDigest(liveArticles, 'en', todayIst);
    let aiDigestHi = buildFallbackDailyNewsDigest(liveArticles, 'hi', todayIst);

    if (isGeminiConfigured()) {
      try {
        const { en, hi } = await generateBilingualNewsDigest({
          dateKey: todayIst,
          headlinesText,
        });
        if (en.trim()) aiDigestEn = en.trim();
        if (hi.trim()) aiDigestHi = hi.trim();
      } catch (e) {
        console.warn('Gemini daily news digest fallback used:', e instanceof Error ? e.message : e);
      }
    }

    await db
      .insert(newsDailyDigests)
      .values({
        digestDate: todayIst,
        articleCount: liveArticles.length,
        aiDigestEn,
        aiDigestHi,
        status: 'SYNCED',
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: newsDailyDigests.digestDate,
        set: {
          articleCount: liveArticles.length,
          aiDigestEn,
          aiDigestHi,
          status: 'SYNCED',
          lastSyncedAt: new Date(),
        },
      });
  })().finally(() => {
    global._newsSyncPromise = undefined;
  });

  await global._newsSyncPromise;
  const refreshed = await db
    .select()
    .from(newsDailyDigests)
    .where(eq(newsDailyDigests.digestDate, todayIst))
    .limit(1);

  return {
    synced: true,
    digestDate: todayIst,
    articleCount: refreshed[0]?.articleCount ?? 0,
  };
}

export async function getDailyNewsBundle(params?: {
  date?: string | null;
  category?: string | null;
  symbol?: string | null;
  q?: string | null;
  forceSync?: boolean;
}) {
  ensureDailyNewsScheduler();
  const todayIst = getIstDateKey();
  const requestedDate = params?.date?.trim() || todayIst;

  let syncResult = { synced: false, digestDate: todayIst, articleCount: 0 };

  if (params?.forceSync) {
    syncResult = await syncDailyIndianNews({ force: true, staleMinutes: 60 });
  }

  let digests = await db
    .select()
    .from(newsDailyDigests)
    .orderBy(desc(newsDailyDigests.digestDate))
    .limit(10);

  let dbArticles = await db
    .select()
    .from(marketNewsItems)
    .where(params?.date ? eq(marketNewsItems.newsDate, requestedDate) : undefined)
    .orderBy(desc(marketNewsItems.publishedAt))
    .limit(80);

  const todayDigest = digests.find((d) => d.digestDate === todayIst) ?? null;
  const needsSync =
    !todayDigest ||
    shouldRunDailyNewsSync({
      digestDate: todayDigest.digestDate,
      lastSyncedAt: todayDigest.lastSyncedAt,
      articleCount: todayDigest.articleCount,
      staleMinutes: 60,
    });

  if (!params?.forceSync && needsSync) {
    if (dbArticles.length === 0 && digests.length === 0) {
      // Cold-start empty DB: sync inline once
      syncResult = await syncDailyIndianNews({ staleMinutes: 60 });
      digests = await db
        .select()
        .from(newsDailyDigests)
        .orderBy(desc(newsDailyDigests.digestDate))
        .limit(10);
      dbArticles = await db
        .select()
        .from(marketNewsItems)
        .where(params?.date ? eq(marketNewsItems.newsDate, requestedDate) : undefined)
        .orderBy(desc(marketNewsItems.publishedAt))
        .limit(80);
    } else {
      // Serve cached Cloud SQL news immediately and refresh in background
      void syncDailyIndianNews({ staleMinutes: 60 }).catch((e) => {
        console.warn('Background daily news sync skipped:', e instanceof Error ? e.message : e);
      });
    }
  }

  const activeDigest =
    digests.find((d) => d.digestDate === requestedDate) ??
    digests[0] ??
    null;

  let mapped = dbArticles.map((row) => ({
    id: row.articleKey,
    title: row.title,
    link: row.link,
    source: row.source,
    category: row.category,
    publishedAt: row.publishedAt.toISOString(),
    newsDate: row.newsDate,
    summary: row.summary,
    symbol: row.symbol ?? undefined,
  }));

  if (mapped.length === 0) {
    const live = await fetchIndianFinancialNews();
    mapped = live.map((a) => ({
      ...a,
      symbol: a.symbol ?? undefined,
      newsDate: getIstDateKey(new Date(a.publishedAt)),
    }));
  }

  if (params?.category && params.category !== 'ALL') {
    mapped = mapped.filter((a) => a.category === params.category);
  }
  if (params?.symbol) {
    const symUpper = params.symbol.trim().toUpperCase();
    mapped = mapped.filter(
      (a) => a.symbol === symUpper || a.title.toUpperCase().includes(symUpper)
    );
  }
  if (params?.q && params.q.trim()) {
    const needle = params.q.trim().toLowerCase();
    mapped = mapped.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.summary.toLowerCase().includes(needle) ||
        (a.symbol && a.symbol.toLowerCase().includes(needle)) ||
        a.source.toLowerCase().includes(needle)
    );
  }

  return {
    articles: mapped,
    digest: activeDigest
      ? {
          digestDate: activeDigest.digestDate,
          articleCount: activeDigest.articleCount,
          aiDigestEn: activeDigest.aiDigestEn,
          aiDigestHi: activeDigest.aiDigestHi,
          status: activeDigest.status,
          lastSyncedAt: activeDigest.lastSyncedAt.toISOString(),
        }
      : null,
    archiveDates: digests.map((d) => ({
      date: d.digestDate,
      articleCount: d.articleCount,
      lastSyncedAt: d.lastSyncedAt.toISOString(),
    })),
    autoUpdater: {
      enabled: true,
      cadenceLabel: 'Hourly + Automatic IST Daily Rollover',
      nextSyncLabel: formatNextIstSyncLabel(),
      todayIst,
      justSynced: syncResult.synced,
      lastSyncedAt: activeDigest?.lastSyncedAt.toISOString() ?? new Date().toISOString(),
    },
  };
}
