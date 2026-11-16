import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { paperAccounts, users, watchlists } from './schema.ts';

function getOwnerEmail(): string {
  return (process.env.ADMIN_EMAIL || 'anandijain26@gmail.com').trim().toLowerCase();
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null,
  photoUrl?: string | null
) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const role = normalizedEmail === getOwnerEmail() ? 'admin' : 'user';

    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        displayName: displayName ?? null,
        photoUrl: photoUrl ?? null,
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          displayName: displayName ?? undefined,
          photoUrl: photoUrl ?? undefined,
          role,
          updatedAt: new Date(),
        },
      })
      .returning();

    const user = result[0];

    // Ensure default watchlist and paper trading account exist
    const existingWatchlists = await db
      .select()
      .from(watchlists)
      .where(eq(watchlists.userId, user.id));

    if (existingWatchlists.length === 0) {
      await db.insert(watchlists).values({
        userId: user.id,
        name: 'NIFTY Core Watchlist',
        description: 'Primary Indian large-cap tracking list',
        symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN'],
        isDefault: true,
      });
    }

    await db
      .insert(paperAccounts)
      .values({
        userId: user.id,
        accountName: 'Virtual NSE Paper Account',
        initialCapital: '100000',
        cashBalance: '100000',
        realizedPnl: '0',
      })
      .onConflictDoNothing({ target: paperAccounts.userId });

    return user;
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database error in getUserByUid:', error);
    throw new Error('Failed to retrieve user profile.', { cause: error });
  }
}
