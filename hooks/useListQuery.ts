'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared paginated-list fetcher: abort-safe, single-flight, typed, with a
 * 30s stale-while-revalidate module cache + inflight dedup so remounts and
 * tab switches render instantly instead of refetching every time.
 */
const CACHE_TTL_MS = 30_000;
interface CacheEntry<T> {
  data: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
  time: number;
}
const listCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function useListQuery<T>(url: string | null, deps: unknown[] = []) {
  const cached = url ? (listCache.get(url) as CacheEntry<T> | undefined) : undefined;
  const fresh = cached && Date.now() - cached.time < CACHE_TTL_MS ? cached : undefined;
  const [data, setData] = useState<T[]>(fresh?.data ?? []);
  const [pagination, setPagination] = useState(
    fresh?.pagination ?? { total: 0, page: 1, limit: 100, totalPages: 0 },
  );
  // Serve stale instantly → no spinner flash on remount.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (force = false) => {
    if (!url) return;
    // Dedupe concurrent callers for the same URL.
    const existing = !force && inflight.get(url);
    if (existing) {
      try {
        const json = (await existing) as { data: T[]; pagination: CacheEntry<T>['pagination'] };
        setData(json.data);
        setPagination(json.pagination);
      } catch { /* handled by owner */ }
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    const startedLoading = data.length === 0;
    if (startedLoading) setLoading(true);
    const job = (async () => {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as { data?: T[]; pagination?: CacheEntry<T>['pagination'] };
      const out = {
        data: Array.isArray(json.data) ? json.data : [],
        pagination: json.pagination ?? { total: 0, page: 1, limit: 100, totalPages: 0 },
      };
      listCache.set(url, { ...out, time: Date.now() });
      return out;
    })();
    inflight.set(url, job);
    try {
      const out = await job;
      if (!ctrl.signal.aborted) {
        setData(out.data);
        setPagination(out.pagination);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message || 'Failed to load');
    } finally {
      inflight.delete(url);
      if (!ctrl.signal.aborted && startedLoading) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    fetchPage();
    return () => abortRef.current?.abort();
  }, [fetchPage]);

  return { data, pagination, loading, error, refetch: fetchPage };
}
