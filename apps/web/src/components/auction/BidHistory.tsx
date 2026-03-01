import { Gavel } from "lucide-react";
import type { BidRecord } from "../../types/auction";

interface BidHistoryProps {
  bids: BidRecord[];
  totalBidCount: number;
  className?: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function timeAgo(s: string): string {
  const mins = Math.floor((Date.now() - new Date(s).getTime()) / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function BidHistory({ bids, totalBidCount, className }: BidHistoryProps) {
  if (bids.length === 0) {
    return (
      <div className={className}>
        <div className="py-10 text-center border border-ah-border bg-ah-surface">
          <Gavel className="h-7 w-7 text-ah-text-3 mx-auto mb-3" />
          <p className="font-display text-xl text-ah-text-2">No bids yet</p>
          <p className="text-xs text-ah-text-3 mt-1">Be the first to bid on this lot.</p>
        </div>
      </div>
    );
  }

  // Build stable anonymous labels by order of first appearance
  const seen: string[] = [];
  for (const b of [...bids].reverse()) {
    if (!seen.includes(b.userId)) seen.push(b.userId);
  }
  const label = (id: string) => `Bidder ${seen.indexOf(id) + 1}`;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl text-ah-text flex items-center gap-2">
          <Gavel className="h-4 w-4 text-ah-border-gold" />
          Bid History
        </h3>
        <span className="text-[11px] tracking-wide text-ah-text-3 tabular">
          {totalBidCount} {totalBidCount === 1 ? "bid" : "bids"} total
        </span>
      </div>

      {/* Table */}
      <div className="border border-ah-border overflow-hidden">
        {/* thead */}
        <div className="grid grid-cols-[3rem_1fr_auto_auto] bg-ah-raised border-b border-ah-border
                        px-4 py-2 text-[9px] tracking-[0.14em] uppercase text-ah-text-3">
          <span>#</span>
          <span>Bidder</span>
          <span className="text-right pr-6">Amount</span>
          <span className="text-right">When</span>
        </div>

        {/* rows */}
        {bids.map((bid, i) => (
          <div
            key={bid.id}
            className={`grid grid-cols-[3rem_1fr_auto_auto] items-center px-4 py-2.5
                        border-b border-ah-border last:border-0
                        ${bid.isLeading ? "bg-ah-gold/5" : "bg-ah-surface"}`}
          >
            <span className="text-[11px] text-ah-text-3 tabular">{i + 1}</span>

            <span className="flex items-center gap-2">
              <span
                className={bid.isLeading ? "text-ah-text text-sm font-medium" : "text-ah-text-2 text-sm"}
              >
                {label(bid.userId)}
              </span>
              {bid.isLeading && (
                <span className="px-1.5 py-0.5 text-[9px] tracking-widest uppercase
                                 bg-ah-gold/15 text-ah-gold border border-ah-gold/30">
                  Leading
                </span>
              )}
            </span>

            <span className="text-sm text-ah-text tabular font-medium pr-6">
              {fmt(bid.visiblePriceSnapshot)}
            </span>

            <span className="text-[11px] text-ah-text-3 tabular">
              {timeAgo(bid.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
