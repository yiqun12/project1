import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Deal, DealQueryKey, ModelDealConnection, ModelSortDirection } from "./types.js";
import { DEFAULT_SORT_DIRECTION } from "./types.js";

const SAMPLE_OUTPUTS_DIR = join(process.cwd(), "sample-outputs");
const PAGE_COUNT = 50;
const DEFAULT_LIMIT = 20;

const DATASET_FOLDER_BY_QUERY_KEY: Record<DealQueryKey, string> = {
  dealsByDate: "deals-by-date",
  dealsByIsTopDealAndUpdatedAt: "deals-by-is-top-deal-and-updated-at",
  dealsByIsLightningDealAndUpdatedAt: "deals-by-is-lightning-deal-and-updated-at",
};

/** Matches each GSI sort key from the GraphQL schema. */
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

const datasetCache = new Map<DealQueryKey, Deal[]>();
const sortedDatasetCache = new Map<string, Deal[]>();

function loadDataset(queryKey: DealQueryKey): Deal[] {
  const cached = datasetCache.get(queryKey);
  if (cached) {
    return cached;
  }

  const folder = join(SAMPLE_OUTPUTS_DIR, DATASET_FOLDER_BY_QUERY_KEY[queryKey]);
  const items: Deal[] = [];

  for (let page = 1; page <= PAGE_COUNT; page += 1) {
    const filename = `page-${String(page).padStart(2, "0")}.json`;
    const raw = readFileSync(join(folder, filename), "utf8");
    const parsed = JSON.parse(raw) as {
      data: Record<DealQueryKey, { items: Deal[] }>;
    };

    items.push(...parsed.data[queryKey].items);
  }

  datasetCache.set(queryKey, items);
  return items;
}

function sortDeals(
  items: Deal[],
  sortField: "createdAt" | "updatedAt",
  sortDirection: ModelSortDirection
): Deal[] {
  const directionMultiplier = sortDirection === "ASC" ? 1 : -1;

  return [...items].sort((left, right) => {
    const comparison = left[sortField].localeCompare(right[sortField]);
    return comparison * directionMultiplier;
  });
}

function getSortedDataset(
  queryKey: DealQueryKey,
  sortDirection: ModelSortDirection
): Deal[] {
  const cacheKey = `${queryKey}:${sortDirection}`;
  const cached = sortedDatasetCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const sortField = SORT_FIELD_BY_QUERY_KEY[queryKey];
  const sortedItems = sortDeals(loadDataset(queryKey), sortField, sortDirection);

  sortedDatasetCache.set(cacheKey, sortedItems);
  return sortedItems;
}

function decodeToken(token: string): PaginationToken {
  const payload = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as PaginationToken;

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
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

/**
 * GraphQL limits are a maximum, not a guarantee. When data remains, return a
 * random count between 1 and the effective page size.
 */
export function getRandomResultCount(limit: number, remaining: number): number {
  const max = Math.min(limit, remaining);

  if (max <= 0) {
    return 0;
  }

  return Math.floor(Math.random() * max) + 1;
}

export function paginateDeals(
  queryKey: DealQueryKey,
  options: {
    limit?: number;
    nextToken?: string | null;
    sortDirection?: ModelSortDirection;
  } = {}
): ModelDealConnection {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const sortDirection = options.sortDirection ?? DEFAULT_SORT_DIRECTION;

  if (limit <= 0) {
    throw new Error("limit must be greater than 0");
  }

  const allItems = getSortedDataset(queryKey, sortDirection);
  const token = options.nextToken ? decodeToken(options.nextToken) : null;

  if (token) {
    if (token.queryKey !== queryKey) {
      throw new Error("nextToken does not match query");
    }

    if (token.sortDirection !== sortDirection) {
      throw new Error("nextToken does not match sortDirection");
    }
  }

  const offset = token?.offset ?? 0;

  if (offset > allItems.length) {
    throw new Error("nextToken offset is out of range");
  }

  const remaining = allItems.length - offset;
  const count = getRandomResultCount(limit, remaining);
  const items = allItems.slice(offset, offset + count);
  const nextOffset = offset + count;
  const nextToken =
    nextOffset < allItems.length
      ? encodeToken({ queryKey, offset: nextOffset, sortDirection })
      : null;

  return {
    items,
    nextToken,
    startedAt: null,
    __typename: "ModelDealConnection",
  };
}

export function clearDatasetCache(): void {
  datasetCache.clear();
  sortedDatasetCache.clear();
}
