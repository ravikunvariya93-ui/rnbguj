import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import { serverError, unauthorized } from './response';

export interface ApiSession {
  user: { id?: string; role?: string; username?: string; [k: string]: unknown };
}

export interface ApiContext {
  session: ApiSession;
  role?: string;
}

/** Route handler receiving an authenticated context (DB already connected). */
export type AuthedHandler<Args extends unknown[] = []> = (
  ctx: ApiContext,
  ...args: Args
) => Promise<Response | NextResponse>;

interface WithApiOptions {
  /** If set, only these roles may proceed (others get 401/403). */
  roles?: string[];
  /** Set false for the rare public bootstrap route; default requires login. */
  requireAuth?: boolean;
}

/**
 * Standard API wrapper: connects DB, enforces auth/roles, and converts
 * unexpected throws into a generic 500 (no stack/DB internals leaked).
 *
 * Usage:
 *   export const GET = withApi(async ({ session }) => ok(...));
 *   export const DELETE = withApi(async () => ..., { roles: ['ADMIN','SUPERVISOR'] });
 */
export function withApi<Args extends unknown[] = []>(
  handler: AuthedHandler<Args>,
  opts: WithApiOptions = {},
) {
  const { roles, requireAuth = true } = opts;
  return async (...args: Args): Promise<Response | NextResponse> => {
    try {
      await dbConnect();
      const session = (await auth()) as ApiSession | null;
      if (requireAuth && !session?.user) return unauthorized();
      const role = (session?.user as { role?: string } | undefined)?.role;
      if (roles && roles.length > 0 && (!role || !roles.includes(role))) {
        return unauthorized();
      }
      return await handler({ session: session as ApiSession, role }, ...args);
    } catch (error) {
      logger.error('API unhandled error:', error);
      return serverError();
    }
  };
}
