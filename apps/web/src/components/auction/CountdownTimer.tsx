import { useState, useEffect } from "react";
import { cn } from "../ui/cn";

interface CountdownTimerProps {
  endsAt: string;
  className?: string;
  /** compact: inline text for cards; full: segmented blocks for detail page */
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeLeft(endsAt: string): TimeLeft {
  const total = new Date(endsAt).getTime() - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  return {
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total / 3_600_000) % 24),
    minutes: Math.floor((total / 60_000) % 60),
    seconds: Math.floor((total / 1_000) % 60),
    total,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function urgencyColor(totalMs: number): string {
  const hours = totalMs / 3_600_000;
  if (hours < 1) return "text-ah-red";
  if (hours < 6) return "text-ah-amber";
  return "text-ah-green";
}

/** Compact inline: used in AuctionCard */
function CompactTimer({ timeLeft }: { timeLeft: TimeLeft }) {
  if (timeLeft.total <= 0) {
    return <span className="text-ah-red text-[11px] font-medium tracking-wide">Closed</span>;
  }

  const color = urgencyColor(timeLeft.total);
  const isUrgent = timeLeft.total < 3_600_000;

  return (
    <span className={cn("text-[11px] font-medium tabular tracking-wide", color,
      isUrgent && "animate-gold-pulse"
    )}>
      {timeLeft.days > 0 && `${timeLeft.days}d `}
      {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
    </span>
  );
}

/** Full segmented blocks: used in AuctionDetail */
function FullTimer({ timeLeft }: { timeLeft: TimeLeft }) {
  if (timeLeft.total <= 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="px-3 py-2 bg-ah-raised border border-ah-red/30 text-ah-red text-sm font-medium tracking-widest uppercase">
          Lot Closed
        </span>
      </div>
    );
  }

  const color = urgencyColor(timeLeft.total);
  const borderColor =
    timeLeft.total < 3_600_000
      ? "border-ah-red/40"
      : timeLeft.total < 21_600_000
        ? "border-ah-amber/40"
        : "border-ah-border";

  const segments = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hrs" },
    { value: timeLeft.minutes, label: "Min" },
    { value: timeLeft.seconds, label: "Sec" },
  ];

  return (
    <div className="flex items-end gap-1.5">
      {segments.map(({ value, label }, i) => (
        <div key={label} className="flex items-end gap-1.5">
          <div className={cn("flex flex-col items-center px-2.5 pt-2 pb-1.5 bg-ah-raised border", borderColor)}>
            <span className={cn("text-2xl font-semibold tabular leading-none font-display", color)}>
              {pad(value)}
            </span>
            <span className="text-[9px] tracking-widest uppercase text-ah-text-3 mt-1">
              {label}
            </span>
          </div>
          {i < segments.length - 1 && (
            <span className={cn("text-lg font-light mb-2 leading-none", color)}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function CountdownTimer({ endsAt, className, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(endsAt));

  useEffect(() => {
    const timer = setInterval(() => {
      const tl = getTimeLeft(endsAt);
      setTimeLeft(tl);
      if (tl.total <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  return (
    <span className={className}>
      {compact ? <CompactTimer timeLeft={timeLeft} /> : <FullTimer timeLeft={timeLeft} />}
    </span>
  );
}
