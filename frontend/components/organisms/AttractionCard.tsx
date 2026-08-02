/**
 * components/AttractionCard.tsx
 */
"use client";

import { AttractionResult } from "@/lib/api/types";

interface AttractionCardProps {
  attraction: AttractionResult;
  rank?: number;
}

const SOURCE_LABELS: Record<string, string> = {
  postgres: "SQL Data",
  "pinecone-text": "Semantic Match",
  "pinecone-image": "Visual Match",
};

export default function AttractionCard({
  attraction,
  rank,
}: AttractionCardProps) {
  const feeDisplay =
    attraction.entrance_fee_usd === null ||
    attraction.entrance_fee_usd === undefined
      ? "—"
      : attraction.entrance_fee_usd === 0
      ? "Free"
      : `$${attraction.entrance_fee_usd.toFixed(2)}`;

  return (
    <div className="group relative flex flex-col bg-white border border-[#a9e2cc] rounded-xl overflow-hidden hover:border-[#78d2b0] hover:shadow-md transition-all">
      {/* Hero image */}
      <div className="relative h-40 overflow-hidden bg-[#d4f2e6]">
        {attraction.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attraction.image_url}
            alt={attraction.name}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}

        {/* Subtle light gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#062b20]/40 via-transparent to-transparent" />

        {/* Category tag */}
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-white/90 backdrop-blur-sm text-[#062b20] border border-[#a9e2cc] shadow-sm">
            {attraction.category}
          </span>
        </div>

        {/* Rank badge */}
        {rank !== undefined && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-white/90 backdrop-blur-sm border border-[#a9e2cc] text-[10px] font-mono text-[#062b20] shadow-sm">
            #{rank}
          </div>
        )}

        {/* Source badge */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#062b20]/80 backdrop-blur-sm text-white">
            {SOURCE_LABELS[attraction.source] ?? attraction.source}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-2.5 p-4 flex-1">
        {/* Title + district */}
        <div>
          <h3 className="text-sm font-semibold text-[#062b20] leading-tight group-hover:text-[#1b8867] transition-colors">
            {attraction.name}
          </h3>
          <p className="text-xs text-[#377d64] mt-0.5">
            {attraction.district} District
          </p>
        </div>

        {/* Fee + difficulty row */}
        <div className="flex items-center justify-between text-xs">
          <span className="px-2 py-0.5 font-medium rounded bg-[#d4f2e6] text-[#062b20] border border-[#a9e2cc]">
            {feeDisplay}
          </span>

          {attraction.difficulty_level && (
            <span className="px-2 py-0.5 text-[11px] text-[#12543e] rounded border border-[#a9e2cc] bg-[#edf8f3]">
              {attraction.difficulty_level}
            </span>
          )}
        </div>

        {/* Description excerpt */}
        <p className="text-xs text-[#12543e] leading-relaxed line-clamp-3 flex-1">
          {attraction.description}
        </p>

        {/* Relevance score bar */}
        {attraction.score !== null && attraction.score !== undefined && (
          <div className="mt-auto pt-1">
            <div className="flex items-center justify-between text-[10px] text-[#377d64] mb-1">
              <span>Relevance</span>
              <span className="font-mono text-[#062b20]">{(attraction.score * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#d4f2e6] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1b8867] transition-all duration-500"
                style={{ width: `${Math.min(attraction.score * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
