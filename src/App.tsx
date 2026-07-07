import React, { useState } from "react";
import { useDeals, type ListingType } from "./useDeals.js";
import type { ModelSortDirection, Deal } from "./types.js";

const LISTING_OPTIONS: { value: ListingType; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "top", label: "Top Deals" },
  { value: "lightning", label: "Lightning" },
];

function DealCard({ deal }: { deal: Deal }) {
  const discount = deal.prev_price > 0
    ? Math.round(((deal.prev_price - deal.price) / deal.prev_price) * 100)
    : 0;

  return (
    <div style={styles.card}>
      <div style={{
        ...styles.cardImg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        color: "#999",
        textAlign: "center" as const,
      }}>
        {deal.forum_type?.charAt(0) || "D"}
      </div>
      <div style={styles.cardBody}>
        <h3 style={styles.cardTitle}>{deal.title}</h3>
        <div style={styles.priceRow}>
          <span style={styles.price}>${deal.price.toFixed(2)}</span>
          {deal.prev_price > deal.price && (
            <span style={styles.prevPrice}>${deal.prev_price.toFixed(2)}</span>
          )}
          {discount > 0 && (
            <span style={styles.discount}>-{discount}%</span>
          )}
        </div>
        <div style={styles.meta}>
          <span>{deal.forum_type}</span>
          <span style={{ margin: "0 8px" }}>|</span>
          <span>{deal.dealer_type}</span>
          {deal.has_coupon && deal.coupon && (
            <span style={styles.couponBadge}>Coupon: {deal.coupon}</span>
          )}
          {deal.has_promotional_code && deal.promotional_code && (
            <span style={styles.promoBadge}>Code: {deal.promotional_code}</span>
          )}
        </div>
        <div style={styles.votes}>
          <span>👍 {deal.vote}</span>
          <span style={{ marginLeft: 12 }}>👎 {deal.down_vote}</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [listingType, setListingType] = useState<ListingType>("recent");
  const [sortDirection, setSortDirection] = useState<ModelSortDirection>("ASC");
  const [exhaustAll, setExhaustAll] = useState(false);
  const [pageSize, setPageSize] = useState(20);

  const {
    deals,
    isLoading,
    isFetchingMore,
    hasNextPage,
    fetchNextPage,
    isExhausted,
    error,
  } = useDeals({ listingType, sortDirection, pageSize, exhaustAll });

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>useDeals Demo</h1>
        <p style={styles.subtitle}>
          TanStack Query + 分页 + 缓冲区一致页面
        </p>
      </header>

      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>Listing Type</label>
          <div style={styles.btnGroup}>
            {LISTING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setListingType(opt.value)}
                style={{
                  ...styles.btn,
                  ...(listingType === opt.value ? styles.btnActive : {}),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label}>Sort Direction</label>
          <div style={styles.btnGroup}>
            {(["ASC", "DESC"] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setSortDirection(dir)}
                style={{
                  ...styles.btn,
                  ...(sortDirection === dir ? styles.btnActive : {}),
                }}
              >
                {dir === "ASC" ? "↑ ASC" : "↓ DESC"}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.label}>Page Size</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={styles.select}
          >
            {[10, 20, 50].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={styles.controlGroup}>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={exhaustAll}
              onChange={(e) => setExhaustAll(e.target.checked)}
            />
            <span style={{ marginLeft: 6 }}>Exhaust All (load 1000)</span>
          </label>
        </div>
      </div>

      <div style={styles.statusBar}>
        <span>
          Loaded: <strong>{deals.length}</strong> deals
        </span>
        {isLoading && <span style={styles.badge}>Loading...</span>}
        {isFetchingMore && <span style={styles.badgeBlue}>Fetching more...</span>}
        {isExhausted && <span style={styles.badgeGreen}>All loaded</span>}
        {error && <span style={styles.badgeRed}>Error: {error.message}</span>}
      </div>

      <div style={styles.dealList}>
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>

      {!isLoading && hasNextPage && !exhaustAll && (
        <div style={styles.loadMoreWrap}>
          <button
            onClick={fetchNextPage}
            disabled={isFetchingMore}
            style={styles.loadMoreBtn}
          >
            {isFetchingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {isExhausted && deals.length > 0 && (
        <p style={styles.endMessage}>
          All {deals.length} deals loaded.
        </p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "16px 20px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#1a1a2e",
    background: "#f8f9fa",
    minHeight: "100vh",
  },
  header: { textAlign: "center", marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 700, margin: 0 },
  subtitle: { color: "#666", fontSize: 14, margin: "4px 0 0" },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "flex-end",
    background: "#fff",
    padding: 16,
    borderRadius: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,.08)",
    marginBottom: 16,
  },
  controlGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase" as const },
  btnGroup: { display: "flex", gap: 4 },
  btn: {
    padding: "6px 14px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#dee2e6",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all .15s",
    color: "#1a1a2e",
  },
  btnActive: {
    background: "#4361ee",
    color: "#fff",
    borderColor: "#4361ee",
  },
  select: {
    padding: "6px 10px",
    border: "1px solid #dee2e6",
    borderRadius: 6,
    fontSize: 13,
  },
  checkLabel: { display: "flex", alignItems: "center", fontSize: 13, cursor: "pointer" },
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    background: "#fff",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  badge: { padding: "2px 8px", borderRadius: 4, background: "#ffc107", fontSize: 12, fontWeight: 600 },
  badgeBlue: { padding: "2px 8px", borderRadius: 4, background: "#4cc9f0", fontSize: 12, fontWeight: 600 },
  badgeGreen: { padding: "2px 8px", borderRadius: 4, background: "#52b788", color: "#fff", fontSize: 12, fontWeight: 600 },
  badgeRed: { padding: "2px 8px", borderRadius: 4, background: "#e63946", color: "#fff", fontSize: 12, fontWeight: 600 },
  dealList: { display: "flex", flexDirection: "column", gap: 10 },
  card: {
    display: "flex",
    gap: 16,
    background: "#fff",
    padding: 16,
    borderRadius: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,.06)",
    transition: "box-shadow .2s",
  },
  cardImg: { width: 80, height: 80, objectFit: "cover", borderRadius: 8, flexShrink: 0, background: "#eee" },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: 600, margin: "0 0 6px", lineHeight: 1.3 },
  priceRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  price: { fontSize: 18, fontWeight: 700, color: "#e63946" },
  prevPrice: { fontSize: 14, textDecoration: "line-through", color: "#999" },
  discount: { fontSize: 12, fontWeight: 600, color: "#fff", background: "#52b788", padding: "1px 6px", borderRadius: 4 },
  meta: { fontSize: 12, color: "#666", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginBottom: 4 },
  couponBadge: { fontSize: 11, background: "#fff3cd", padding: "1px 6px", borderRadius: 3, fontWeight: 600 },
  promoBadge: { fontSize: 11, background: "#d1ecf1", padding: "1px 6px", borderRadius: 3, fontWeight: 600 },
  votes: { fontSize: 12, color: "#888" },
  loadMoreWrap: { textAlign: "center", padding: "20px 0" },
  loadMoreBtn: {
    padding: "10px 32px",
    background: "#4361ee",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  endMessage: { textAlign: "center", color: "#888", fontSize: 14, padding: "16px 0" },
};
