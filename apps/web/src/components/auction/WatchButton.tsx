import { Eye, EyeOff } from "lucide-react";
import { cn } from "../ui/cn";
import { trpc } from "../../lib/trpc";
import { useCurrentUser } from "../../lib/userContext";

interface WatchButtonProps {
  auctionId: string;
  isWatched: boolean;
  watchCount: number;
  onToggle: () => void;
  className?: string;
}

export function WatchButton({
  auctionId, isWatched, watchCount, onToggle, className,
}: WatchButtonProps) {
  const { userId } = useCurrentUser();

  const watch   = trpc.auction.watch.useMutation({ onSuccess: onToggle });
  const unwatch = trpc.auction.unwatch.useMutation({ onSuccess: onToggle });
  const pending = watch.isPending || unwatch.isPending;

  function toggle() {
    if (!userId) return;
    if (isWatched) unwatch.mutate({ auctionId, userId });
    else           watch.mutate({ auctionId, userId });
  }

  return (
    <button
      onClick={toggle}
      disabled={!userId || pending}
      className={cn(
        "h-9 flex items-center justify-center gap-2 text-[11px] tracking-[0.12em] uppercase font-medium",
        "border transition-all duration-200",
        isWatched
          ? "border-ah-border-gold text-ah-gold bg-ah-gold/5 hover:bg-ah-gold/10"
          : "border-ah-border text-ah-text-2 hover:border-ah-border-gold hover:text-ah-text",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
    >
      {isWatched
        ? <EyeOff className="h-3.5 w-3.5" />
        : <Eye className="h-3.5 w-3.5" />}
      {!userId ? "Select user to watch"
        : isWatched ? "Watching"
        : "Watch"}
      <span className="tabular text-ah-text-3">({watchCount})</span>
    </button>
  );
}
