import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/src/db/index.ts';
import { dailyReports } from '@/src/db/schema.ts';
import {
  fetchAllIndices,
  fetchIndianFinancialNews,
  fetchStockUniverseWithTechnicals,
} from '@/src/lib/market-data';
import { generateBilingualDailyReportNarrative, isGeminiConfigured } from '@/src/lib/gemini';

export const dynamic = 'force-dynamic';

async function buildLiveReportPayload() {
  const [indices, stocksWithTech, news] = await Promise.all([
    fetchAllIndices(),
    fetchStockUniverseWithTechnicals(46),
    fetchIndianFinancialNews(),
  ]);

  const available = stocksWithTech.filter((s) => s.quote.price !== null);
  const advances = available.filter((s) => (s.quote.changePercent ?? 0) > 0).length;
  const declines = available.filter((s) => (s.quote.changePercent ?? 0) < 0).length;

  const sorted = [...available].sort(
    (a, b) => (b.quote.changePercent ?? 0) - (a.quote.changePercent ?? 0)
  );
  const topGainers = sorted.slice(0, 20).map((s) => ({
    symbol: s.master.symbol,
    companyName: s.master.companyName,
    price: s.quote.price,
    changePercent: s.quote.changePercent,
    volume: s.quote.volume,
  }));
  const topLosers = [...sorted].reverse().slice(0, 20).map((s) => ({
    symbol: s.master.symbol,
    companyName: s.master.companyName,
    price: s.quote.price,
    changePercent: s.quote.changePercent,
    volume: s.quote.volume,
  }));
  const mostActiveVolume = [...available]
    .sort((a, b) => (b.quote.volume ?? 0) - (a.quote.volume ?? 0))
    .slice(0, 10)
    .map((s) => ({
      symbol: s.master.symbol,
      price: s.quote.price,
      changePercent: s.quote.changePercent,
      volume: s.quote.volume,
      turnoverCr: s.quote.price && s.quote.volume ? Math.round((s.quote.price * s.quote.volume) / 1e7) : 0,
    }));

  const near52High = available
    .filter((s) => s.quote.fiftyTwoWeekHigh && s.quote.price && (s.quote.fiftyTwoWeekHigh - s.quote.price) / s.quote.fiftyTwoWeekHigh <= 0.03)
    .map((s) => s.master.symbol);
  const near52Low = available
    .filter((s) => s.quote.fiftyTwoWeekLow && s.quote.price && (s.quote.price - s.quote.fiftyTwoWeekLow) / s.quote.fiftyTwoWeekLow <= 0.05)
    .map((s) => s.master.symbol);
  const unusualVolume = available
    .filter((s) => (s.technicals?.relativeVolume ?? 0) >= 1.5)
    .map((s) => ({ symbol: s.master.symbol, relVol: s.technicals?.relativeVolume, changePercent: s.quote.changePercent }));

  const sectorMap = new Map<string, { sum: number; count: number }>();
  for (const s of available) {
    const cur = sectorMap.get(s.master.sector) ?? { sum: 0, count: 0 };
    cur.sum += s.quote.changePercent ?? 0;
    cur.count += 1;
    sectorMap.set(s.master.sector, cur);
  }
  const sectors = Array.from(sectorMap.entries())
    .map(([sector, d]) => ({
      sector,
      avgChangePercent: Math.round((d.sum / d.count) * 100) / 100,
      count: d.count,
    }))
    .sort((a, b) => b.avgChangePercent - a.avgChangePercent);

  const nifty = indices.find((i) => i.id === 'NIFTY50');
  const sensex = indices.find((i) => i.id === 'SENSEX');
  const bankNifty = indices.find((i) => i.id === 'BANKNIFTY');
  const vix = indices.find((i) => i.id === 'INDIAVIX');

  const niftyPrice = nifty?.price ?? 0;
  const bankNiftyPrice = bankNifty?.price ?? 0;

  const overbought = available.filter((s) => (s.technicals?.rsi14 ?? 50) > 70).map((s) => s.master.symbol);
  const oversold = available.filter((s) => (s.technicals?.rsi14 ?? 50) < 30).map((s) => s.master.symbol);
  const macdBullish = available.filter((s) => s.technicals?.macd.crossover === 'BULLISH').map((s) => s.master.symbol);
  const supertrendBullish = available.filter((s) => s.technicals?.supertrend.trend === 'BULLISH').length;
  const breakouts = available.filter((s) => s.technicals?.structure.breakout === 'BREAKOUT').map((s) => s.master.symbol);

  const marketSummary = {
    nifty: { price: nifty?.price, change: nifty?.change, changePercent: nifty?.changePercent },
    sensex: { price: sensex?.price, change: sensex?.change, changePercent: sensex?.changePercent },
    bankNifty: { price: bankNifty?.price, change: bankNifty?.change, changePercent: bankNifty?.changePercent },
    indiaVix: { price: vix?.price, changePercent: vix?.changePercent },
    sentiment:
      (nifty?.changePercent ?? 0) > 0.35
        ? 'Bullish'
        : (nifty?.changePercent ?? 0) < -0.35
          ? 'Bearish'
          : 'Range-bound / Neutral',
    advances,
    declines,
    totalTracked: available.length,
  };

  const topMovers = {
    topGainers,
    topLosers,
    mostActiveVolume,
    near52High,
    near52Low,
    unusualVolume,
  };

  const sectorAnalysis = {
    bestSectors: sectors.slice(0, 4),
    worstSectors: [...sectors].reverse().slice(0, 4),
    allSectors: sectors,
  };

  const technicalSummary = {
    overboughtRsi70: overbought,
    oversoldRsi30: oversold,
    macdBullishCrossovers: macdBullish,
    supertrendBullishCount: supertrendBullish,
    supertrendBearishCount: available.length - supertrendBullish,
    breakouts,
  };

  const newsAndFundamentals = {
    headlines: news.slice(0, 8).map((n) => ({
      title: n.title,
      source: n.source,
      publishedAt: n.publishedAt,
      category: n.category,
    })),
  };

  const nextSessionOutlook = {
    niftySupport: niftyPrice > 0 ? [Math.round(niftyPrice * 0.992), Math.round(niftyPrice * 0.985)] : [],
    niftyResistance: niftyPrice > 0 ? [Math.round(niftyPrice * 1.007), Math.round(niftyPrice * 1.014)] : [],
    bankNiftySupport: bankNiftyPrice > 0 ? [Math.round(bankNiftyPrice * 0.99), Math.round(bankNiftyPrice * 0.982)] : [],
    bankNiftyResistance: bankNiftyPrice > 0 ? [Math.round(bankNiftyPrice * 1.008), Math.round(bankNiftyPrice * 1.015)] : [],
    stocksToMonitor: Array.from(
      new Set([...breakouts, ...unusualVolume.map((u) => u.symbol)])
    ).slice(0, 8),
  };

  return {
    marketSummary,
    topMovers,
    sectorAnalysis,
    technicalSummary,
    newsAndFundamentals,
    nextSessionOutlook,
  };
}

