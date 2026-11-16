import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/src/db/index.ts';
import { portfolioHoldings, portfolioTransactions } from '@/src/db/schema.ts';
import { verifyBearerAuth } from '@/src/lib/auth-server.ts';
import { fetchYahooChart } from '@/src/lib/market-data';
import { findStockMaster } from '@/src/lib/nse-universe';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [holdings, transactions] = await Promise.all([
      db
        .select()
        .from(portfolioHoldings)
        .where(eq(portfolioHoldings.userId, authCtx.dbUser.id)),
      db
        .select()
        .from(portfolioTransactions)
        .where(eq(portfolioTransactions.userId, authCtx.dbUser.id))
        .orderBy(desc(portfolioTransactions.createdAt))
        .limit(50),
    ]);

    const enriched = await Promise.all(
      holdings.map(async (h) => {
        const { quote } = await fetchYahooChart(h.symbol, '1D', h.companyName, h.exchange);
        const qty = Number(h.quantity);
        const avgBuy = Number(h.avgBuyPrice);
        const invested = qty * avgBuy;
        const ltp = quote.price;
        const currentValue = ltp !== null ? qty * ltp : null;
        const unrealizedPnl = currentValue !== null ? currentValue - invested : null;
        const unrealizedPnlPct =
          unrealizedPnl !== null && invested > 0 ? (unrealizedPnl / invested) * 100 : null;
        return {
          ...h,
          quantity: qty,
          avgBuyPrice: avgBuy,
          realizedPnl: Number(h.realizedPnl),
          invested: Math.round(invested * 100) / 100,
          ltp,
          currentValue: currentValue !== null ? Math.round(currentValue * 100) / 100 : null,
          unrealizedPnl: unrealizedPnl !== null ? Math.round(unrealizedPnl * 100) / 100 : null,
          unrealizedPnlPct: unrealizedPnlPct !== null ? Math.round(unrealizedPnlPct * 100) / 100 : null,
          dayChangePercent: quote.changePercent,
        };
      })
    );

    const totalInvested = enriched.reduce((a, b) => a + b.invested, 0);
    const totalCurrent = enriched.reduce((a, b) => a + (b.currentValue ?? b.invested), 0);
    const totalRealized = transactions.reduce((a, t) => a + Number(t.realizedPnl), 0);

    return NextResponse.json({
      holdings: enriched,
      transactions,
      summary: {
        totalInvested: Math.round(totalInvested * 100) / 100,
        totalCurrentValue: Math.round(totalCurrent * 100) / 100,
        totalUnrealizedPnl: Math.round((totalCurrent - totalInvested) * 100) / 100,
        totalRealizedPnl: Math.round(totalRealized * 100) / 100,
        overallReturnPct:
          totalInvested > 0
            ? Math.round(((totalCurrent - totalInvested) / totalInvested) * 10000) / 100
            : 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/user/portfolio:', error);
    return NextResponse.json({ error: 'Failed to load portfolio.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
    const side = body.side === 'SELL' ? 'SELL' : 'BUY';
    const quantity = Number(body.quantity);
    const price = Number(body.price);
    const tradeDate =
      typeof body.tradeDate === 'string' && body.tradeDate
        ? body.tradeDate
        : new Date().toISOString().slice(0, 10);

    if (!symbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Valid symbol, positive quantity, and price are required.' }, { status: 400 });
    }

    const master = findStockMaster(symbol);
    const companyName = (typeof body.companyName === 'string' && body.companyName.trim()) || master?.companyName || symbol;
    const sector = (typeof body.sector === 'string' && body.sector.trim()) || master?.sector || 'Diversified';

    const existing = await db
      .select()
      .from(portfolioHoldings)
      .where(and(eq(portfolioHoldings.userId, authCtx.dbUser.id), eq(portfolioHoldings.symbol, symbol)));

    let realizedDelta = 0;

    if (side === 'BUY') {
      if (existing.length > 0) {
        const curQty = Number(existing[0].quantity);
        const curAvg = Number(existing[0].avgBuyPrice);
        const newQty = curQty + quantity;
        const newAvg = (curQty * curAvg + quantity * price) / newQty;
        await db
          .update(portfolioHoldings)
          .set({
            quantity: newQty.toFixed(4),
            avgBuyPrice: newAvg.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(portfolioHoldings.id, existing[0].id));
      } else {
        await db.insert(portfolioHoldings).values({
          userId: authCtx.dbUser.id,
          symbol,
          companyName,
          exchange: 'NSE',
          sector,
          quantity: quantity.toFixed(4),
          avgBuyPrice: price.toFixed(2),
          buyDate: tradeDate,
          realizedPnl: '0',
        });
      }
    } else {
      if (existing.length === 0) {
        return NextResponse.json({ error: `No existing holding for ${symbol} to sell.` }, { status: 400 });
      }
      const curQty = Number(existing[0].quantity);
      const curAvg = Number(existing[0].avgBuyPrice);
      if (quantity > curQty) {
        return NextResponse.json({ error: `Cannot sell ${quantity} shares; only ${curQty} held.` }, { status: 400 });
      }
      realizedDelta = (price - curAvg) * quantity;
      const remQty = curQty - quantity;
      if (remQty <= 0.0001) {
        await db.delete(portfolioHoldings).where(eq(portfolioHoldings.id, existing[0].id));
      } else {
        await db
          .update(portfolioHoldings)
          .set({
            quantity: remQty.toFixed(4),
            realizedPnl: (Number(existing[0].realizedPnl) + realizedDelta).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(portfolioHoldings.id, existing[0].id));
      }
    }

    await db.insert(portfolioTransactions).values({
      userId: authCtx.dbUser.id,
      symbol,
      side,
      quantity: quantity.toFixed(4),
      price: price.toFixed(2),
      tradeDate,
      realizedPnl: realizedDelta.toFixed(2),
    });

    return NextResponse.json({ ok: true, realizedPnl: Math.round(realizedDelta * 100) / 100 });
  } catch (error) {
    console.error('Error in POST /api/user/portfolio:', error);
    return NextResponse.json({ error: 'Failed to update portfolio.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'Missing holding ID.' }, { status: 400 });

    await db
      .delete(portfolioHoldings)
      .where(and(eq(portfolioHoldings.id, id), eq(portfolioHoldings.userId, authCtx.dbUser.id)));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error in DELETE /api/user/portfolio:', error);
    return NextResponse.json({ error: 'Failed to delete holding.' }, { status: 500 });
  }
}
