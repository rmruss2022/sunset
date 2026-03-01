import { MapPin, ShieldCheck, Award } from "lucide-react";

interface SellerInfoProps {
  displayName: string;
  ratingPercent: number;
  feedbackCount: number;
  location: string;
  className?: string;
}

export function SellerInfo({
  displayName, ratingPercent, feedbackCount, location, className,
}: SellerInfoProps) {
  const isTopRated = ratingPercent > 99;
  const ratingColor =
    ratingPercent >= 99 ? "text-ah-green"
    : ratingPercent >= 97 ? "text-ah-text"
    : "text-ah-amber";

  return (
    <div className={className}>
      <p className="text-[10px] tracking-[0.14em] uppercase text-ah-text-3 mb-3">
        Seller
      </p>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="font-display text-[17px] text-ah-gold leading-tight">
            {displayName}
          </span>
          <ShieldCheck className="h-3.5 w-3.5 text-ah-green/70 shrink-0" />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className={`tabular font-medium ${ratingColor}`}>
            {ratingPercent.toFixed(1)}%
          </span>
          <span className="text-ah-border">|</span>
          <span className="text-ah-text-2 tabular">
            {feedbackCount.toLocaleString()} reviews
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-ah-text-2">
          <MapPin className="h-3 w-3 text-ah-text-3 shrink-0" />
          {location}
        </div>

        {isTopRated && (
          <div className="flex items-center gap-1.5 text-[11px] text-ah-gold
                          border border-ah-gold/25 bg-ah-gold/5 px-2.5 py-1 w-fit">
            <Award className="h-3 w-3" />
            <span className="tracking-wide">Top Rated Seller</span>
          </div>
        )}
      </div>
    </div>
  );
}
