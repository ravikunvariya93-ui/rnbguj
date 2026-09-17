const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

export function isObjectId(id: unknown): id is string {
  return typeof id === 'string' && OBJECT_ID_RE.test(id);
}

/** Parse ?page/?limit with sane caps so callers can't trigger unbounded scans. */
export function getPagination(url: string | URL, defaults: { page?: number; limit?: number; maxLimit?: number } = {}) {
  const { page: dPage = 1, limit: dLimit = 100, maxLimit = 200 } = defaults;
  const search = typeof url === 'string' ? new URL(url).searchParams : url.searchParams;
  const rawPage = parseInt(search.get('page') || String(dPage), 10);
  const rawLimit = parseInt(search.get('limit') || String(dLimit), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(Math.min(rawPage, 10000)) : dPage;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(Math.min(rawLimit, maxLimit)) : dLimit;
  return { page, limit, skip: (page - 1) * limit };
}

const IMMUTABLE_FIELDS = new Set(['_id', 'id', 'createdAt', 'updatedAt', '__v']);

/**
 * Strip fields a client must never overwrite. Pass `extra` for per-route
 * immutable fields (e.g. `workOrderId` on bill update).
 */
export function sanitizeUpdate<T extends Record<string, unknown>>(body: T, extra: string[] = []): T {
  const out = { ...body } as Record<string, unknown>;
  for (const k of [...IMMUTABLE_FIELDS, ...extra]) delete out[k];
  return out as T;
}
