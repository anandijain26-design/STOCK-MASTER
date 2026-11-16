import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/src/db/index.ts';
import { savedCharts } from '@/src/db/schema.ts';
import { verifyBearerAuth } from '@/src/lib/auth-server.ts';

export async function GET(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(savedCharts)
      .where(eq(savedCharts.userId, authCtx.dbUser.id))
      .orderBy(desc(savedCharts.createdAt));
    return NextResponse.json({ charts: rows });
  } catch (error) {
    console.error('Error in GET /api/user/charts:', error);
    return NextResponse.json({ error: 'Failed to load saved charts.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : 'RELIANCE';
    const title = typeof body.title === 'string' ? body.title.trim() : `${symbol} Layout`;
    const chartType = typeof body.chartType === 'string' ? body.chartType : 'candlestick';
    const timeframe = typeof body.timeframe === 'string' ? body.timeframe : '1D';
    const indicators = body.indicators && typeof body.indicators === 'object' ? body.indicators : {};
    const drawings = Array.isArray(body.drawings) ? body.drawings : [];

    const created = await db
      .insert(savedCharts)
      .values({
        userId: authCtx.dbUser.id,
        symbol,
        title,
        chartType,
        timeframe,
        indicators,
        drawings,
      })
      .returning();

    return NextResponse.json({ chart: created[0] });
  } catch (error) {
    console.error('Error in POST /api/user/charts:', error);
    return NextResponse.json({ error: 'Failed to save chart layout.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'Missing chart ID.' }, { status: 400 });
    await db
      .delete(savedCharts)
      .where(and(eq(savedCharts.id, id), eq(savedCharts.userId, authCtx.dbUser.id)));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error in DELETE /api/user/charts:', error);
    return NextResponse.json({ error: 'Failed to delete saved chart.' }, { status: 500 });
  }
}
