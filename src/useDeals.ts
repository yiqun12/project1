import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as api from "./api.js";
import type {
  Deal,
  DealQueryKey,
  ModelDealConnection,
  ModelSortDirection,
} from "./types.js";

export type ListingType = "recent" | "top" | "lightning";

export interface UseDealsOptions {
  listingType: ListingType;
  sortDirection?: ModelSortDirection;
  pageSize?: number;
  exhaustAll?: boolean;
}

export interface UseDealsReturn {
  deals: Deal[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isExhausted: boolean;
  error: Error | null;
}

type ApiFnName =
  | "dealsByDate"
  | "dealsByIsTopDealAndUpdatedAt"
  | "dealsByIsLightningDealAndUpdatedAt";

interface QueryConfig {
  apiFnName: ApiFnName;
  fixedVariables: Record<string, string>;
  responseKey: DealQueryKey;
}

const QUERY_CONFIG: Record<ListingType, QueryConfig> = {
  recent: {
    apiFnName: "dealsByDate",
    fixedVariables: { search_by_time: new Date().toISOString().split("T")[0] },
    responseKey: "dealsByDate",
  },
  top: {
    apiFnName: "dealsByIsTopDealAndUpdatedAt",
    fixedVariables: { isTopDeal: "true" },
    responseKey: "dealsByIsTopDealAndUpdatedAt",
  },
  lightning: {
    apiFnName: "dealsByIsLightningDealAndUpdatedAt",
    fixedVariables: { isLightningDeal: "true" },
    responseKey: "dealsByIsLightningDealAndUpdatedAt",
  },
};

export function useDeals(options: UseDealsOptions): UseDealsReturn {
  const {
    listingType,
    sortDirection = "ASC",
    pageSize = 20,
    exhaustAll = false,
  } = options;

  const config = QUERY_CONFIG[listingType];

  const infiniteQuery = useInfiniteQuery({
    queryKey: ["deals", listingType, sortDirection] as const,
    queryFn: ({ pageParam }) => {
      const apiFn = api[config.apiFnName] as (
        v: any,
      ) => { data: Record<string, ModelDealConnection> };
      const variables = {
        ...config.fixedVariables,
        limit: pageSize,
        nextToken: pageParam ?? undefined,
        sortDirection,
      };
      return apiFn(variables).data[config.responseKey] as ModelDealConnection;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextToken ?? undefined,
  });

  const currentKey = `${listingType}:${sortDirection}`;
  const prevKeyRef = useRef(currentKey);
  const [exposedPageCount, setExposedPageCount] = useState(1);
  const [pendingIncrement, setPendingIncrement] = useState(false);

  useEffect(() => {
    if (prevKeyRef.current !== currentKey) {
      setExposedPageCount(1);
      setPendingIncrement(false);
      prevKeyRef.current = currentKey;
    }
  }, [currentKey]);

  const allFetchedDeals = useMemo(
    () => infiniteQuery.data?.pages.flatMap((p) => p.items ?? []) ?? [],
    [infiniteQuery.data],
  );

  const apiHasMore = infiniteQuery.hasNextPage ?? false;
  const exposedCount = exposedPageCount * pageSize;
  const bufferHasEnough = allFetchedDeals.length >= exposedCount + pageSize;

  useEffect(() => {
    if (
      exhaustAll &&
      infiniteQuery.hasNextPage &&
      !infiniteQuery.isFetchingNextPage &&
      !infiniteQuery.isError
    ) {
      infiniteQuery.fetchNextPage();
    }
  }, [
    exhaustAll,
    infiniteQuery.hasNextPage,
    infiniteQuery.isFetchingNextPage,
    infiniteQuery.isError,
    infiniteQuery.data,
  ]);

  useEffect(() => {
    if (
      pageSize &&
      !exhaustAll &&
      !bufferHasEnough &&
      apiHasMore &&
      !infiniteQuery.isFetchingNextPage
    ) {
      infiniteQuery.fetchNextPage();
    }
  }, [
    bufferHasEnough,
    apiHasMore,
    infiniteQuery.isFetchingNextPage,
    pageSize,
    exhaustAll,
    allFetchedDeals.length,
  ]);

  useEffect(() => {
    if (pendingIncrement && bufferHasEnough) {
      setPendingIncrement(false);
      setExposedPageCount((prev) => prev + 1);
    }
  }, [pendingIncrement, bufferHasEnough]);

  const deals = useMemo(() => {
    if (pageSize && !exhaustAll) {
      return allFetchedDeals.slice(0, exposedCount);
    }
    return allFetchedDeals;
  }, [allFetchedDeals, exposedCount, pageSize, exhaustAll]);

  const consumerHasNextPage =
    pageSize && !exhaustAll
      ? bufferHasEnough ||
        apiHasMore ||
        pendingIncrement ||
        allFetchedDeals.length > exposedCount
      : apiHasMore;

  const dataLoaded = infiniteQuery.data !== undefined;
  const isExhausted =
    dataLoaded && !apiHasMore && !infiniteQuery.isFetchingNextPage;

  const fetchNextPage = useCallback(() => {
    if (pageSize && !exhaustAll) {
      if (bufferHasEnough) {
        setExposedPageCount((prev) => prev + 1);
      } else if (!apiHasMore) {
        if (allFetchedDeals.length > exposedCount) {
          setExposedPageCount((prev) => prev + 1);
        }
      } else {
        setPendingIncrement(true);
      }
    } else {
      infiniteQuery.fetchNextPage();
    }
  }, [
    pageSize,
    exhaustAll,
    bufferHasEnough,
    apiHasMore,
    allFetchedDeals.length,
    exposedCount,
  ]);

  return {
    deals,
    isLoading: infiniteQuery.isLoading,
    isFetchingMore: infiniteQuery.isFetchingNextPage,
    hasNextPage: consumerHasNextPage,
    fetchNextPage,
    isExhausted,
    error: infiniteQuery.error ?? null,
  };
}