export async function GET() {
  try {
    const reports = await db
      .select()
      .from(dailyReports)
      .orderBy(desc(dailyReports.generatedAt))
      .limit(15);

    if (reports.length > 0) {
      return NextResponse.json({ reports });
    }

    // Automatically generate initial today's report on first visit
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const payload = await buildLiveReportPayload();
    let aiNarrativeEn = 'Automated market telemetry briefing compiled from live NSE/BSE feed data.';
    let aiNarrativeHi = 'लाइव NSE/BSE बाजार डेटा से स्वचालित बाजार सारांश तैयार किया गया है।';

    if (isGeminiConfigured()) {
      const compactJson = JSON.stringify({
        marketSummary: payload.marketSummary,
        bestSectors: payload.sectorAnalysis.bestSectors,
        worstSectors: payload.sectorAnalysis.worstSectors,
        technicalSummary: payload.technicalSummary,
        nextSessionOutlook: payload.nextSessionOutlook,
      });
      try {
        const narrative = await generateBilingualDailyReportNarrative({ summaryJson: compactJson });
        if (narrative.en) aiNarrativeEn = narrative.en;
        if (narrative.hi) aiNarrativeHi = narrative.hi;
      } catch (e) {
        console.warn('Gemini daily report narrative fallback:', e);
      }
    }

    const inserted = await db
      .insert(dailyReports)
      .values({
        reportDate: today,
        language: 'en',
        ...payload,
        aiNarrativeEn,
        aiNarrativeHi,
      })
      .onConflictDoUpdate({
        target: dailyReports.reportDate,
        set: {
          ...payload,
          aiNarrativeEn,
          aiNarrativeHi,
          generatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ reports: inserted });
  } catch (error) {
    console.error('Error in GET /api/reports:', error);
    return NextResponse.json({ error: 'Failed to load daily reports.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const today =
      typeof body?.date === 'string' && body.date
        ? body.date
        : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const payload = await buildLiveReportPayload();
    let aiNarrativeEn = 'Market session summary compiled from latest NSE/BSE exchange quotes.';
    let aiNarrativeHi = 'नवीनतम NSE/BSE बाजार आंकड़ों से सत्र का सारांश तैयार किया गया है।';

    if (isGeminiConfigured()) {
      const compactJson = JSON.stringify({
        marketSummary: payload.marketSummary,
        bestSectors: payload.sectorAnalysis.bestSectors,
        worstSectors: payload.sectorAnalysis.worstSectors,
        technicalSummary: payload.technicalSummary,
        nextSessionOutlook: payload.nextSessionOutlook,
      });
      try {
        const narrative = await generateBilingualDailyReportNarrative({ summaryJson: compactJson });
        if (narrative.en) aiNarrativeEn = narrative.en;
        if (narrative.hi) aiNarrativeHi = narrative.hi;
      } catch (e) {
        console.warn('Gemini daily report narrative fallback in POST:', e);
      }
    }

    const existing = await db.select().from(dailyReports).where(eq(dailyReports.reportDate, today));
    let saved;
    if (existing.length > 0) {
      saved = await db
        .update(dailyReports)
        .set({
          ...payload,
          aiNarrativeEn,
          aiNarrativeHi,
          generatedAt: new Date(),
        })
        .where(eq(dailyReports.reportDate, today))
        .returning();
    } else {
      saved = await db
        .insert(dailyReports)
        .values({
          reportDate: today,
          language: 'en',
          ...payload,
          aiNarrativeEn,
          aiNarrativeHi,
        })
        .returning();
    }

    return NextResponse.json({ report: saved[0] });
  } catch (error) {
    console.error('Error in POST /api/reports:', error);
    return NextResponse.json({ error: 'Failed to generate after-market report.' }, { status: 500 });
  }
}
