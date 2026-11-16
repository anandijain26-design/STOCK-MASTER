import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/src/db/index.ts';
import { savedScanners } from '@/src/db/schema.ts';
import { verifyBearerAuth } from '@/src/lib/auth-server.ts';

export async function GET(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(savedScanners)
      .where(eq(savedScanners.userId, authCtx.dbUser.id))
      .orderBy(desc(savedScanners.createdAt));
    return NextResponse.json({ scanners: rows });
  } catch (error) {
    console.error('Error in GET /api/user/scanners:', error);
    return NextResponse.json({ error: 'Failed to load saved scanners.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const frequency = typeof body.frequency === 'string' ? body.frequency : '1D';
    const conditions = Array.isArray(body.conditions) ? body.conditions : [];
    if (!name || conditions.length === 0) {
      return NextResponse.json({ error: 'Scanner name and conditions required.' }, { status: 400 });
    }
    const created = await db
      .insert(savedScanners)
      .values({ userId: authCtx.dbUser.id, name, frequency, conditions })
      .returning();
    return NextResponse.json({ scanner: created[0] });
  } catch (error) {
    console.error('Error in POST /api/user/scanners:', error);
    return NextResponse.json({ error: 'Failed to save scanner.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'Missing scanner ID.' }, { status: 400 });
    await db
      .delete(savedScanners)
      .where(and(eq(savedScanners.id, id), eq(savedScanners.userId, authCtx.dbUser.id)));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error in DELETE /api/user/scanners:', error);
    return NextResponse.json({ error: 'Failed to delete scanner.' }, { status: 500 });
  }
}
