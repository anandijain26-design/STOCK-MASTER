import { NextRequest } from 'next/server';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';

export const OWNER_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'anandijain26@gmail.com')
  .trim()
  .toLowerCase();

export function isOwnerAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === OWNER_ADMIN_EMAIL;
}

export interface AuthenticatedContext {
  token: DecodedIdToken;
  dbUser: Awaited<ReturnType<typeof getOrCreateUser>>;
}

export async function verifyBearerAuth(req: NextRequest): Promise<AuthenticatedContext | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const dbUser = await getOrCreateUser(
      decoded.uid,
      decoded.email ?? `${decoded.uid}@user.stockmastery.in`,
      decoded.name ?? null,
      decoded.picture ?? null
    );
    return { token: decoded, dbUser };
  } catch (error) {
    console.warn('Bearer token verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function verifyAdminAuth(
  req: NextRequest
): Promise<
  | { ok: true; authCtx: AuthenticatedContext }
  | { ok: false; status: 401 | 403; error: string }
> {
  const authCtx = await verifyBearerAuth(req);
  if (!authCtx) {
    return { ok: false, status: 401, error: 'Authentication required. Please sign in with your owner Gmail account.' };
  }

  const verifiedEmail = authCtx.token.email ?? authCtx.dbUser.email;
  if (!isOwnerAdminEmail(verifiedEmail)) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden: Only the platform owner account can access the Admin panel.',
    };
  }

  return { ok: true, authCtx };
}
