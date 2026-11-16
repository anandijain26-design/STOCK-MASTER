import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllIndices,
  fetchIndianFinancialNews,
  fetchSingleStockDetail,
  fetchStockUniverseWithTechnicals,
} from '@/src/lib/market-data';
import { ALL_INDIAN_STOCKS } from '@/src/lib/nse-universe';
import { isGeminiConfigured, runAiFinancialResearch } from '@/src/lib/gemini';

export const dynamic = 'force-dynamic';

const STOPWORDS = new Set([
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'ANY', 'CAN', 'HAD', 'HER',
  'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY',
  'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'LET', 'PUT', 'SAY',
  'SHE', 'TOO', 'USE', 'BUY', 'SELL', 'BEST', 'TOP', 'RSI', 'MACD', 'EMA', 'SMA',
  'VWAP', 'NSE', 'BSE', 'NIFTY', 'SENSEX', 'BANK', 'STOCK', 'STOCKS', 'INDIA', 'INDIAN',
  'TODAY', 'RIGHT', 'BELOW', 'ABOVE', 'WITH', 'FROM', 'THIS', 'THAT', 'WHAT', 'WHICH',
  'COMPARE', 'ANALYSE', 'ANALYZE', 'SHOW', 'FIND', 'STRONG', 'BULLISH', 'BEARISH',
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    const language: 'en' | 'hi' = body?.language === 'hi' ? 'hi' : 'en';
    const explicitSymbol = typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() : null;

    if (!query) {
      return NextResponse.json({ error: 'Please enter a market or stock research question.' }, { status: 400 });
    }

    // Token-based symbol matching across all 2,646+ NSE stocks
    const upperQuery = query.toUpperCase();
    const matchedTokens: string[] = upperQuery.match(/[A-Z0-9&-]{2,}/g) ?? [];
    const rawTokens = new Set(matchedTokens.filter((tk) => !STOPWORDS.has(tk)));
    const matchedSymbols = new Set<string>();
    if (explicitSymbol) matchedSymbols.add(explicitSymbol);

    // First pass: exact ticker token hits across all 2,646+ stocks
    for (const stock of ALL_INDIAN_STOCKS) {
      if (rawTokens.has(stock.symbol)) {
        matchedSymbols.add(stock.symbol);
        if (matchedSymbols.size >= 3) break;
      }
    }

    // Second pass: company first-word or full company name phrase hits
    if (matchedSymbols.size < 3) {
      for (const stock of ALL_INDIAN_STOCKS) {
        if (matchedSymbols.has(stock.symbol)) continue;
        const firstWord = stock.companyName.split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (firstWord.length > 4 && !STOPWORDS.has(firstWord) && rawTokens.has(firstWord)) {
          matchedSymbols.add(stock.symbol);
          if (matchedSymbols.size >= 3) break;
        }
      }
    }

    const [indices, news, ...stockDetails] = await Promise.all([
      fetchAllIndices(),
      fetchIndianFinancialNews(),
      ...Array.from(matchedSymbols).map((sym) => fetchSingleStockDetail(sym, '1D')),
    ]);

    const universe = await fetchStockUniverseWithTechnicals(30);
    const available = universe.filter((s) => s.quote.price !== null);
    const bullishStocks = available
      .filter((s) => (s.technicals?.rsi14 ?? 50) > 55 && s.technicals?.supertrend.trend === 'BULLISH')
      .slice(0, 6)
      .map((s) => `${s.master.symbol} (₹${s.quote.price}, ${s.quote.changePercent}%, RSI ${s.technicals?.rsi14})`);
    const oversoldStocks = available
      .filter((s) => (s.technicals?.rsi14 ?? 50) < 35)
      .slice(0, 6)
      .map((s) => `${s.master.symbol} (₹${s.quote.price}, RSI ${s.technicals?.rsi14})`);
    const volumeBreakouts = available
      .filter((s) => (s.technicals?.relativeVolume ?? 0) >= 1.5)
      .slice(0, 6)
      .map((s) => `${s.master.symbol} (RelVol ${s.technicals?.relativeVolume}x, ${s.quote.changePercent}%)`);

    const contextLines: string[] = [];
    contextLines.push(`Timestamp (UTC): ${new Date().toISOString()}`);
    contextLines.push('Indices:');
    for (const idx of indices.slice(0, 8)) {
      contextLines.push(
        `  - ${idx.name}: ${idx.price ?? 'Unavailable'} (${idx.changePercent ?? 0}%, status: ${idx.status})`
      );
    }

    if (stockDetails.length > 0) {
      contextLines.push('\nRequested / Matched Stocks Telemetry:');
      for (const sd of stockDetails) {
        contextLines.push(
          JSON.stringify({
            symbol: sd.master.symbol,
            company: sd.master.companyName,
            sector: sd.master.sector,
            series: sd.master.series,
            price: sd.quote.price,
            changePercent: sd.quote.changePercent,
            volume: sd.quote.volume,
            high52W: sd.quote.fiftyTwoWeekHigh,
            low52W: sd.quote.fiftyTwoWeekLow,
            timestamp: sd.quote.timestamp,
            rsi14: sd.technicals?.rsi14,
            ema20: sd.technicals?.ema20,
            ema50: sd.technicals?.ema50,
            ema200: sd.technicals?.ema200,
            macd: sd.technicals?.macd,
            supertrend: sd.technicals?.supertrend,
            relativeVolume: sd.technicals?.relativeVolume,
            pivots: sd.technicals?.pivots,
            supports: sd.technicals?.supportLevels,
            resistances: sd.technicals?.resistanceLevels,
            peRef: sd.master.peRef,
            pbRef: sd.master.pbRef,
            roeRef: sd.master.roeRef,
            debtToEquityRef: sd.master.debtToEquityRef,
          })
        );
      }
    }

    contextLines.push(`\nLive Screener Snapshots:`);
    contextLines.push(`  - Bullish Momentum (RSI>55 & Supertrend Bullish): ${bullishStocks.join(', ') || 'None currently'}`);
    contextLines.push(`  - Oversold Candidates (RSI<35): ${oversoldStocks.join(', ') || 'None currently'}`);
    contextLines.push(`  - High Relative Volume (>=1.5x): ${volumeBreakouts.join(', ') || 'None currently'}`);
    contextLines.push(`\nLatest Headlines:`);
    for (const n of news.slice(0, 6)) {
      contextLines.push(`  - [${n.source}] ${n.title}`);
    }

    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          error:
            language === 'hi'
              ? 'GEMINI_API_KEY सर्वर पर कॉन्फ़िगर नहीं है। AI विश्लेषक का उपयोग करने के लिए कृपया Secrets पैनल में कुंजी सेट करें।'
              : 'GEMINI_API_KEY is not configured on the server. Please configure it in Settings > Secrets.',
          factualSnapshot: stockDetails.map((s) => ({
            symbol: s.master.symbol,
            price: s.quote.price,
            changePercent: s.quote.changePercent,
            rsi14: s.technicals?.rsi14,
          })),
        },
        { status: 503 }
      );
    }

    const analysis = await runAiFinancialResearch({
      query,
      language,
      marketContext: contextLines.join('\n'),
    });

    return NextResponse.json({
      query,
      language,
      analysis,
      matchedSymbols: Array.from(matchedSymbols),
      factualSnapshots: stockDetails.map((sd) => ({
        symbol: sd.master.symbol,
        companyName: sd.master.companyName,
        price: sd.quote.price,
        changePercent: sd.quote.changePercent,
        rsi14: sd.technicals?.rsi14 ?? null,
        supertrend: sd.technicals?.supertrend.trend ?? 'NEUTRAL',
        supports: sd.technicals?.supportLevels ?? [],
        resistances: sd.technicals?.resistanceLevels ?? [],
        timestamp: sd.quote.timestamp,
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/ai/analyst:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI analysis failed.' },
      { status: 500 }
    );
  }
}
