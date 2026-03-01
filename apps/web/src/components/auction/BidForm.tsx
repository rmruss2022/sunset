import { useState } from "react";
import { Gavel, AlertCircle } from "lucide-react";
import { trpc } from "../../lib/trpc";
import { useCurrentUser } from "../../lib/userContext";
import { useToast } from "../../lib/toast";

interface BidFormProps {
  auctionId: string;
  currentPrice: number;
  endsAt: string;
  status: string;
  onBid: () => void;
  className?: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function BidForm({ auctionId, currentPrice, endsAt, status, onBid, className }: BidFormProps) {
  const { userId, setUserId } = useCurrentUser();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const { data: users } = trpc.auction.getUsers.useQuery();
  const placeBid = trpc.auction.placeBid.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast(result.message ?? "Bid placed!", "success");
        setAmount("");
        setError("");
        onBid();
        if (typeof window !== "undefined" && (window as Window & { confetti?: () => void }).confetti) {
          (window as Window & { confetti?: () => void }).confetti!();
        }
      } else {
        setError(result.message);
      }
    },
    onError: (err) => {
      const msg = err.message || "Failed to place bid";
      setError(msg);
      toast(msg, "error");
    },
  });

  const isEnded = status === "CLOSED" || new Date(endsAt).getTime() <= Date.now();
  const minBid = currentPrice + 1;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!userId) {
      setError("Select a bidder from the header first.");
      return;
    }
    const val = parseFloat(amount);
    if (isNaN(val) || val < minBid) {
      setError(`Minimum bid is ${fmt(minBid)}`);
      return;
    }
    placeBid.mutate({ auctionId, userId, maxAmount: val });
  }

  if (isEnded) {
    return (
      <div className={className}>
        <div className="border border-ah-red/20 bg-ah-raised p-5 text-center space-y-1">
          <Gavel className="h-5 w-5 text-ah-red/60 mx-auto" />
          <p className="font-display text-lg text-ah-text">Bidding Closed</p>
          <p className="text-sm text-ah-text-2">
            Final price: <span className="text-ah-text tabular font-medium">{fmt(currentPrice)}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="border border-ah-border bg-ah-raised p-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Bidder selector */}
          <div>
            <label className="block text-[10px] tracking-[0.14em] uppercase text-ah-text-3 mb-1.5">
              Bid as
            </label>
            <div className="relative">
              <select
                value={userId ?? ""}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full h-9 pl-3 pr-8 text-sm appearance-none
                           bg-ah-surface border border-ah-border text-ah-text
                           focus:outline-none focus:border-ah-border-gold
                           transition-colors cursor-pointer"
              >
                <option value="" disabled className="bg-ah-surface text-ah-text-3">Select bidder…</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id} className="bg-ah-surface">{u.displayName}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ah-text-3 text-[10px]">▾</span>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-[10px] tracking-[0.14em] uppercase text-ah-text-3 mb-1.5">
              Your max bid
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ah-text-2 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min={minBid}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={minBid.toFixed(2)}
                className="w-full h-9 pl-6 pr-3 text-sm tabular
                           bg-ah-surface border border-ah-border text-ah-text
                           placeholder:text-ah-text-3
                           focus:outline-none focus:border-ah-border-gold
                           transition-colors"
              />
            </div>
            <p className="text-[11px] text-ah-text-3 mt-1">
              Min: <span className="tabular">{fmt(minBid)}</span>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-ah-red text-xs">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={placeBid.isPending}
            className="w-full h-10 flex items-center justify-center gap-2
                       bg-ah-gold text-ah-bg text-[11px] tracking-[0.14em] uppercase font-semibold
                       hover:bg-ah-gold-bright
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
          >
            {placeBid.isPending ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-ah-bg border-t-transparent rounded-full animate-spin" />
                Placing bid…
              </>
            ) : (
              <>
                <Gavel className="h-3.5 w-3.5" />
                Place Bid
              </>
            )}
          </button>
        </form>

        {/* Proxy bidding note */}
        <p className="text-[10px] text-ah-text-3 leading-relaxed border-t border-ah-border pt-3">
          Enter your <span className="text-ah-text-2">maximum</span>. We bid on your behalf
          up to this amount — only enough to keep you in the lead.
        </p>
      </div>
    </div>
  );
}
