export type PaginatedAdminPage<T> = {
  data: T[];
  page: number;
  limit: number;
  total?: number | null;
  totalPages?: number | null;
  hasMore?: boolean;
};

export function mergeAdminPages<T>(
  pages: readonly PaginatedAdminPage<T>[],
  key: (item: T) => string,
) {
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const page of pages) {
    for (const item of page.data) {
      const itemKey = key(item);
      if (seen.has(itemKey)) continue;
      seen.add(itemKey);
      merged.push(item);
    }
  }
  return merged;
}

export function nextAdminPage<T>(page: PaginatedAdminPage<T>) {
  if (page.totalPages != null) {
    return page.page < page.totalPages ? page.page + 1 : undefined;
  }
  if (page.hasMore ?? page.data.length >= page.limit) return page.page + 1;
  return undefined;
}
