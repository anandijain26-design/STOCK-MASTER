import { NextResponse } from 'next/server';
import {
  fetchAllIndices,
  fetchNseMarketStatusLive,
  fetchStockUniverseWithTechnicals,
  getIndianMarketStatus,
} from '@/src/lib/market-data';
import { db } from '@/src/db/index.ts';
import { platformAnnouncements } from '@/src/db/schema.ts';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [indices, stocksWithTech, nseStatus] = await Promise.all([
      fetchAllIndices(),
      fetchStockUniverseWithTechnicals(42),
      fetchNseMarketStatusLive(),
    ]);

    const availableStocks = stocksWithTech.filter((s) => s.quote.price !== null);
    const advances = availableStocks.filter((s) => (s.quote.changePercent ?? 0) > 0).length;
    const declines = availableStocks.filter((s) => (s.quote.changePercent ?? 0) < 0).length;
    const unchanged = availableStocks.length - advances - declines;

    const sortedByChange = [...availableStocks].sort(
      (a, b) => (b.quote.changePercent ?? 0) - (a.quote.changePercent ?? 0)
    );
    const topGainers = sortedByChange.slice(0, 8);
    const topLosers = [...sortedByChange].reverse().slice(0, 8);
    const mostActive = [...availableStocks]
      .sort((a, b) => (b.quote.volume ?? 0) - (a.quote.volume ?? 0))
      .slice(0, 8);

    // Sector aggregation from live tracked stocks
    const sectorMap = new Map<string, { sum: number; count: number; adv: number; dec: number }>();
    for (const s of availableStocks) {
      const sec = s.master.sector;
      const cur = sectorMap.get(sec) ?? { sum: 0, count: 0, adv: 0, dec: 0 };
      const chg = s.quote.changePercent ?? 0;
      cur.sum += chg;
      cur.count += 1;
      if (chg > 0) cur.adv += 1;
      else if (chg < 0) cur.dec += 1;
      sectorMap.set(sec, cur);
    }

    const sectorPerformance = Array.from(sectorMap.entries())
      .map(([sector, d]) => ({
        sector,
        avgChangePercent: Math.round((d.sum / d.count) * 100) / 100,
        advances: d.adv,
        declines: d.dec,
        stockCount: d.count,
      }))
      .sort((a, b) => b.avgChangePercent - a.avgChangePercent);

    let announcements: Array<{ id: number; title: string; body: string; severity: string }> = [];
    try {
      announcements = await db
        .select({
          id: platformAnnouncements.id,
          title: platformAnnouncements.title,
          body: platformAnnouncements.body,
          severity: platformAnnouncements.severity,
        })
        .from(platformAnnouncements)
        .where(eq(platformAnnouncements.isActive, true));
    } catch {
      announcements = [];
    }

    const formatRow = (s: (typeof availableStocks)[number]) => ({
      symbol: s.master.symbol,
      companyName: s.master.companyName,
      sector: s.master.sector,
      marketCapCategory: s.master.marketCapCategory,
      isFno: s.master.isFno,
      price: s.quote.price,
      change: s.quote.change,
      changePercent: s.quote.changePercent,
      volume: s.quote.volume,
      rsi14: s.technicals?.rsi14 ?? null,
      supertrend: s.technicals?.supertrend.trend ?? 'NEUTRAL',
      relativeVolume: s.technicals?.relativeVolume ?? null,
      timestamp: s.quote.timestamp,
      status: s.quote.status,
    });

    return NextResponse.json({
      marketStatus: getIndianMarketStatus(),
      nseLiveStatus: nseStatus,
      indices,
      breadth: {
        totalTracked: availableStocks.length,
        advances,
        declines,
        unchanged,
        advanceDeclineRatio: declines > 0 ? Math.round((advances / declines) * 100) / 100 : advances,
      },
      topGainers: topGainers.map(formatRow),
      topLosers: topLosers.map(formatRow),
      mostActive: mostActive.map(formatRow),
      sectorPerformance,
      announcements,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/market/overview:', error);
    return NextResponse.json(
      { error: 'Unable to fetch market overview from upstream feeds.' },
      { status: 500 }
    );
  }
}
