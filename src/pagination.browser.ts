import type { Deal, DealQueryKey, ModelDealConnection, ModelSortDirection } from "./types.js";
import { DEFAULT_SORT_DIRECTION } from "./types.js";

const PAGE_COUNT = 50;
const DEFAULT_LIMIT = 20;

const DATASET_FOLDER_BY_QUERY_KEY: Record<DealQueryKey, string> = {
  dealsByDate: "deals-by-date",
  dealsByIsTopDealAndUpdatedAt: "deals-by-is-top-deal-and-updated-at",
  dealsByIsLightningDealAndUpdatedAt: "deals-by-is-lightning-deal-and-updated-at",
};

const SORT_FIELD_BY_QUERY_KEY: Record<DealQueryKey, "createdAt" | "updatedAt"> = {
  dealsByDate: "createdAt",
  dealsByIsTopDealAndUpdatedAt: "updatedAt",
  dealsByIsLightningDealAndUpdatedAt: "updatedAt",
};

interface PaginationToken {
  queryKey: DealQueryKey;
  offset: number;
  sortDirection: ModelSortDirection;
}

const allJsonModules = import.meta.glob<{
  data: Record<DealQueryKey, { items: Deal[] }>;
}>("/sample-outputs/**/*.json", { import: "default", eager: true });

console.log("[pagination.browser] glob loaded", Object.keys(allJsonModules).length, "files");

const datasetCache = new Map<DealQueryKey, Deal[]>();
const sortedDatasetCache = new Map<string, Deal[]>();

function loadDataset(queryKey: DealQueryKey): Deal[] {
  const cached = datasetCache.get(queryKey);
  if (cached) return cached;

  const folder = DATASET_FOLDER_BY_QUERY_KEY[queryKey];
  const items: Deal[] = [];

  for (let page = 1; page <= PAGE_COUNT; page++) {
    const filename = `page-${String(page).padStart(2, "0")}.json`;
    const key = `/sample-outputs/${folder}/${filename}`;
    const mod = allJsonModules[key];
    if (mod) {
      items.push(...(mod as any).data[queryKey].items);
    }
  }

  datasetCache.set(queryKey, items);
  return items;
}

function sortDeals(
  items: Deal[],
  sortField: "createdAt" | "updatedAt",
  sortDirection: ModelSortDirection,
): Deal[] {
  const mult = sortDirection === "ASC" ? 1 : -1;
  return [...items].sort(
    (a, b) => a[sortField].localeCompare(b[sortField]) * mult,
  );
}

function getSortedDataset(queryKey: DealQueryKey, sortDirection: ModelSortDirection): Deal[] {
  const cacheKey = `${queryKey}:${sortDirection}`;
  const cached = sortedDatasetCache.get(cacheKey);
  if (cached) return cached;

  const sorted = sortDeals(
    loadDataset(queryKey),
    SORT_FIELD_BY_QUERY_KEY[queryKey],
    sortDirection,
  );
  sortedDatasetCache.set(cacheKey, sorted);
  return sorted;
}

function decodeToken(token: string): PaginationToken {
  const json = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
  const payload = JSON.parse(json) as PaginationToken;
  if (
    typeof payload.queryKey !== "string" ||
    typeof payload.offset !== "number" ||
    payload.offset < 0 ||
    (payload.sortDirection !== "ASC" && payload.sortDirection !== "DESC")
  ) {
    throw new Error("Invalid nextToken");
  }
  return payload;
}

function encodeToken(payload: PaginationToken): string {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function getRandomResultCount(limit: number, remaining: number): number {
  const max = Math.min(limit, remaining);
  if (max <= 0) return 0;
  return Math.floor(Math.random() * max) + 1;
}

export function paginateDeals(
  queryKey: DealQueryKey,
  options: {
    limit?: number;
    nextToken?: string | null;
    sortDirection?: ModelSortDirection;
  } = {},
): ModelDealConnection {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const sortDirection = options.sortDirection ?? DEFAULT_SORT_DIRECTION;

  if (limit <= 0) throw new Error("limit must be greater than 0");

  const allItems = getSortedDataset(queryKey, sortDirection);
  const token = options.nextToken ? decodeToken(options.nextToken) : null;

  if (token) {
    if (token.queryKey !== queryKey) throw new Error("nextToken does not match query");
    if (token.sortDirection !== sortDirection) throw new Error("nextToken does not match sortDirection");
  }

  const offset = token?.offset ?? 0;
  if (offset > allItems.length) throw new Error("nextToken offset is out of range");

  const remaining = allItems.length - offset;
  const count = getRandomResultCount(limit, remaining);
  const items = allItems.slice(offset, offset + count);
  const nextOffset = offset + count;
  const nextToken =
    nextOffset < allItems.length
      ? encodeToken({ queryKey, offset: nextOffset, sortDirection })
      : null;

  return { items, nextToken, startedAt: null, __typename: "ModelDealConnection" };
}
