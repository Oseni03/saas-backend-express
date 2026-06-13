export interface PagedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function buildPagedResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number
): PagedResponse<T> {
  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  };
}

export interface PaginationQuery {
  limit: number;
  offset: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationQuery {
  const limit = Math.min(Number(query.limit) || 20, 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}
