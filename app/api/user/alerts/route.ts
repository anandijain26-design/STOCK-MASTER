import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/src/db/index.ts';
import { priceAlerts } from '@/src/db/schema.ts';
import { verifyBearerAuth } from '@/src/lib/auth-server.ts';

export async function GET(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, authCtx.dbUser.id))
      .orderBy(desc(priceAlerts.createdAt));
    return NextResponse.json({ alerts: rows });
  } catch (error) {
    console.error('Error in GET /api/user/alerts:', error);
    return NextResponse.json({ error: 'Failed to load alerts.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const symbol = typeof body.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
    const alertType = typeof body.alertType === 'string' ? body.alertType : 'TARGET_PRICE';
    const conditionLabel = typeof body.conditionLabel === 'string' ? body.conditionLabel : '';
    const thresholdValue =
      body.thresholdValue !== undefined && body.thresholdValue !== null
        ? Number(body.thresholdValue).toFixed(2)
        : null;
    const channels = Array.isArray(body.channels) ? body.channels : ['in_app'];

    if (!symbol || !conditionLabel) {
      return NextResponse.json({ error: 'Symbol and alert condition are required.' }, { status: 400 });
    }

    const created = await db
      .insert(priceAlerts)
      .values({
        userId: authCtx.dbUser.id,
        symbol,
        alertType,
        conditionLabel,
        thresholdValue,
        channels,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ alert: created[0] });
  } catch (error) {
    console.error('Error in POST /api/user/alerts:', error);
    return NextResponse.json({ error: 'Failed to create alert.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'Missing alert ID.' }, { status: 400 });
    await db
      .delete(priceAlerts)
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, authCtx.dbUser.id)));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error in DELETE /api/user/alerts:', error);
    return NextResponse.json({ error: 'Failed to delete alert.' }, { status: 500 });
  }
}
