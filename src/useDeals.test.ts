import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import * as api from "./api.js";
import { useDeals } from "./useDeals.js";
import type { ListingType } from "./useDeals.js";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Test 1: Query Routing
// ---------------------------------------------------------------------------
describe("查询路由", () => {
  it("listingType='recent' 应调用 dealsByDate", async () => {
    const spy = vi.spyOn(api, "dealsByDate");
    renderHook(() => useDeals({ listingType: "recent" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ search_by_time: expect.any(String) }),
    );
  });

  it("listingType='top' 应调用 dealsByIsTopDealAndUpdatedAt", async () => {
    const spy = vi.spyOn(api, "dealsByIsTopDealAndUpdatedAt");
    renderHook(() => useDeals({ listingType: "top" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ isTopDeal: "true" }),
    );
  });

  it("listingType='lightning' 应调用 dealsByIsLightningDealAndUpdatedAt", async () => {
    const spy = vi.spyOn(api, "dealsByIsLightningDealAndUpdatedAt");
    renderHook(() => useDeals({ listingType: "lightning" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ isLightningDeal: "true" }),
    );
  });
});

// ---------------------------------------------------------------------------
// Test 2: Sort / ListingType Reset
// ---------------------------------------------------------------------------
describe("排序重置", () => {
  it("切换 sortDirection 应清空数据并重新请求", async () => {
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ sortDirection }: { sortDirection: "ASC" | "DESC" }) =>
        useDeals({ listingType: "recent", sortDirection }),
      {
        wrapper,
        initialProps: { sortDirection: "ASC" as "ASC" | "DESC" },
      },
    );

    await waitFor(() => {
      expect(result.current.deals.length).toBeGreaterThan(0);
    });

    const ascDeals = [...result.current.deals];

    rerender({ sortDirection: "DESC" });

    await waitFor(() => {
      expect(result.current.deals.length).toBeGreaterThan(0);
    });

    expect(result.current.deals[0]?.id).not.toBe(ascDeals[0]?.id);
  });

  it("切换 listingType 应清空数据并重新请求", async () => {
    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      ({ listingType }: { listingType: ListingType }) =>
        useDeals({ listingType }),
      {
        wrapper,
        initialProps: { listingType: "recent" as ListingType },
      },
    );

    await waitFor(() => {
      expect(result.current.deals.length).toBeGreaterThan(0);
    });

    const recentDeals = [...result.current.deals];

    rerender({ listingType: "top" });

    await waitFor(() => {
      expect(result.current.deals.length).toBeGreaterThan(0);
    });

    expect(result.current.deals).not.toEqual(recentDeals);
  });
});

// ---------------------------------------------------------------------------
// Test 3 (Stretch A): Exhaust Full Result Set
// ---------------------------------------------------------------------------
describe("完整加载 (Stretch A)", () => {
  it("exhaustAll 模式应加载全部 1000 条 deals (ASC)", async () => {
    const { result } = renderHook(
      () => useDeals({ listingType: "recent", exhaustAll: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isExhausted).toBe(true);
      },
      { timeout: 30000 },
    );

    expect(result.current.deals).toHaveLength(1000);

    const ids = result.current.deals.map((d) => d.id);
    expect(new Set(ids).size).toBe(1000);

    for (let i = 1; i < result.current.deals.length; i++) {
      expect(
        result.current.deals[i].createdAt >=
          result.current.deals[i - 1].createdAt,
      ).toBe(true);
    }
  });

  it("exhaustAll + DESC 应按降序排列", async () => {
    const { result } = renderHook(
      () =>
        useDeals({
          listingType: "top",
          sortDirection: "DESC",
          exhaustAll: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isExhausted).toBe(true);
      },
      { timeout: 30000 },
    );

    expect(result.current.deals).toHaveLength(1000);

    for (let i = 1; i < result.current.deals.length; i++) {
      expect(
        result.current.deals[i].updatedAt <=
          result.current.deals[i - 1].updatedAt,
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 4 (Stretch B): Consistent Page Sizes
// ---------------------------------------------------------------------------
describe("一致页面大小 (Stretch B)", () => {
  it("每次 fetchNextPage 增量应为固定 pageSize（最后页除外）", async () => {
    const TARGET_PAGE_SIZE = 20;
    const { result } = renderHook(
      () =>
        useDeals({
          listingType: "recent",
          pageSize: TARGET_PAGE_SIZE,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.deals.length).toBe(TARGET_PAGE_SIZE);
    });

    const increments: number[] = [result.current.deals.length];
    let prevLength = result.current.deals.length;

    while (result.current.hasNextPage) {
      await act(async () => {
        result.current.fetchNextPage();
      });

      await waitFor(() => {
        expect(result.current.deals.length).toBeGreaterThan(prevLength);
      });

      const increment = result.current.deals.length - prevLength;
      increments.push(increment);
      prevLength = result.current.deals.length;

      if (increments.length > 60) break;
    }

    for (let i = 0; i < increments.length - 1; i++) {
      expect(increments[i]).toBe(TARGET_PAGE_SIZE);
    }

    expect(increments[increments.length - 1]).toBeLessThanOrEqual(
      TARGET_PAGE_SIZE,
    );
    expect(increments[increments.length - 1]).toBeGreaterThan(0);
  });

  it("配合 exhaustAll 仍应返回 1000 条唯一 deals", async () => {
    const { result } = renderHook(
      () =>
        useDeals({
          listingType: "lightning",
          pageSize: 20,
          exhaustAll: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.isExhausted).toBe(true);
      },
      { timeout: 30000 },
    );

    expect(result.current.deals).toHaveLength(1000);

    const ids = result.current.deals.map((d) => d.id);
    expect(new Set(ids).size).toBe(1000);
  });
});
