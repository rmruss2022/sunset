import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { AuctionCard } from "../components/auction/AuctionCard";
import { trpc } from "../lib/trpc";
import type { AuctionSummary } from "../types/auction";
import { cn } from "../components/ui/cn";

type SortOption = "ending-soon" | "price-low" | "price-high" | "newest" | "most-bids";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "ending-soon", label: "Ending Soonest" },
  { value: "price-low",   label: "Price ↑" },
  { value: "price-high",  label: "Price ↓" },
  { value: "most-bids",   label: "Most Bids" },
  { value: "newest",      label: "Newest" },
];

const CATEGORIES = [
  "All",
  "Cameras",
  "Collectibles",
  "Electronics",
  "Fashion",
  "Sports",
  "Vehicles",
  "Watches",
];

function toServerSort(s: SortOption) {
  if (s === "ending-soon") return "ending" as const;
  if (s === "price-low")   return "price_asc" as const;
  if (s === "price-high")  return "price_desc" as const;
  if (s === "newest")      return "newest" as const;
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSummary(item: any): AuctionSummary {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    condition: item.condition,
    brand: item.brand ?? undefined,
    imageUrls: item.imageUrls ?? [],
    listingFormat: item.listingFormat,
    startingPrice: Number(item.startingPrice),
    currentPrice: Number(item.currentPrice),
    buyNowPrice: item.buyNowPrice ? Number(item.buyNowPrice) : undefined,
    endsAt: typeof item.endsAt === "string" ? item.endsAt : new Date(item.endsAt).toISOString(),
    status: item.status,
    bidCount: item.bidCount,
    watchCount: item.watchCount,
    sellerId: item.sellerId,
    sellerDisplayName: item.seller?.displayName ?? "",
    sellerRatingPercent: item.seller?.sellerRatingPercent ?? 0,
    sellerFeedbackCount: item.seller?.sellerFeedbackCount ?? 0,
    sellerLocation: item.seller?.sellerLocation ?? "",
    shippingMode: item.shippingMode,
    shippingCostPayer: item.shippingCostPayer,
    shippingCostMin: Number(item.shippingCostMin),
    shippingCostMax: Number(item.shippingCostMax),
    returnsAccepted: item.returnsAccepted,
    returnsPolicyLabel: item.returnsPolicyLabel,
  };
}

function SkeletonCard() {
  return (
    <div className="bg-ah-surface border border-ah-border overflow-hidden">
      <div className="aspect-[4/3] bg-ah-raised animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-2 bg-ah-raised rounded w-1/4 animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-3.5 bg-ah-raised rounded w-3/4 animate-pulse" />
          <div className="h-3.5 bg-ah-raised rounded w-1/2 animate-pulse" />
        </div>
        <div className="h-6 bg-ah-raised rounded w-1/3 animate-pulse" />
        <div className="flex justify-between">
          <div className="h-2.5 bg-ah-raised rounded w-1/5 animate-pulse" />
          <div className="h-2.5 bg-ah-raised rounded w-1/5 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function AuctionListRoute() {
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("All");
  const [status,   setStatus]   = useState<"active" | "all">("active");
  const [sort,     setSort]     = useState<SortOption>("ending-soon");

  const serverCategory = category !== "All" ? category : undefined;
  const serverStatus   = status === "active" ? "ACTIVE" : undefined;

  const query = trpc.auction.list.useQuery({
    category: serverCategory,
    status: serverStatus,
    sort: toServerSort(sort),
  });
  const raw = query.data as Array<Record<string, unknown>> | undefined;

  const filtered = useMemo(() => {
    if (!raw) return [];
    let list = raw.map(mapSummary);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.brand?.toLowerCase() ?? "").includes(q) ||
          a.category.toLowerCase().includes(q),
      );
    }
    if (sort === "most-bids") list.sort((a, b) => b.bidCount - a.bidCount);
    return list;
  }, [raw, search, sort]);

  const activeCount = useMemo(
    () => raw?.filter((a) => a.status === "ACTIVE").length ?? 0,
    [raw],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">

      {/* ── Editorial Header ── */}
      <div className="pt-12 pb-8 border-b border-ah-border">
        <p className="text-[10px] tracking-[0.22em] uppercase text-ah-border-gold mb-3">
          Live Catalogue
        </p>
        <h1 className="font-display text-5xl sm:text-6xl font-light text-ah-text leading-none">
          Auction House
        </h1>
        <div className="flex items-center gap-3 mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-ah-green animate-gold-pulse inline-block" />
          <span className="text-sm text-ah-text-2">
            <span className="text-ah-text tabular font-medium">{activeCount}</span>
            {" "}active listings
          </span>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="py-5 space-y-4">

        {/* Category pill rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "shrink-0 h-7 px-3.5 text-[11px] tracking-[0.12em] uppercase font-medium",
                "border transition-all duration-150",
                category === cat
                  ? "bg-ah-gold text-ah-bg border-ah-gold"
                  : "bg-transparent text-ah-text-2 border-ah-border hover:border-ah-border-gold hover:text-ah-text",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search + status + sort row */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ah-text-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles, brands…"
              className="w-full h-9 pl-9 pr-3 text-sm bg-ah-surface border border-ah-border
                         text-ah-text placeholder:text-ah-text-3
                         focus:outline-none focus:border-ah-border-gold transition-colors"
            />
          </div>

          <div className="flex gap-2">
            {/* Status toggle */}
            {(["active", "all"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  "h-9 px-4 text-[11px] tracking-[0.1em] uppercase font-medium border transition-all",
                  status === s
                    ? "bg-ah-raised border-ah-border-gold text-ah-text"
                    : "bg-transparent border-ah-border text-ah-text-3 hover:text-ah-text-2",
                )}
              >
                {s === "active" ? "Active" : "All"}
              </button>
            ))}

            {/* Sort */}
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="h-9 pl-3 pr-7 text-[11px] tracking-[0.08em] uppercase appearance-none
                           bg-ah-surface border border-ah-border text-ah-text-2
                           focus:outline-none focus:border-ah-border-gold transition-colors cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-ah-surface normal-case tracking-normal text-sm">
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ah-text-3 text-[10px]">▾</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      {query.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : query.isError ? (
        <div className="py-24 text-center">
          <p className="font-display text-3xl text-ah-text-3 mb-2">Connection error</p>
          <p className="text-sm text-ah-text-3">Could not reach the server. Is it running?</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-display text-4xl text-ah-text-3 mb-2">No lots found</p>
          <p className="text-sm text-ah-text-3">Adjust your filters or check back soon.</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-ah-text-3 tracking-wide mb-4 tabular">
            {filtered.length} {filtered.length === 1 ? "lot" : "lots"}
            {search && <> matching &ldquo;{search}&rdquo;</>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((auction, i) => (
              <AuctionCard key={auction.id} auction={auction} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
