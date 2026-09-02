export type PageEnvelope<T> = {
  data: T[];
  count: number;
  total: number | null;
  page: number;
  limit: number;
  totalPages: number | null;
  hasMore: boolean;
};

type RawPageEnvelope<T> = {
  data?: T[] | { data?: T[]; count?: number; total?: number; page?: number; limit?: number; totalPages?: number };
  count?: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
};

export function normalizePageEnvelope<T>(payload: RawPageEnvelope<T>, requestedPage: number, requestedLimit: number): PageEnvelope<T> {
  const nested = payload.data && !Array.isArray(payload.data) ? payload.data : undefined;
  const data = Array.isArray(payload.data) ? payload.data : nested?.data ?? [];
  const page = payload.page ?? nested?.page ?? requestedPage;
  const limit = payload.limit ?? nested?.limit ?? requestedLimit;
  const total = payload.total ?? nested?.total ?? null;
  const totalPages = payload.totalPages ?? nested?.totalPages ?? (total == null ? null : Math.ceil(total / Math.max(1, limit)));
  const hasMore = totalPages != null ? page < totalPages : data.length >= limit;

  return {
    data,
    count: payload.count ?? nested?.count ?? data.length,
    total,
    page,
    limit,
    totalPages,
    hasMore,
  };
}

export async function fetchAllPages<T>(
  loadPage: (page: number, limit: number) => Promise<PageEnvelope<T>>,
  options: { limit?: number; maxPages?: number; key?: (item: T) => string } = {},
): Promise<PageEnvelope<T>> {
  const limit = options.limit ?? 100;
  const maxPages = options.maxPages ?? 100;
  const collected: T[] = [];
  const seen = new Set<string>();
  let page = 1;
  let lastPage: PageEnvelope<T> | null = null;

  while (page <= maxPages) {
    const current = await loadPage(page, limit);
    lastPage = current;
    for (const item of current.data) {
      const key = options.key?.(item);
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      collected.push(item);
    }

    if (!current.hasMore || current.data.length === 0) break;
    page += 1;
  }

  return {
    data: collected,
    count: collected.length,
    total: lastPage?.total ?? collected.length,
    page: 1,
    limit,
    totalPages: lastPage?.totalPages ?? Math.max(1, Math.ceil(collected.length / Math.max(1, limit))),
    hasMore: Boolean(lastPage?.hasMore && page >= maxPages),
  };
}
