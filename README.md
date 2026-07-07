# useDeals — Interview Exercise

Implement a React hook, `useDeals`, that fetches deal listings through the provided mock API using [TanStack Query](https://tanstack.com/query/latest). The backend is already handled for you — focus on the hook, its options, pagination behavior, and tests.

## What is provided (do not modify)

These files simulate a GraphQL/AppSync backend. Treat them as read-only:


| File / folder       | Purpose                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `src/api.ts`        | Entry points for the three deal queries                           |
| `src/pagination.ts` | Mock server: sorting, variable page sizes, `nextToken` pagination |
| `src/types.ts`      | Shared TypeScript types                                           |
| `sample-outputs/`   | Static JSON data the mock reads from disk (1,000 deals per query) |


**Do not modify** `src/api.ts`**,** `src/pagination.ts`**, or** `sample-outputs/`**.** All pagination normalization and buffering logic belongs in `useDeals`.

## What you build

- `src/useDeals.ts` — your custom hook (you design the interface)
- `package.json`, `tsconfig.json`, and test tooling — you set these up
- Tests that cover the requirements below

Run commands from the **project root** so the mock can find `sample-outputs/`.

---



## The mock API

Three query functions in `src/api.ts` mirror real GraphQL operations:


| Listing type | API function                         | Required variables                                            |
| ------------ | ------------------------------------ | ------------------------------------------------------------- |
| Recent       | `dealsByDate`                        | `search_by_time: string` (use any value, e.g. `"2026-07-06"`) |
| Top          | `dealsByIsTopDealAndUpdatedAt`       | `isTopDeal: "true"`                                           |
| Lightning    | `dealsByIsLightningDealAndUpdatedAt` | `isLightningDeal: "true"`                                     |


Shared optional variables (see `src/types.ts`):

- `limit?: number` — maximum items per API call (default on server: `20`)
- `nextToken?: string | null` — pagination cursor from the previous response
- `sortDirection?: "ASC" | "DESC"` — server-side sort (default: `"ASC"`)



### Server-side sorting (already implemented)

Sorting happens in the mock before pagination, matching the real GraphQL schema:


| Listing type | Sort field  |
| ------------ | ----------- |
| Recent       | `createdAt` |
| Top          | `updatedAt` |
| Lightning    | `updatedAt` |


Pass `sortDirection: "DESC"` for newest-first feeds.

### Variable API page sizes (already implemented)

Like real GraphQL, `limit` is a **maximum**, not a guarantee. A call with `limit: 20` may return anywhere from 1–20 items. Your hook must account for this — especially in the stretch goals below.

Each dataset contains **1,000 unique deals**. Paginating until `nextToken` is `null` always yields 1,000 items total with no duplicates.

---



## Core requirements — `useDeals`

Design the hook's API yourself. At minimum, it must support:

### 1. Query selection

The hook must be able to fetch from any of the three listing types above, calling the correct API function for each.

### 2. Sort direction

The hook must support both `"ASC"` and `"DESC"` sort directions and pass the chosen value through to the API.

**If the sort direction or listing type changes mid-session, reset completely:** clear accumulated deals, discard any stored `nextToken`, and fetch from the beginning. Do not reuse pagination state across different sort directions or listing types.

### 3. Basic pagination

The hook must support loading additional deals beyond the initial fetch and indicate when no more data is available (`nextToken === null`).

---



## Stretch goals (implement in `useDeals` only)



### A. Exhaust the full result set

Support a mode that automatically paginates until the entire result set is loaded.

**Test expectations:**

- Returns exactly **1,000** deals
- All deal `id` values are unique
- Order matches the chosen sort direction (monotonic on the correct sort field)



### B. Consistent page sizes

Support a mode where the consumer always receives a fixed number of deals per page (e.g. 20), even when the API returns variable counts.

Example: the API might return 4 items, then 3, then 8 on successive calls. In this mode, the hook should buffer internally and present **20, 20, 20, …** to the consumer. The final page may be shorter if fewer items remain.

**Rules:**

- Do not surface raw API batch sizes to the consumer in this mode
- Each consumer-facing page should contain the target count, except possibly the last
- No duplicates, no skipped deals across pages

**Test expectations:**

- When targeting 20 deals per page, every batch except possibly the last has length 20
- Batches never look like `[14, 2, 8, …]` — they look like `[20, 20, 20, …]`
- Full exhaustion still yields 1,000 unique deals

---



## Tests

Add tests for at least:

1. **Query routing** — each listing type calls the expected API function
2. **Sort reset** — changing sort direction or listing type clears prior results and re-fetches from the start
3. **Stretch A** — exhausting the result set returns 1,000 unique, correctly ordered deals
4. **Stretch B** — consistent page sizes despite variable API responses

Use whichever test runner and React testing approach you prefer (Vitest, Jest, React Testing Library, etc.).

---



## Project structure (expected)

```
useDeals/
├── README.md
├── package.json          ← you create
├── tsconfig.json         ← you create
├── sample-outputs/       ← provided, do not modify
└── src/
    ├── api.ts            ← provided, do not modify
    ├── pagination.ts     ← provided, do not modify
    ├── types.ts          ← provided
    ├── useDeals.ts       ← you create
    └── useDeals.test.ts  ← you create (name/path up to you)
```

---



## Notes

- The API functions are **synchronous** (they read local JSON). Wrap them appropriately for React (`useEffect`, `useMemo`, etc.) or treat them as async if you prefer — either is fine as long as behavior is correct.
- If you change `sortDirection` while holding an old `nextToken`, the mock throws. Your hook should reset before that happens.
- Core requirement: working hook with listing type selection, sort direction, and basic pagination.
- Stretch goals: full exhaustion and consistent page sizes, with tests.
- Use [TanStack Query.](https://tanstack.com/query/latest)

