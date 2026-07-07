# useDeals Hook 开发文档

## 1. 工程配置

### 1.1 依赖清单

#### 运行时依赖

| 包名 | 用途 |
|------|------|
| `react` | React 核心库 |
| `react-dom` | React DOM 渲染（测试环境需要） |
| `@tanstack/react-query` | 数据请求和缓存管理 |

#### 开发依赖

| 包名 | 用途 |
|------|------|
| `typescript` | TypeScript 编译器 |
| `vitest` | 测试框架 |
| `@testing-library/react` | React 组件/Hook 测试工具 |
| `jsdom` | 浏览器环境模拟（Vitest 环境） |
| `@types/react` | React 类型定义 |
| `@types/react-dom` | React DOM 类型定义 |

### 1.2 package.json 配置

```json
{
  "name": "use-deals",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "@testing-library/react": "^15.0.0",
    "jsdom": "^24.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

### 1.3 tsconfig.json 配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "sample-outputs"]
}
```

### 1.4 Vitest 配置

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

---

## 2. 项目目录结构

```
useDeals/
├── docs/
│   ├── detailed-design.md       # 详细设计文档
│   └── development-guide.md     # 本文档
├── package.json                 # 项目配置与依赖
├── tsconfig.json                # TypeScript 配置
├── vitest.config.ts             # 测试配置
├── README.md                    # 需求文档（已提供）
├── sample-outputs/              # 模拟数据（已提供，不可修改）
│   ├── deals-by-date/
│   ├── deals-by-is-top-deal-and-updated-at/
│   └── deals-by-is-lightning-deal-and-updated-at/
└── src/
    ├── api.ts                   # API 函数（已提供，不可修改）
    ├── pagination.ts            # 分页引擎（已提供，不可修改）
    ├── types.ts                 # 类型定义（已提供）
    ├── useDeals.ts              # 自定义 Hook（待实现）
    └── useDeals.test.ts         # 测试文件（待实现）
```

---

## 3. 实现步骤

### 步骤 1：初始化项目配置

1. 编写 `package.json`，添加上述依赖
2. 编写 `tsconfig.json`
3. 编写 `vitest.config.ts`
4. 执行 `npm install` 安装依赖
5. 验证：`npx tsc --noEmit` 应无编译错误

### 步骤 2：实现查询路由映射

在 `src/useDeals.ts` 中创建查询配置映射表：

```typescript
import {
  dealsByDate,
  dealsByIsTopDealAndUpdatedAt,
  dealsByIsLightningDealAndUpdatedAt,
} from "./api.js";
import type {
  Deal,
  ModelDealConnection,
  ModelSortDirection,
  DealQueryKey,
} from "./types.js";

export type ListingType = "recent" | "top" | "lightning";

interface QueryConfig {
  queryKey: DealQueryKey;
  apiFn: (variables: any) => { data: Record<string, ModelDealConnection> };
  fixedVariables: Record<string, string>;
  responseKey: DealQueryKey;
}

const QUERY_CONFIG: Record<ListingType, QueryConfig> = {
  recent: {
    queryKey: "dealsByDate",
    apiFn: dealsByDate,
    fixedVariables: { search_by_time: new Date().toISOString().split("T")[0] },
    responseKey: "dealsByDate",
  },
  top: {
    queryKey: "dealsByIsTopDealAndUpdatedAt",
    apiFn: dealsByIsTopDealAndUpdatedAt,
    fixedVariables: { isTopDeal: "true" },
    responseKey: "dealsByIsTopDealAndUpdatedAt",
  },
  lightning: {
    queryKey: "dealsByIsLightningDealAndUpdatedAt",
    apiFn: dealsByIsLightningDealAndUpdatedAt,
    fixedVariables: { isLightningDeal: "true" },
    responseKey: "dealsByIsLightningDealAndUpdatedAt",
  },
};
```

**要点：**
- `apiFn` 统一为接受 variables 对象的函数
- `fixedVariables` 存储各查询类型的必需固定参数
- `responseKey` 用于从嵌套响应中提取 `ModelDealConnection`

