/**
 * components/AttractionCard.tsx
 */
"use client";

import { AttractionResult } from "@/lib/api/types";
import { cn } from "@/utils/cn";

interface AttractionCardProps {
  attraction: AttractionResult;
  rank?: number;
  /** Zero-based index for stagger animation */
  index?: number;
}

const SOURCE_CONFIG: Record<string, { label: string; className: string }> = {
  postgres: {
    label: "SQL Data",
    className: "bg-[var(--structured-light)] text-[#1e40af] border border-[var(--structured-border)]",
  },
  "pinecone-text": {
    label: "Semantic Match",
    className: "bg-[var(--semantic-light)] text-[#5b21b6] border border-[var(--semantic-border)]",
  },
  "pinecone-image": {
    label: "Visual Match",
    className: "bg-[var(--image-light)] text-[#c2410c] border border-[var(--image-border)]",
  },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-[#166534] bg-[var(--success-light)] border-[#bbf7d0]",
  Moderate: "text-[#92400e] bg-[var(--warning-light)] border-[#fde68a]",
  Hard: "text-[#991b1b] bg-[var(--danger-light)] border-[var(--danger-border)]",
};

export default function AttractionCard({
  attraction,
  rank,
  index = 0,
}: AttractionCardProps) {
  const feeDisplay =
    attraction.entrance_fee_usd === null ||
    attraction.entrance_fee_usd === undefined
      ? "—"
      : attraction.entrance_fee_usd === 0
      ? "Free"
      : `$${attraction.entrance_fee_usd.toFixed(2)}`;

  const sourceConfig = SOURCE_CONFIG[attraction.source] ?? {
    label: attraction.source,
    className: "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]",
  };

  const staggerClass = index < 10 ? `stagger-${index + 1}` : "";

  return (
    <div
      className={cn(
        "group relative flex flex-col bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden",
        "hover:border-[var(--border-strong)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5",
        "transition-all duration-300 ease-out",
        "animate-slide-up opacity-0",
        staggerClass
      )}
    >
      {/* Hero image */}
      <div className="relative h-44 overflow-hidden bg-[var(--bg-elevated)]">
        {attraction.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attraction.image_url}
            alt={attraction.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        {/* Category tag */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white/90 backdrop-blur-sm text-[var(--text-primary)] shadow-sm">
            {attraction.category}
          </span>
        </div>

        {/* Rank badge */}
        {rank !== undefined && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center text-[11px] font-bold text-[var(--text-primary)] shadow-sm tabular-nums">
            {rank}
          </div>
        )}

        {/* Source badge — color-coded */}
        <div className="absolute bottom-3 right-3">
          <span className={cn(
            "px-2 py-0.5 text-[10px] font-semibold rounded-md backdrop-blur-sm",
            sourceConfig.className
          )}>
            {sourceConfig.label}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Title + district */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight group-hover:text-[var(--primary)] transition-colors duration-200 font-[family-name:var(--font-outfit)]">
            {attraction.name}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {attraction.district} District
          </p>
        </div>

        {/* Fee + difficulty row */}
        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            "px-2.5 py-1 font-semibold rounded-lg border",
            attraction.entrance_fee_usd === 0
              ? "bg-[var(--success-light)] text-[#166534] border-[#bbf7d0]"
              : "bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)]"
          )}>
            {feeDisplay}
          </span>

          {attraction.difficulty_level && (
            <span className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded-lg border",
              DIFFICULTY_COLORS[attraction.difficulty_level] ||
                "text-[var(--text-secondary)] bg-[var(--bg-elevated)] border-[var(--border)]"
            )}>
              {attraction.difficulty_level}
            </span>
          )}
        </div>

        {/* Description excerpt */}
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3 flex-1">
          {attraction.description}
        </p>

        {/* Relevance score bar */}
        {attraction.score !== null && attraction.score !== undefined && (
          <div className="mt-auto pt-1">
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1.5">
              <span className="font-medium">Relevance</span>
              <span className="font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                {(attraction.score * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bg-inset)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] transition-all duration-700 ease-out"
                style={{ width: `${Math.min(attraction.score * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
