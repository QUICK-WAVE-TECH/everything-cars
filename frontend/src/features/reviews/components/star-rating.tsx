"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
};

function StarSvg({
  fill,
  size,
  pct = 100,
}: {
  fill: "full" | "partial" | "empty";
  size: number;
  pct?: number;
}) {
  const id = useId();

  if (fill === "full") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
          fill="#F59E0B"
          stroke="#F59E0B"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (fill === "empty") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
          fill="var(--brc-bg-muted)"
          stroke="var(--brc-border)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Partial fill — use clipPath
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <rect x="0" y="0" width={(24 * pct) / 100} height="24" />
        </clipPath>
      </defs>
      {/* Empty background */}
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
        fill="var(--brc-bg-muted)"
        stroke="var(--brc-border)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Filled portion */}
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
        fill="#F59E0B"
        stroke="#F59E0B"
        strokeWidth="1"
        strokeLinejoin="round"
        clipPath={`url(#${id})`}
      />
    </svg>
  );
}

function computeFill(index: number, rating: number): "full" | "partial" | "empty" {
  const starNumber = index + 1;
  if (rating >= starNumber) return "full";
  if (rating > starNumber - 1) return "partial";
  return "empty";
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 16,
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const displayRating = interactive && hovered > 0 ? hovered : rating;

  if (interactive) {
    return (
      <div
        role="group"
        aria-label="Star rating picker"
        className={cn("flex items-center gap-0.5", className)}
        onMouseLeave={() => setHovered(0)}
      >
        {Array.from({ length: maxStars }, (_, i) => {
          const starValue = i + 1;
          const filled = displayRating >= starValue;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${starValue} star${starValue !== 1 ? "s" : ""}`}
              aria-pressed={rating >= starValue}
              onMouseEnter={() => setHovered(starValue)}
              onClick={() => onChange?.(starValue)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}
            >
              <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ transition: "fill 120ms ease, filter 120ms ease", filter: filled ? "drop-shadow(0 0 2px rgba(245,158,11,0.4))" : "none" }}
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"
                  fill={filled ? "#F59E0B" : "var(--brc-bg-muted)"}
                  stroke={filled ? "#F59E0B" : "var(--brc-border)"}
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>
    );
  }

  // Display mode with half-star support
  return (
    <div
      role="img"
      aria-label={`${rating} out of ${maxStars} stars`}
      className={cn("flex items-center gap-0.5", className)}
    >
      {Array.from({ length: maxStars }, (_, i) => (
        <StarSvg
          key={i}
          fill={computeFill(i, displayRating)}
          size={size}
          pct={Math.max(0, Math.min(100, (displayRating - i) * 100))}
        />
      ))}
    </div>
  );
}