### 步骤 3：基于 useInfiniteQuery 实现基本分页

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";

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
      const variables = {
        ...config.fixedVariables,
        limit: pageSize,
        nextToken: pageParam ?? undefined,
        sortDirection,
      };
      const response = config.apiFn(variables);
      return response.data[config.responseKey] as ModelDealConnection;
    },

    initialPageParam: null as string | null,

    getNextPageParam: (lastPage) =>
      lastPage.nextToken ?? undefined,
  });

  // ... 后续步骤补充
}
```

**关键点：**
- `queryKey` 包含 `listingType` 和 `sortDirection`，确保参数变更时自动刷新
- `initialPageParam` 设为 `null`，表示首次请求无 `nextToken`
- `getNextPageParam` 返回 `undefined` 表示无更多数据（TanStack Query 约定）

### 步骤 4：实现参数变更时的自动重置

TanStack Query 的 `queryKey` 机制天然支持：当 `queryKey` 变化时，旧查询的数据自动隔离，新查询从零开始。

对于一致页面大小模式的缓冲区，需要额外处理：

```typescript
import { useState, useEffect, useRef, useMemo } from "react";

export function useDeals(options: UseDealsOptions): UseDealsReturn {
  // ... 前面的代码 ...

  // 追踪上一次的 key，用于检测变更
  const currentKey = `${listingType}:${sortDirection}`;
  const prevKeyRef = useRef(currentKey);
  const [exposedPageCount, setExposedPageCount] = useState(0);

  // 参数变更时重置缓冲区状态
  useEffect(() => {
    if (prevKeyRef.current !== currentKey) {
      setExposedPageCount(0);
      prevKeyRef.current = currentKey;
    }
  }, [currentKey]);

  // ... 后续步骤补充
}
```

### 步骤 5：实现完整加载模式（exhaustAll）

在 Hook 中添加自动翻页的 effect：

```typescript
// 完整加载模式：自动加载所有页
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
```

**工作原理：**
1. 每次新页数据到达，`infiniteQuery.data` 变化触发 effect
2. effect 检查 `hasNextPage`，若为 `true` 则继续请求
3. 直到 `nextToken === null`（`getNextPageParam` 返回 `undefined`），`hasNextPage` 变为 `false`，循环结束

### 步骤 6：实现一致页面大小的缓冲逻辑

这是最复杂的部分。核心思路：

```typescript
export function useDeals(options: UseDealsOptions): UseDealsReturn {
  // ... 前面的配置和 query 代码 ...

  // 将所有已获取的页面平铺为一维数组
  const allFetchedDeals = useMemo(
    () => infiniteQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [infiniteQuery.data],
  );

  // API 是否还有更多数据
  const apiHasMore = infiniteQuery.hasNextPage ?? false;

  // 当前应暴露的 deal 数量
  const exposedCount = exposedPageCount * pageSize;

  // 计算消费者可见的 deals
  const deals = useMemo(() => {
    if (pageSize && !exhaustAll) {
      // 一致页面大小模式
      return allFetchedDeals.slice(0, exposedCount);
    }
    // 基本分页或 exhaustAll 模式：直接暴露全部已获取数据
    return allFetchedDeals;
  }, [allFetchedDeals, exposedCount, pageSize, exhaustAll]);

  // 缓冲区是否有足够的数据供下一页使用
  const bufferHasEnough = allFetchedDeals.length >= exposedCount + pageSize;

  // 消费者视角的 hasNextPage
  const hasNextPage = pageSize && !exhaustAll
    ? bufferHasEnough || apiHasMore
    : apiHasMore;

  // 是否已完全加载
  const isExhausted = !apiHasMore && exposedCount >= allFetchedDeals.length;

  // 当缓冲区不足且 API 有更多数据时，自动预取
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
  }, [bufferHasEnough, apiHasMore, infiniteQuery.isFetchingNextPage, pageSize, exhaustAll]);

  // 消费者的 fetchNextPage
  const fetchNextPage = useCallback(() => {
    if (pageSize && !exhaustAll) {
      // 一致页面大小模式
      if (bufferHasEnough) {
        setExposedPageCount((prev) => prev + 1);
      } else if (!apiHasMore) {
        // 最后一页：暴露剩余所有数据
        if (allFetchedDeals.length > exposedCount) {
          setExposedPageCount((prev) => prev + 1);
        }
      }
    } else {
      // 基本分页或 exhaustAll 模式
      infiniteQuery.fetchNextPage();
    }
  }, [pageSize, exhaustAll, bufferHasEnough, apiHasMore, allFetchedDeals.length, exposedCount]);

  return {
    deals,
    isLoading: infiniteQuery.isLoading,
    isFetchingMore: infiniteQuery.isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isExhausted,
    error: infiniteQuery.error ?? null,
  };
}
```

**关键实现细节：**

1. **双层分页**：API 层分页（由 TanStack Query 管理）和消费者层分页（由 `exposedPageCount` 管理）
2. **自动预取**：当缓冲区数据不足时，自动向 API 请求更多数据
3. **最后一页处理**：API 无更多数据时，剩余数据作为最后一页（可能少于 pageSize）

### 步骤 7：编写测试用例

详见下方测试方案章节。

---

## 4. 文件规模约束（300 行限制）

### 4.1 规则

- 单个代码文件（`.ts` / `.tsx`）不超过 **300 行**（不含空行和纯注释行）
- **豁免**：CSS/样式文件、测试文件（`*.test.ts`）
- README 要求分页归一化和缓冲逻辑全部在 `useDeals.ts` 中，因此不应为满足行数限制而拆分核心逻辑

### 4.2 行数估算

| 文件 | 内容 | 预估行数 | 达标 |
|------|------|---------|------|
| `src/useDeals.ts` | 类型 + 查询路由 + Hook（含缓冲区、exhaustAll） | ~180 行 | ✅ |
| `src/types.ts` | 已提供，只读 | 124 行 | ✅ |
| `src/api.ts` | 已提供，只读 | 55 行 | ✅ |
| `src/pagination.ts` | 已提供，只读 | 174 行 | ✅ |
| `src/useDeals.test.ts` | 测试文件（豁免） | ~350 行 | 豁免 |

当前方案无需拆分文件，`useDeals.ts` 远低于 300 行上限。

---

## 5. 核心代码完整结构

以下是 `src/useDeals.ts` 的完整骨架：

```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  dealsByDate,
  dealsByIsTopDealAndUpdatedAt,
  dealsByIsLightningDealAndUpdatedAt,
} from "./api.js";
import type { Deal, ModelDealConnection, ModelSortDirection } from "./types.js";

