import { NextRequest, NextResponse } from 'next/server';
import {
  fetchIndianFinancialNews,
  fetchSingleStockDetail,
} from '@/src/lib/market-data';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await context.params;
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') ?? '1D';

    const [detail, allNews] = await Promise.all([
      fetchSingleStockDetail(symbol, timeframe),
      fetchIndianFinancialNews(),
    ]);

    const cleanSym = detail.master.symbol.toUpperCase();
    const firstWord = detail.master.companyName.split(' ')[0].toLowerCase();
    const relatedNews = allNews
      .filter(
        (n) =>
          n.title.toLowerCase().includes(cleanSym.toLowerCase()) ||
          (firstWord.length > 3 && n.title.toLowerCase().includes(firstWord))
      )
      .slice(0, 8);

    // Derive deterministic historical summary metrics from real OHLCV bars
    const price = detail.quote.price;
    const bookValue =
      price && detail.master.pbRef && detail.master.pbRef > 0
        ? Math.round((price / detail.master.pbRef) * 100) / 100
        : null;
    const eps =
      price && detail.master.peRef && detail.master.peRef > 0
        ? Math.round((price / detail.master.peRef) * 100) / 100
        : null;

    return NextResponse.json({
      master: detail.master,
      quote: detail.quote,
      bars: detail.bars,
      technicals: detail.technicals,
      derivedFundamentals: {
        eps,
        bookValue,
        peRatio: detail.master.peRef ?? null,
        pbRatio: detail.master.pbRef ?? null,
        roe: detail.master.roeRef ?? null,
        roce: detail.master.roceRef ?? null,
        debtToEquity: detail.master.debtToEquityRef ?? null,
        dividendYield: detail.master.dividendYieldRef ?? null,
        faceValue: detail.master.faceValue,
        profitGrowth: detail.master.profitGrowthRef ?? null,
        shareholding: {
          promoter: detail.master.promoterHolding ?? null,
          fii: detail.master.fiiHolding ?? null,
          dii: detail.master.diiHolding ?? null,
          public:
            detail.master.promoterHolding !== undefined &&
            detail.master.fiiHolding !== undefined &&
            detail.master.diiHolding !== undefined
              ? Math.max(
                  0,
                  Math.round(
                    (100 -
                      detail.master.promoterHolding -
                      detail.master.fiiHolding -
                      detail.master.diiHolding) *
                      10
                  ) / 10
                )
              : null,
        },
        note: 'Exchange master & fundamental ratios are reference filing metrics paired with live market price.',
      },
      relatedNews: relatedNews.length > 0 ? relatedNews : allNews.slice(0, 4),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/market/stock/[symbol]:', error);
    return NextResponse.json({ error: 'Failed to load stock details.' }, { status: 500 });
  }
}
