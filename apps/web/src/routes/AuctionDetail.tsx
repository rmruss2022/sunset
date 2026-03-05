import { useParams, useNavigate } from "react-router";
import { ChevronLeft, Gavel, Package, RotateCcw, CreditCard, Globe } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AuctionGallery } from "../components/auction/AuctionGallery";
import { CountdownTimer } from "../components/auction/CountdownTimer";
import { BidForm } from "../components/auction/BidForm";
import { BidHistory } from "../components/auction/BidHistory";
import { WatchButton } from "../components/auction/WatchButton";
import { SellerInfo } from "../components/auction/SellerInfo";
import { trpc } from "../lib/trpc";
import { useAuctionSocket } from "../lib/useAuctionSocket";
import type { AuctionDetail as AuctionDetailType, BidRecord } from "../types/auction";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDetail(item: any): AuctionDetailType {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    condition: item.condition,
    brand: item.brand ?? undefined,
    model: item.model ?? undefined,
    year: item.year ?? undefined,
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
    description: item.description,
    itemSpecifics: (item.itemSpecifics ?? {}) as Record<string, string>,
    videoUrl: item.videoUrl ?? undefined,
    shippingService: item.shippingService,
    handlingDays: item.handlingDays,
    estimatedDeliveryMinDays: item.estimatedDeliveryMinDays,
    estimatedDeliveryMaxDays: item.estimatedDeliveryMaxDays,
    itemLocationZip: item.itemLocationZip,
    internationalShipping: item.internationalShipping,
    paymentMethodLabel: item.paymentMethodLabel,
    isWatched: item.isWatched ?? false,
    bids: (item.bids ?? []).map((b: any): BidRecord => ({
      id: b.id,
      userId: b.userId,
      userDisplayName: b.displayName ?? b.userDisplayName ?? "Anonymous",
      visiblePriceSnapshot: Number(b.visiblePriceSnapshot),
      createdAt: typeof b.createdAt === "string" ? b.createdAt : new Date(b.createdAt).toISOString(),
      isLeading: b.isLeading,
    })),
  };
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="h-4 w-24 bg-ah-raised rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="aspect-[4/3] bg-ah-raised animate-pulse" />
          <div className="space-y-2">
            {[3, 4, 2].map((w, i) => (
              <div key={i} className={`h-3 bg-ah-raised rounded animate-pulse w-${w}/4`} />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="h-8 bg-ah-raised rounded animate-pulse w-3/4" />
          <div className="h-28 bg-ah-raised rounded animate-pulse" />
          <div className="h-40 bg-ah-raised rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Thin info row used in shipping/payment panels */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-ah-border last:border-0">
      <span className="text-ah-text-3 mt-0.5 shrink-0">{icon}</span>
      <span className="text-[11px] tracking-[0.1em] uppercase text-ah-text-3 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-ah-text-2">{value}</span>
    </div>
  );
}

export function AuctionDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: raw, isLoading, isError } = trpc.auction.getById.useQuery(
    { id: id! },
    { enabled: !!id },
  );

  useAuctionSocket(id ?? null);

  if (isLoading) return <Skeleton />;

  if (isError || !raw) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <p className="font-display text-6xl text-ah-text-3 mb-3">404</p>
        <p className="text-ah-text-2 mb-6">This lot could not be found.</p>
        <button
          onClick={() => navigate("/")}
          className="h-9 px-5 text-xs tracking-widest uppercase border border-ah-border
                     text-ah-text-2 hover:border-ah-border-gold hover:text-ah-text transition-colors"
        >
          ← All Lots
        </button>
      </div>
    );
  }

  const auction = mapDetail(raw);
  const isClosed = auction.status === "CLOSED";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [["auction", "getById"]] });
    queryClient.invalidateQueries({ queryKey: [["auction", "list"]] });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">

      {/* Back */}
      <div className="py-5">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-xs tracking-widest uppercase text-ah-text-3
                     hover:text-ah-text-2 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All Lots
        </button>
      </div>

      {/* Decorative rule */}
      <div className="h-px bg-gradient-to-r from-ah-border-gold via-ah-border to-transparent mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

        {/* ── Left: Gallery + Description ── */}
        <div className="lg:col-span-3 space-y-8">
          <AuctionGallery imageUrls={auction.imageUrls} title={auction.title} />

          {/* Description */}
          <div>
            <p className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3 mb-3">
              Provenance &amp; Description
            </p>
            <p className="text-sm text-ah-text-2 leading-relaxed whitespace-pre-line">
              {auction.description}
            </p>
          </div>

          {/* Item Specifics */}
          {Object.keys(auction.itemSpecifics).length > 0 && (
            <div>
              <p className="text-[10px] tracking-[0.16em] uppercase text-ah-text-3 mb-3">
                Lot Specifics
              </p>
              <div className="border border-ah-border overflow-hidden">
                {Object.entries(auction.itemSpecifics).map(([k, v], i) => (
                  <div
                    key={k}
                    className={`flex gap-4 px-4 py-2.5 border-b border-ah-border last:border-0 text-sm
                                ${i % 2 === 0 ? "bg-ah-surface" : "bg-ah-raised"}`}
                  >
                    <span className="text-ah-text-3 w-36 shrink-0">{k}</span>
                    <span className="text-ah-text-2">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bid history — shown below on mobile */}
          <div className="lg:hidden">
            <BidHistory bids={auction.bids} totalBidCount={auction.bidCount} />
          </div>
        </div>

        {/* ── Right: Title + Price + Bid + Info ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Status + category + condition */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 text-[9px] tracking-[0.16em] uppercase border font-medium
              ${isClosed
                ? "border-ah-red/25 text-ah-red bg-ah-red/5"
                : "border-ah-green/25 text-ah-green bg-ah-green/5"}`}>
              {isClosed ? "Ended" : "Live"}
            </span>
            {[auction.category, auction.condition.replace(/_/g, " ")].map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-[9px] tracking-[0.14em] uppercase
                                         border border-ah-border text-ah-text-3">
                {tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-medium text-ah-text leading-snug">
              {auction.title}
            </h1>
            {(auction.brand || auction.year) && (
              <p className="text-sm text-ah-text-2 mt-1">
                {[auction.brand, auction.model, auction.year].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Price block */}
          <div className="border border-ah-border bg-ah-raised p-5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[9px] tracking-[0.16em] uppercase text-ah-text-3">
                {isClosed ? "Hammer Price" : "Current Bid"}
              </span>
              <span className="text-[11px] text-ah-text-3 flex items-center gap-1 tabular">
                <Gavel className="h-3 w-3" />
                {auction.bidCount} {auction.bidCount === 1 ? "bid" : "bids"}
              </span>
            </div>

            <p className="text-4xl font-semibold text-ah-text tabular mt-1">
              {fmt(auction.currentPrice)}
            </p>

            {auction.buyNowPrice && !isClosed && (
              <p className="text-sm text-ah-text-2 mt-1.5 flex items-center gap-1.5">
                Buy It Now:
                <span className="text-ah-gold font-medium tabular">{fmt(auction.buyNowPrice)}</span>
              </p>
            )}

            <div className="mt-4 pt-4 border-t border-ah-border">
              <CountdownTimer endsAt={auction.endsAt} />
            </div>
          </div>

          {/* Bid form */}
          <BidForm
            auctionId={auction.id}
            currentPrice={auction.currentPrice}
            endsAt={auction.endsAt}
            status={auction.status}
            onBid={invalidate}
          />

          {/* Watch */}
          <WatchButton
            auctionId={auction.id}
            isWatched={auction.isWatched ?? false}
            watchCount={auction.watchCount}
            onToggle={invalidate}
            className="w-full"
          />

          {/* Seller */}
          <div className="border border-ah-border bg-ah-surface p-5">
            <SellerInfo
              displayName={auction.sellerDisplayName}
              ratingPercent={auction.sellerRatingPercent}
              feedbackCount={auction.sellerFeedbackCount}
              location={auction.sellerLocation}
            />
          </div>

          {/* Shipping */}
          <div className="border border-ah-border bg-ah-surface p-5">
            <p className="text-[10px] tracking-[0.14em] uppercase text-ah-text-3 mb-3">
              Delivery &amp; Shipping
            </p>
            <div>
              <InfoRow
                icon={<Package className="h-3.5 w-3.5" />}
                label="Shipping"
                value={
                  auction.shippingCostPayer === "SELLER" || auction.shippingCostMin === 0
                    ? <span className="text-ah-green">Free</span>
                    : `${fmt(auction.shippingCostMin)}${auction.shippingCostMax > auction.shippingCostMin
                        ? ` – ${fmt(auction.shippingCostMax)}` : ""}`
                }
              />
              <InfoRow
                icon={<span className="text-[10px]">⚡</span>}
                label="Delivery"
                value={`${auction.estimatedDeliveryMinDays}–${auction.estimatedDeliveryMaxDays} days`}
              />
              {auction.internationalShipping && (
                <InfoRow
                  icon={<Globe className="h-3.5 w-3.5" />}
                  label="Int'l"
                  value="Ships worldwide"
                />
              )}
              <InfoRow
                icon={<RotateCcw className="h-3.5 w-3.5" />}
                label="Returns"
                value={
                  auction.returnsAccepted
                    ? <span className="text-ah-green">{auction.returnsPolicyLabel}</span>
                    : <span className="text-ah-red">No returns</span>
                }
              />
              <InfoRow
                icon={<CreditCard className="h-3.5 w-3.5" />}
                label="Payment"
                value={auction.paymentMethodLabel}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bid history — desktop full width */}
      <div className="hidden lg:block mt-12">
        <div className="h-px bg-gradient-to-r from-ah-border-gold via-ah-border to-transparent mb-8" />
        <BidHistory bids={auction.bids} totalBidCount={auction.bidCount} />
      </div>
    </div>
  );
}