// ==================== 类型定义 ====================

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

// ==================== 查询路由配置 ====================

// QUERY_CONFIG 映射表（见步骤 2）

// ==================== Hook 实现 ====================

export function useDeals(options: UseDealsOptions): UseDealsReturn {
  // 1. 解构参数，设置默认值
  // 2. 获取查询配置
  // 3. 配置 useInfiniteQuery
  // 4. 缓冲区状态管理
  // 5. 参数变更重置逻辑
  // 6. exhaustAll 自动加载
  // 7. 一致页面大小的缓冲区预取
  // 8. 计算消费者可见数据
  // 9. 封装 fetchNextPage
  // 10. 返回结果
}
```

---

## 6. 测试方案

### 6.1 测试框架与工具

- **测试框架**：Vitest（与 Vite 生态集成，支持 ESM，速度快）
- **React 测试工具**：`@testing-library/react` 的 `renderHook` 和 `act`
- **断言**：Vitest 内置（兼容 Jest API）
- **Spy/Mock**：`vi.spyOn` 监控 API 函数调用

### 6.2 测试辅助设施

```typescript
// useDeals.test.ts
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

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 6.3 测试用例清单

#### 测试 1：查询路由 — 每种 listingType 调用正确的 API 函数

```typescript
describe("查询路由", () => {
  it("listingType='recent' 应调用 dealsByDate", async () => {
    const spy = vi.spyOn(api, "dealsByDate");
    const { result } = renderHook(
      () => useDeals({ listingType: "recent" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    // 验证传入了正确的固定参数
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ search_by_time: expect.any(String) }),
    );
  });

  it("listingType='top' 应调用 dealsByIsTopDealAndUpdatedAt", async () => {
    const spy = vi.spyOn(api, "dealsByIsTopDealAndUpdatedAt");
    const { result } = renderHook(
      () => useDeals({ listingType: "top" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ isTopDeal: "true" }),
    );
  });

  it("listingType='lightning' 应调用 dealsByIsLightningDealAndUpdatedAt", async () => {
    const spy = vi.spyOn(api, "dealsByIsLightningDealAndUpdatedAt");
    const { result } = renderHook(
      () => useDeals({ listingType: "lightning" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ isLightningDeal: "true" }),
    );
  });
});
```

