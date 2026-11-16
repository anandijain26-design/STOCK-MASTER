import { NextRequest, NextResponse } from 'next/server';
import {
  fetchStocksWithQuotesForItems,
  fetchStockUniverseWithTechnicals,
} from '@/src/lib/market-data';
import {
  ALL_INDIAN_STOCKS,
  CURATED_STOCK_UNIVERSE,
  StockMasterItem,
} from '@/src/lib/nse-universe';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim().toLowerCase();
    const cap = searchParams.get('cap') ?? 'ALL';
    const sector = searchParams.get('sector') ?? 'ALL';
    const series = searchParams.get('series') ?? 'ALL';
    const fnoOnly = searchParams.get('fno') === 'true';
    const scope = searchParams.get('scope') ?? 'all';
    const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
    const pageSize = Math.min(80, Math.max(10, Number(searchParams.get('pageSize') ?? 36) || 36));

    // Fast path for Scanners / Breadth screeners across curated F&O / flagship stocks
    if (scope === 'leaders') {
      const stocks = await fetchStockUniverseWithTechnicals(CURATED_STOCK_UNIVERSE.length);
      const filtered = stocks.filter((s) => {
        if (cap !== 'ALL' && s.master.marketCapCategory !== cap) return false;
        if (sector !== 'ALL' && s.master.sector !== sector) return false;
        if (fnoOnly && !s.master.isFno) return false;
        if (q) {
          const matchSym = s.master.symbol.toLowerCase().includes(q);
          const matchName = s.master.companyName.toLowerCase().includes(q);
          const matchSec = s.master.sector.toLowerCase().includes(q);
          if (!matchSym && !matchName && !matchSec) return false;
        }
        return true;
      });

      const rows = filtered.map(mapStockRow);
      return NextResponse.json({
        total: rows.length,
        totalUniverse: ALL_INDIAN_STOCKS.length,
        page: 1,
        pageSize: rows.length,
        totalPages: 1,
        sectors: Array.from(new Set(ALL_INDIAN_STOCKS.map((s) => s.sector))).sort(),
        seriesList: ['EQ', 'BE', 'BZ'],
        stocks: rows,
        fetchedAt: new Date().toISOString(),
      });
    }

    // Full 2,646+ NSE Equity Directory (filter & paginate first, then fetch live Yahoo quotes for visible page)
    const matchedMasters: StockMasterItem[] = ALL_INDIAN_STOCKS.filter((m) => {
      if (cap !== 'ALL' && m.marketCapCategory !== cap) return false;
      if (sector !== 'ALL' && m.sector !== sector) return false;
      if (series !== 'ALL' && (m.series ?? 'EQ') !== series) return false;
      if (fnoOnly && !m.isFno) return false;
      if (q) {
        const matchSym = m.symbol.toLowerCase().includes(q);
        const matchName = m.companyName.toLowerCase().includes(q);
        const matchSec = m.sector.toLowerCase().includes(q);
        const matchIsin = m.isin.toLowerCase().includes(q);
        const matchBse = m.bseCode.toLowerCase().includes(q);
        if (!matchSym && !matchName && !matchSec && !matchIsin && !matchBse) return false;
      }
      return true;
    });

    // Prioritize exact symbol prefix matches when searching
    if (q) {
      matchedMasters.sort((a, b) => {
        const aExact = a.symbol.toLowerCase() === q ? 0 : a.symbol.toLowerCase().startsWith(q) ? 1 : 2;
        const bExact = b.symbol.toLowerCase() === q ? 0 : b.symbol.toLowerCase().startsWith(q) ? 1 : 2;
        return aExact - bExact;
      });
    }

    const total = matchedMasters.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageSlice = matchedMasters.slice(start, start + pageSize);

    const enriched = await fetchStocksWithQuotesForItems(pageSlice);
    const rows = enriched.map(mapStockRow);

    return NextResponse.json({
      total,
      totalUniverse: ALL_INDIAN_STOCKS.length,
      page: safePage,
      pageSize,
      totalPages,
      sectors: Array.from(new Set(ALL_INDIAN_STOCKS.map((s) => s.sector))).sort(),
      seriesList: ['EQ', 'BE', 'BZ'],
      stocks: rows,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/market/stocks:', error);
    return NextResponse.json({ error: 'Failed to load stock universe.' }, { status: 500 });
  }
}

function mapStockRow(s: Awaited<ReturnType<typeof fetchStockUniverseWithTechnicals>>[number]) {
  const price = s.quote.price ?? 0;
  const high52 = s.quote.fiftyTwoWeekHigh;
  const low52 = s.quote.fiftyTwoWeekLow;
  return {
    symbol: s.master.symbol,
    bseCode: s.master.bseCode,
    isin: s.master.isin,
    series: s.master.series ?? 'EQ',
    listingDate: s.master.listingDate ?? null,
    faceValue: s.master.faceValue,
    companyName: s.master.companyName,
    exchange: s.master.exchange,
    sector: s.master.sector,
    industry: s.master.industry,
    marketCapCategory: s.master.marketCapCategory,
    isFno: s.master.isFno,
    price: s.quote.price,
    previousClose: s.quote.previousClose,
    change: s.quote.change,
    changePercent: s.quote.changePercent ?? 0,
    volume: s.quote.volume ?? 0,
    fiftyTwoWeekHigh: high52,
    fiftyTwoWeekLow: low52,
    near52WHigh: Boolean(high52 && price > 0 && (high52 - price) / high52 <= 0.03),
    near52WLow: Boolean(low52 && price > 0 && (price - low52) / low52 <= 0.05),
    relativeVolume: s.technicals?.relativeVolume ?? null,
    rsi14: s.technicals?.rsi14 ?? null,
    ema20: s.technicals?.ema20 ?? null,
    ema50: s.technicals?.ema50 ?? null,
    ema200: s.technicals?.ema200 ?? null,
    sma50: s.technicals?.sma50 ?? null,
    sma200: s.technicals?.sma200 ?? null,
    macd: s.technicals?.macd.macd ?? null,
    macdSignal: s.technicals?.macd.signal ?? null,
    macdCrossover: s.technicals?.macd.crossover ?? 'NONE',
    supertrendSignal: s.technicals?.supertrend.trend ?? 'NEUTRAL',
    breakout: s.technicals?.structure.breakout ?? 'NONE',
    patterns: s.technicals?.patterns ?? [],
    peRatio: s.master.peRef ?? null,
    pbRatio: s.master.pbRef ?? null,
    roe: s.master.roeRef ?? null,
    roce: s.master.roceRef ?? null,
    debtToEquity: s.master.debtToEquityRef ?? null,
    profitGrowth: s.master.profitGrowthRef ?? null,
    timestamp: s.quote.timestamp,
    status: s.quote.status,
    isDelayed: s.quote.isDelayed,
    source: s.quote.source,
  };
}
