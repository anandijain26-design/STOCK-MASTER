import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/src/db/index.ts';
import { auditLogs, users } from '@/src/db/schema.ts';
import { isOwnerAdminEmail, verifyBearerAuth } from '@/src/lib/auth-server.ts';

export async function GET(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const email = authCtx.token.email ?? authCtx.dbUser.email;
  return NextResponse.json({
    user: authCtx.dbUser,
    isAdmin: isOwnerAdminEmail(email),
  });
}

export async function PATCH(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updates: Partial<{
      displayName: string;
      preferredLanguage: string;
      preferredTheme: string;
      dashboardLayout: string[];
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (typeof body.displayName === 'string') updates.displayName = body.displayName.trim();
    if (body.preferredLanguage === 'en' || body.preferredLanguage === 'hi') {
      updates.preferredLanguage = body.preferredLanguage;
    }
    if (body.preferredTheme === 'dark' || body.preferredTheme === 'light') {
      updates.preferredTheme = body.preferredTheme;
    }
    if (Array.isArray(body.dashboardLayout)) {
      updates.dashboardLayout = body.dashboardLayout.filter((x: unknown): x is string => typeof x === 'string');
    }

    const updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, authCtx.dbUser.id))
      .returning();

    await db.insert(auditLogs).values({
      userId: authCtx.dbUser.id,
      action: 'PROFILE_UPDATE',
      resource: 'users',
      details: { fields: Object.keys(updates) },
    });

    const email = authCtx.token.email ?? updated[0].email;
    return NextResponse.json({
      user: updated[0],
      isAdmin: isOwnerAdminEmail(email),
    });
  } catch (error) {
    console.error('Error in PATCH /api/user/profile:', error);
    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.delete(users).where(eq(users.id, authCtx.dbUser.id));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error in DELETE /api/user/profile:', error);
    return NextResponse.json({ error: 'Failed to delete user record.' }, { status: 500 });
  }
}