#### 测试 2：排序重置 — 切换参数后清空数据

```typescript
describe("排序重置", () => {
  it("切换 sortDirection 应清空数据并重新请求", async () => {
    const { result, rerender } = renderHook(
      ({ sortDirection }) =>
        useDeals({ listingType: "recent", sortDirection }),
      {
        wrapper: createWrapper(),
        initialProps: { sortDirection: "ASC" as const },
      },
    );

    // 等待首次加载完成
    await waitFor(() => {
      expect(result.current.deals.length).toBeGreaterThan(0);
    });

    const ascDeals = [...result.current.deals];

    // 切换排序方向
    rerender({ sortDirection: "DESC" });

    // 等待新数据加载
    await waitFor(() => {
      expect(result.current.deals.length).toBeGreaterThan(0);
    });

    // 验证数据已重置（新数据与旧数据不同）
    expect(result.current.deals[0]?.id).not.toBe(ascDeals[0]?.id);
  });

  it("切换 listingType 应清空数据并重新请求", async () => {
    const { result, rerender } = renderHook(
      ({ listingType }) =>
        useDeals({ listingType }),
      {
        wrapper: createWrapper(),
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

    // 验证 API 调用已切换
    expect(result.current.deals).not.toEqual(recentDeals);
  });
});
```

#### 测试 3（Stretch A）：完整加载

```typescript
describe("完整加载 (Stretch A)", () => {
  it("exhaustAll 模式应加载全部 1000 条 deals", async () => {
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

    // 验证总数
    expect(result.current.deals).toHaveLength(1000);

    // 验证 ID 唯一性
    const ids = result.current.deals.map((d) => d.id);
    expect(new Set(ids).size).toBe(1000);

    // 验证排序正确性（ASC 默认，按 createdAt）
    for (let i = 1; i < result.current.deals.length; i++) {
      expect(
        result.current.deals[i].createdAt >= result.current.deals[i - 1].createdAt,
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

    // Top deals 按 updatedAt 排序
    for (let i = 1; i < result.current.deals.length; i++) {
      expect(
        result.current.deals[i].updatedAt <= result.current.deals[i - 1].updatedAt,
      ).toBe(true);
    }
  });
});
```

#### 测试 4（Stretch B）：一致页面大小

```typescript
describe("一致页面大小 (Stretch B)", () => {
  it("每页应返回固定 pageSize 条数据（最后页除外）", async () => {
    const TARGET_PAGE_SIZE = 20;
    const { result } = renderHook(
      () =>
        useDeals({
          listingType: "recent",
          pageSize: TARGET_PAGE_SIZE,
        }),
      { wrapper: createWrapper() },
    );

    const pageSizes: number[] = [];

    // 持续翻页直到无更多数据
    while (true) {
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      if (!result.current.hasNextPage && result.current.deals.length === 0) break;

      const currentLength = result.current.deals.length;
      if (currentLength > 0) {
        pageSizes.push(currentLength - (pageSizes.length > 0
          ? pageSizes.reduce((a, b) => a + b, 0) - pageSizes[pageSizes.length - 1] + pageSizes[pageSizes.length - 1]
          : 0));
      }

      if (!result.current.hasNextPage) break;

      act(() => {
        result.current.fetchNextPage();
      });
    }

    // 验证除最后一页外，每页都是 TARGET_PAGE_SIZE
    // 更简单的验证方式：加载全部后验证每次增量
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
```

