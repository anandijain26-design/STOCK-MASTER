import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/src/db/index.ts';
import { watchlists } from '@/src/db/schema.ts';
import { verifyBearerAuth } from '@/src/lib/auth-server.ts';

export async function GET(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await db
      .select()
      .from(watchlists)
      .where(eq(watchlists.userId, authCtx.dbUser.id));
    return NextResponse.json({ watchlists: rows });
  } catch (error) {
    console.error('Error in GET /api/user/watchlists:', error);
    return NextResponse.json({ error: 'Failed to load watchlists.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (body.action === 'create') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name) return NextResponse.json({ error: 'Watchlist name required.' }, { status: 400 });
      const created = await db
        .insert(watchlists)
        .values({
          userId: authCtx.dbUser.id,
          name,
          description: typeof body.description === 'string' ? body.description : null,
          symbols: Array.isArray(body.symbols) ? body.symbols : [],
        })
        .returning();
      return NextResponse.json({ watchlist: created[0] });
    }

    if (body.action === 'addSymbol' || body.action === 'removeSymbol') {
      const watchlistId = Number(body.watchlistId);
      const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
      if (!watchlistId || !symbol) {
        return NextResponse.json({ error: 'Watchlist ID and symbol required.' }, { status: 400 });
      }
      const existing = await db
        .select()
        .from(watchlists)
        .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, authCtx.dbUser.id)));
      if (existing.length === 0) {
        return NextResponse.json({ error: 'Watchlist not found.' }, { status: 404 });
      }
      const current = Array.isArray(existing[0].symbols) ? existing[0].symbols : [];
      const nextSymbols =
        body.action === 'addSymbol'
          ? Array.from(new Set([...current, symbol]))
          : current.filter((s) => s !== symbol);
      const updated = await db
        .update(watchlists)
        .set({ symbols: nextSymbols, updatedAt: new Date() })
        .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, authCtx.dbUser.id)))
        .returning();
      return NextResponse.json({ watchlist: updated[0] });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/user/watchlists:', error);
    return NextResponse.json({ error: 'Failed to update watchlist.' }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: 'Missing watchlist ID.' }, { status: 400 });

    await db
      .delete(watchlists)
      .where(and(eq(watchlists.id, id), eq(watchlists.userId, authCtx.dbUser.id)));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error in DELETE /api/user/watchlists:', error);
    return NextResponse.json({ error: 'Failed to delete watchlist.' }, { status: 500 });
  }
}
