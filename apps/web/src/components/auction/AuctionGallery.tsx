import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "../ui/cn";

interface AuctionGalleryProps {
  imageUrls: string[];
  title: string;
  className?: string;
}

export function AuctionGallery({ imageUrls, title, className }: AuctionGalleryProps) {
  const [selected, setSelected] = useState(0);
  const [errors, setErrors] = useState<Record<number, boolean>>({});

  if (imageUrls.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-ah-raised aspect-[4/3] border border-ah-border", className)}>
        <div className="text-center text-ah-text-3">
          <ImageIcon className="h-10 w-10 mx-auto mb-2" />
          <p className="text-xs tracking-wide">No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Main image */}
      <div className="overflow-hidden bg-ah-raised aspect-[4/3] border border-ah-border mb-2.5">
        {errors[selected] ? (
          <div className="w-full h-full flex items-center justify-center text-ah-text-3">
            <ImageIcon className="h-10 w-10" />
          </div>
        ) : (
          <img
            key={selected}
            src={imageUrls[selected]}
            alt={`${title} — image ${selected + 1}`}
            className="w-full h-full object-cover"
            onError={() => setErrors((p) => ({ ...p, [selected]: true }))}
          />
        )}
      </div>

      {/* Thumbnails */}
      {imageUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {imageUrls.map((url, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                "shrink-0 w-14 h-14 overflow-hidden border-2 transition-all duration-150",
                i === selected
                  ? "border-ah-gold"
                  : "border-ah-border hover:border-ah-border-gold opacity-60 hover:opacity-100",
              )}
            >
              {errors[i] ? (
                <div className="w-full h-full flex items-center justify-center bg-ah-raised text-ah-text-3">
                  <ImageIcon className="h-3.5 w-3.5" />
                </div>
              ) : (
                <img
                  src={url}
                  alt={`${title} thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => setErrors((p) => ({ ...p, [i]: true }))}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