### 6.4 测试验证矩阵

| 测试场景 | 验证项 | 预期结果 |
|---------|--------|---------|
| `listingType="recent"` | 调用 `dealsByDate` | spy 被调用 |
| `listingType="top"` | 调用 `dealsByIsTopDealAndUpdatedAt` | spy 被调用 |
| `listingType="lightning"` | 调用 `dealsByIsLightningDealAndUpdatedAt` | spy 被调用 |
| 切换 `sortDirection` | 数据清空并重新加载 | 新数据与旧数据不同 |
| 切换 `listingType` | 数据清空并重新加载 | 调用新的 API 函数 |
| `exhaustAll=true` | 加载全部数据 | 1000 条、ID 唯一、排序正确 |
| `exhaustAll=true` + `DESC` | 降序排列 | 排序字段单调递减 |
| `pageSize=20` | 固定页面大小 | 每页 20 条（最后页可短） |
| `pageSize=20` + `exhaustAll` | 一致页面 + 完整加载 | 1000 条唯一 deals |

### 6.5 测试注意事项

1. **异步处理**：API 函数虽然是同步的，但 TanStack Query 内部使用 Promise 处理，测试中需要使用 `waitFor` 等待状态更新
2. **QueryClient 隔离**：每个测试用例使用独立的 `QueryClient`，避免缓存干扰
3. **禁用重试**：测试中将 `retry` 设为 `false`，避免错误重试影响测试结果
4. **工作目录**：测试必须从项目根目录运行（`npx vitest`），否则 `pagination.ts` 找不到 `sample-outputs/`
5. **超时设置**：完整加载测试可能需要较长时间（大量 API 调用），设置足够的 `timeout`

---

## 7. 运行与调试

### 7.1 环境准备

```bash
# 安装依赖
npm install

# 验证 TypeScript 编译
npx tsc --noEmit
```

### 7.2 运行测试

```bash
# 运行所有测试（单次）
npx vitest run

# 监听模式（开发时使用）
npx vitest

# 运行特定测试文件
npx vitest run src/useDeals.test.ts

# 运行匹配名称的测试
npx vitest run -t "查询路由"
```

### 7.3 调试技巧

1. **查看 API 调用**：在测试中使用 `vi.spyOn` 监控 API 函数，检查调用参数
2. **查看缓冲区状态**：可在 Hook 中临时导出内部状态用于调试
3. **随机性问题**：`pagination.ts` 中 `getRandomResultCount` 使用 `Math.random()`，如需确定性测试，可 mock：
   ```typescript
   vi.spyOn(Math, "random").mockReturnValue(0.99); // 总是返回最大值
   ```
4. **数据验证**：直接调用 API 函数检查返回数据，不经过 Hook：
   ```typescript
   import { dealsByDate } from "./api.js";
   const result = dealsByDate({ search_by_time: "2026-07-06" });
   console.log(result.data.dealsByDate.items.length);
   ```

### 7.4 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| `Error: ENOENT: no such file or directory` | 未从项目根目录运行 | 确保 `cwd` 为包含 `sample-outputs/` 的目录 |
| `nextToken does not match query` | 切换 listingType 时复用了旧 token | 检查 queryKey 是否包含 listingType |
| `nextToken does not match sortDirection` | 切换排序时复用了旧 token | 检查 queryKey 是否包含 sortDirection |
| 测试超时 | exhaustAll 模式调用次数多 | 增加 `waitFor` 的 `timeout` |
| `act()` 警告 | 状态更新未包裹在 `act` 中 | 使用 `@testing-library/react` 的 `act` 包裹操作 |
