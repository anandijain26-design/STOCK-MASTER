import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/src/db/index.ts';
import { paperAccounts, paperPositions, paperTrades } from '@/src/db/schema.ts';
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
    let accounts = await db
      .select()
      .from(paperAccounts)
      .where(eq(paperAccounts.userId, authCtx.dbUser.id));

    if (accounts.length === 0) {
      accounts = await db
        .insert(paperAccounts)
        .values({
          userId: authCtx.dbUser.id,
          accountName: 'Virtual NSE Paper Account',
          initialCapital: '100000',
          cashBalance: '100000',
          realizedPnl: '0',
        })
        .returning();
    }

    const account = accounts[0];
    const [positions, trades] = await Promise.all([
      db.select().from(paperPositions).where(eq(paperPositions.accountId, account.id)),
      db
        .select()
        .from(paperTrades)
        .where(eq(paperTrades.accountId, account.id))
        .orderBy(desc(paperTrades.executedAt))
        .limit(100),
    ]);

    const enrichedPositions = await Promise.all(
      positions.map(async (pos) => {
        const { quote } = await fetchYahooChart(pos.symbol, '1D', pos.companyName, pos.exchange);
        const avgPrice = Number(pos.avgPrice);
        const ltp = quote.price;
        const invested = pos.quantity * avgPrice;
        const currentVal = ltp !== null ? pos.quantity * ltp : invested;
        const unrealizedPnl = ltp !== null ? currentVal - invested : 0;
        const unrealizedPct = invested > 0 ? (unrealizedPnl / invested) * 100 : 0;
        return {
          ...pos,
          avgPrice,
          ltp,
          invested: Math.round(invested * 100) / 100,
          currentValue: Math.round(currentVal * 100) / 100,
          unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
          unrealizedPct: Math.round(unrealizedPct * 100) / 100,
          priceTimestamp: quote.timestamp,
        };
      })
    );

    const cashBalance = Number(account.cashBalance);
    const investedTotal = enrichedPositions.reduce((a, p) => a + p.invested, 0);
    const marketValueTotal = enrichedPositions.reduce((a, p) => a + p.currentValue, 0);
    const unrealizedTotal = marketValueTotal - investedTotal;

    return NextResponse.json({
      isVirtual: true,
      account: {
        ...account,
        initialCapital: Number(account.initialCapital),
        cashBalance,
        realizedPnl: Number(account.realizedPnl),
        investedValue: Math.round(investedTotal * 100) / 100,
        holdingsMarketValue: Math.round(marketValueTotal * 100) / 100,
        totalNetWorth: Math.round((cashBalance + marketValueTotal) * 100) / 100,
        unrealizedPnl: Math.round(unrealizedTotal * 100) / 100,
      },
      positions: enrichedPositions,
      trades,
    });
  } catch (error) {
    console.error('Error in GET /api/paper-trading:', error);
    return NextResponse.json({ error: 'Failed to load virtual paper trading account.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const accounts = await db
      .select()
      .from(paperAccounts)
      .where(eq(paperAccounts.userId, authCtx.dbUser.id));

    const account =
      accounts[0] ??
      (
        await db
          .insert(paperAccounts)
          .values({
            userId: authCtx.dbUser.id,
            accountName: 'Virtual NSE Paper Account',
            initialCapital: '100000',
            cashBalance: '100000',
            realizedPnl: '0',
          })
          .returning()
      )[0];

    if (body.action === 'reset') {
      const cap = Number(body.initialCapital) > 0 ? Number(body.initialCapital) : 100000;
      await db.delete(paperPositions).where(eq(paperPositions.accountId, account.id));
      await db.delete(paperTrades).where(eq(paperTrades.accountId, account.id));
      await db
        .update(paperAccounts)
        .set({
          initialCapital: cap.toFixed(2),
          cashBalance: cap.toFixed(2),
          realizedPnl: '0',
          updatedAt: new Date(),
        })
        .where(eq(paperAccounts.id, account.id));
      return NextResponse.json({ reset: true, initialCapital: cap });
    }

    const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
    const side = body.side === 'SELL' ? 'SELL' : 'BUY';
    const orderType =
      body.orderType === 'LIMIT' ? 'LIMIT' : body.orderType === 'SL' ? 'SL' : 'MARKET';
    const quantity = Math.floor(Number(body.quantity));

    if (!symbol || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Valid symbol and whole-share positive quantity are required.' }, { status: 400 });
    }

    const master = findStockMaster(symbol);
    const { quote } = await fetchYahooChart(symbol, '1D', master?.companyName ?? symbol, 'NSE');

    if (quote.price === null) {
      return NextResponse.json(
        { error: `Live market price unavailable for ${symbol}. Virtual trade cannot execute without real market anchor.` },
        { status: 503 }
      );
    }

    let executedPrice = quote.price;
    const simPrice = Number(body.simulatedPrice);
    const limitPx = Number(body.limitPrice);
    const isSimulatedTick = Boolean(body.isSimulatedTick) && Number.isFinite(simPrice) && simPrice > 0;

    if (isSimulatedTick) {
      // Bound simulated tick inside NSE 20% circuit band around live reference price
      const minBand = quote.price * 0.8;
      const maxBand = quote.price * 1.2;
      executedPrice = Math.min(maxBand, Math.max(minBand, Math.round(simPrice * 100) / 100));
    } else if ((orderType === 'LIMIT' || orderType === 'SL') && Number.isFinite(limitPx) && limitPx > 0) {
      executedPrice = Math.round(limitPx * 100) / 100;
    }

    const totalValue = Math.round(executedPrice * quantity * 100) / 100;
    const cash = Number(account.cashBalance);
    let realizedDelta = 0;

    const existingPos = await db
      .select()
      .from(paperPositions)
      .where(and(eq(paperPositions.accountId, account.id), eq(paperPositions.symbol, symbol)));

    if (side === 'BUY') {
      if (totalValue > cash) {
        return NextResponse.json(
          { error: `Insufficient virtual cash. Order requires ₹${totalValue.toLocaleString('en-IN')}, available ₹${cash.toLocaleString('en-IN')}.` },
          { status: 400 }
        );
      }

      if (existingPos.length > 0) {
        const curQty = existingPos[0].quantity;
        const curAvg = Number(existingPos[0].avgPrice);
        const newQty = curQty + quantity;
        const newAvg = (curQty * curAvg + totalValue) / newQty;
        await db
          .update(paperPositions)
          .set({
            quantity: newQty,
            avgPrice: newAvg.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(paperPositions.id, existingPos[0].id));
      } else {
        await db.insert(paperPositions).values({
          accountId: account.id,
          symbol,
          companyName: master?.companyName ?? quote.name,
          exchange: 'NSE',
          quantity,
          avgPrice: executedPrice.toFixed(2),
        });
      }

      await db
        .update(paperAccounts)
        .set({
          cashBalance: (cash - totalValue).toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(paperAccounts.id, account.id));
    } else {
      if (existingPos.length === 0 || existingPos[0].quantity < quantity) {
        const held = existingPos[0]?.quantity ?? 0;
        return NextResponse.json(
          { error: `Insufficient virtual shares of ${symbol}. Held: ${held}, requested sell: ${quantity}.` },
          { status: 400 }
        );
      }
      const curAvg = Number(existingPos[0].avgPrice);
      realizedDelta = Math.round((executedPrice - curAvg) * quantity * 100) / 100;
      const remQty = existingPos[0].quantity - quantity;

      if (remQty === 0) {
        await db.delete(paperPositions).where(eq(paperPositions.id, existingPos[0].id));
      } else {
        await db
          .update(paperPositions)
          .set({ quantity: remQty, updatedAt: new Date() })
          .where(eq(paperPositions.id, existingPos[0].id));
      }

      await db
        .update(paperAccounts)
        .set({
          cashBalance: (cash + totalValue).toFixed(2),
          realizedPnl: (Number(account.realizedPnl) + realizedDelta).toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(paperAccounts.id, account.id));
    }

    const trade = await db
      .insert(paperTrades)
      .values({
        accountId: account.id,
        symbol,
        companyName: master?.companyName ?? quote.name,
        exchange: 'NSE',
        side,
        orderType,
        quantity,
        executedPrice: executedPrice.toFixed(2),
        totalValue: totalValue.toFixed(2),
        realizedPnl: realizedDelta.toFixed(2),
        priceSource: isSimulatedTick
          ? 'Demo Tick Simulator (NSE Anchored)'
          : `${quote.source} (${quote.isDelayed ? 'Delayed' : 'Live'})`,
      })
      .returning();

    return NextResponse.json({ ok: true, trade: trade[0], isVirtual: true });
  } catch (error) {
    console.error('Error in POST /api/paper-trading:', error);
    return NextResponse.json({ error: 'Failed to execute virtual paper trade.' }, { status: 500 });
  }
}
