import { useNavigate } from "react-router";
import { Eye, Gavel, ImageIcon } from "lucide-react";
import type { AuctionSummary } from "../../types/auction";
import { CountdownTimer } from "./CountdownTimer";
import { cn } from "../ui/cn";

interface AuctionCardProps {
  auction: AuctionSummary;
  index?: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function AuctionCard({ auction, index = 0 }: AuctionCardProps) {
  const navigate = useNavigate();
  const isClosed = auction.status === "CLOSED";
  const isFreeShip =
    auction.shippingCostPayer === "SELLER" || auction.shippingCostMin === 0;

  return (
    <article
      onClick={() => navigate(`/auction/${auction.id}`)}
      className={cn(
        "group relative cursor-pointer overflow-hidden",
        "bg-ah-surface border border-ah-border",
        "transition-all duration-300 ease-out",
        "hover:border-ah-border-gold hover:-translate-y-0.5",
        "hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]",
        "animate-fade-up",
      )}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      {/* Left gold accent — revealed on hover */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] bg-ah-gold opacity-0
                   group-hover:opacity-100 transition-opacity duration-300 z-10"
      />

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-ah-bg">
        {auction.imageUrls[0] ? (
          <img
            src={auction.imageUrls[0]}
            alt={auction.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-ah-text-3" />
          </div>
        )}

        {/* Vignette bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ah-surface to-transparent" />

        {/* Category — top left */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="px-2 py-0.5 text-[9px] font-medium tracking-[0.14em] uppercase
                           bg-ah-bg/75 text-ah-text-3 backdrop-blur-sm border border-ah-border">
            {auction.category}
          </span>
        </div>

        {/* Status — top right */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {!isClosed && (
            <span className="w-1.5 h-1.5 rounded-full bg-ah-green animate-gold-pulse" />
          )}
          <span
            className={cn(
              "px-2 py-0.5 text-[9px] font-medium tracking-[0.14em] uppercase backdrop-blur-sm border",
              isClosed
                ? "bg-ah-bg/75 text-ah-red border-ah-red/20"
                : "bg-ah-bg/75 text-ah-green border-ah-green/20",
            )}
          >
            {isClosed ? "Ended" : "Live"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Condition + brand */}
        <p className="text-[9px] font-medium tracking-[0.16em] uppercase text-ah-border-gold mb-2">
          {auction.condition.replace(/_/g, " ")}
          {auction.brand && <span className="text-ah-text-3"> · {auction.brand}</span>}
        </p>

        {/* Title */}
        <h3
          className="font-display font-medium text-[15px] leading-snug text-ah-text
                     line-clamp-2 min-h-[2.6rem] mb-3
                     group-hover:text-ah-gold-bright transition-colors duration-300"
        >
          {auction.title}
        </h3>

        {/* Price */}
        <div className="mb-3">
          <p className="text-[9px] tracking-[0.14em] uppercase text-ah-text-3 mb-0.5">
            {isClosed ? "Final Price" : "Current Bid"}
          </p>
          <p className="text-[21px] font-semibold text-ah-text tabular leading-none">
            {fmt(auction.currentPrice)}
          </p>
          {auction.buyNowPrice && !isClosed && (
            <p className="text-[11px] text-ah-text-3 mt-1">
              Buy Now:{" "}
              <span className="text-ah-gold">{fmt(auction.buyNowPrice)}</span>
            </p>
          )}
        </div>

        {/* Bids + countdown */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-ah-text-3 flex items-center gap-1">
            <Gavel className="h-3 w-3 text-ah-text-3" />
            {auction.bidCount} {auction.bidCount === 1 ? "bid" : "bids"}
          </span>
          <CountdownTimer endsAt={auction.endsAt} compact />
        </div>

        {/* Divider */}
        <div className="border-t border-ah-border pt-3 flex items-end justify-between">
          <div className="space-y-0.5 min-w-0">
            <p className="text-[11px] text-ah-text-3 truncate">
              {auction.sellerDisplayName}
              <span className="text-ah-border-gold ml-1">
                ({auction.sellerRatingPercent.toFixed(0)}%)
              </span>
            </p>
            <p
              className={cn(
                "text-[11px]",
                isFreeShip ? "text-ah-green" : "text-ah-text-3",
              )}
            >
              {isFreeShip ? "Free shipping" : `+${fmt(auction.shippingCostMin)} shipping`}
            </p>
          </div>

          <span className="text-[11px] text-ah-text-3 flex items-center gap-1 shrink-0 ml-2">
            <Eye className="h-3 w-3" />
            {auction.watchCount}
          </span>
        </div>
      </div>
    </article>
  );
}
