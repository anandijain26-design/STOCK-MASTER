import { NextRequest, NextResponse } from 'next/server';
import { desc, sql } from 'drizzle-orm';
import { db } from '@/src/db/index.ts';
import {
  auditLogs,
  dailyReports,
  platformAnnouncements,
  stockMaster,
  users,
} from '@/src/db/schema.ts';
import { ALL_INDIAN_STOCKS, CURATED_STOCK_UNIVERSE } from '@/src/lib/nse-universe';
import { isGeminiConfigured } from '@/src/lib/gemini';
import { fetchYahooChart } from '@/src/lib/market-data';
import { verifyAdminAuth, OWNER_ADMIN_EMAIL } from '@/src/lib/auth-server.ts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const adminCheck = await verifyAdminAuth(req);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  try {
    const [userRows, reportCountRows, masterRows, logRows, announcements, feedTest] =
      await Promise.all([
        db
          .select({
            id: users.id,
            email: users.email,
            displayName: users.displayName,
            preferredLanguage: users.preferredLanguage,
            role: users.role,
            createdAt: users.createdAt,
          })
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(50),
        db.select({ count: sql<number>`count(*)` }).from(dailyReports),
        db.select({ count: sql<number>`count(*)` }).from(stockMaster),
        db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(30),
        db.select().from(platformAnnouncements).orderBy(desc(platformAnnouncements.createdAt)).limit(10),
        fetchYahooChart('^NSEI', '1D', 'NIFTY 50', 'NSE'),
      ]);

    return NextResponse.json({
      ownerEmail: OWNER_ADMIN_EMAIL,
      stats: {
        registeredUsers: userRows.length,
        dailyReportsStored: Number(reportCountRows[0]?.count ?? 0),
        stockMasterCount: Number(masterRows[0]?.count ?? 0),
        universeCount: ALL_INDIAN_STOCKS.length,
      },
      integrations: [
        {
          name: 'Cloud SQL (PostgreSQL)',
          status: 'Connected',
          detail: 'Drizzle ORM pool active in asia-southeast1',
        },
        {
          name: 'Firebase Authentication (Gmail / Google OAuth)',
          status: 'Configured',
          detail: `Owner-locked Admin (${OWNER_ADMIN_EMAIL}) + Gmail user auth`,
        },
        {
          name: 'NSE Equity Master Dataset (EQUITY_L.csv)',
          status: 'Loaded',
          detail: `${ALL_INDIAN_STOCKS.length.toLocaleString('en-IN')} active NSE symbols (${CURATED_STOCK_UNIVERSE.length} deep fundamental profiles)`,
        },
        {
          name: 'Yahoo Finance NSE/BSE Live Feed',
          status: feedTest.quote.status !== 'unavailable' ? 'Online' : 'Degraded',
          detail: feedTest.quote.price ? `NIFTY 50 = ${feedTest.quote.price}` : 'Upstream unreachable',
        },
        {
          name: 'Gemini AI Research Engine',
          status: isGeminiConfigured() ? 'Configured' : 'Missing Key',
          detail: 'Server-side @google/genai',
        },
      ],
      users: userRows,
      auditLogs: logRows,
      announcements,
    });
  } catch (error) {
    console.error('Error in GET /api/admin:', error);
    return NextResponse.json({ error: 'Failed to load admin telemetry.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAuth(req);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  try {
    const body = await req.json();

    if (body.action === 'syncMaster') {
      // Batch upsert all 2,646+ NSE stocks into PostgreSQL stock_master
      const BATCH_SIZE = 250;
      for (let i = 0; i < ALL_INDIAN_STOCKS.length; i += BATCH_SIZE) {
        const chunk = ALL_INDIAN_STOCKS.slice(i, i + BATCH_SIZE);
        await db
          .insert(stockMaster)
          .values(
            chunk.map((s) => ({
              symbol: s.symbol,
              bseCode: s.bseCode,
              isin: s.isin,
              companyName: s.companyName,
              exchange: s.exchange,
              sector: s.sector,
              industry: s.industry,
              marketCapCategory: s.marketCapCategory,
              isFno: s.isFno,
              status: 'ACTIVE',
              lastSyncedAt: new Date(),
            }))
          )
          .onConflictDoUpdate({
            target: stockMaster.symbol,
            set: {
              bseCode: sql`excluded.bse_code`,
              isin: sql`excluded.isin`,
              companyName: sql`excluded.company_name`,
              exchange: sql`excluded.exchange`,
              sector: sql`excluded.sector`,
              industry: sql`excluded.industry`,
              marketCapCategory: sql`excluded.market_cap_category`,
              isFno: sql`excluded.is_fno`,
              lastSyncedAt: new Date(),
            },
          });
      }

      await db.insert(auditLogs).values({
        userId: adminCheck.authCtx.dbUser.id,
        action: 'STOCK_MASTER_SYNC',
        resource: 'stock_master',
        details: { syncedCount: ALL_INDIAN_STOCKS.length, adminEmail: adminCheck.authCtx.dbUser.email },
      });

      return NextResponse.json({ ok: true, syncedCount: ALL_INDIAN_STOCKS.length });
    }

    if (body.action === 'createAnnouncement') {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const message = typeof body.body === 'string' ? body.body.trim() : '';
      const severity = typeof body.severity === 'string' ? body.severity : 'info';
      if (!title || !message) {
        return NextResponse.json({ error: 'Title and message required.' }, { status: 400 });
      }
      const created = await db
        .insert(platformAnnouncements)
        .values({ title, body: message, severity, isActive: true })
        .returning();

      await db.insert(auditLogs).values({
        userId: adminCheck.authCtx.dbUser.id,
        action: 'ANNOUNCEMENT_PUBLISHED',
        resource: 'platform_announcements',
        details: { title, severity },
      });

      return NextResponse.json({ announcement: created[0] });
    }

    return NextResponse.json({ error: 'Unsupported admin action.' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/admin:', error);
    return NextResponse.json({ error: 'Admin action failed.' }, { status: 500 });
  }
}
