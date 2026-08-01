/**
 * components/AttractionCard.tsx
 *
 * Premium card for a single tourist attraction showing:
 *   - Hero image with category tag overlay
 *   - Name, district, difficulty
 *   - Entrance fee (or FREE badge)
 *   - Description excerpt
 *   - Similarity score bar
 *   - Source badge (postgres / pinecone-text / pinecone-image)
 */
"use client";

import { AttractionResult } from "@/lib/api/types";

interface AttractionCardProps {
  attraction: AttractionResult;
  rank?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Beaches: "from-cyan-400 to-blue-500",
  Waterfalls: "from-blue-400 to-indigo-500",
  "Historical Sites": "from-amber-400 to-orange-500",
  "National Parks": "from-emerald-400 to-green-500",
  Temples: "from-rose-400 to-pink-500",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  Moderate: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  Hard: "text-red-400 bg-red-400/10 border-red-400/30",
};

const SOURCE_LABELS: Record<string, string> = {
  postgres: "🗄️ SQL",
  "pinecone-text": "🔍 Semantic",
  "pinecone-image": "🖼️ Visual",
};

const CATEGORY_EMOJI: Record<string, string> = {
  Beaches: "🏖️",
  Waterfalls: "💧",
  "Historical Sites": "🏛️",
  "National Parks": "🦁",
  Temples: "🕌",
};

export default function AttractionCard({
  attraction,
  rank,
}: AttractionCardProps) {
  const gradient =
    CATEGORY_COLORS[attraction.category] || "from-slate-400 to-slate-600";
  const difficultyStyle =
    DIFFICULTY_COLORS[attraction.difficulty_level ?? ""] ?? "";
  const emoji = CATEGORY_EMOJI[attraction.category] ?? "📍";

  const feeDisplay =
    attraction.entrance_fee_usd === null ||
    attraction.entrance_fee_usd === undefined
      ? "—"
      : attraction.entrance_fee_usd === 0
      ? "FREE"
      : `$${attraction.entrance_fee_usd.toFixed(2)}`;

  const isFreeFee =
    attraction.entrance_fee_usd === 0 ||
    attraction.entrance_fee_usd === null;

  return (
    <div className="group relative flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/25 transition-all duration-300 hover:shadow-2xl hover:shadow-black/30 hover:-translate-y-1">
      {/* Hero image */}
      <div className="relative h-44 overflow-hidden">
        {attraction.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attraction.image_url}
            alt={attraction.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              // fallback gradient if image fails to load
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : null}

        {/* Gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t ${gradient} opacity-40`}
        />

        {/* Category tag */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-gradient-to-r ${gradient} text-white shadow-lg`}
          >
            {emoji} {attraction.category}
          </span>
        </div>

        {/* Rank badge */}
        {rank !== undefined && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-xs font-bold text-white">
            #{rank}
          </div>
        )}

        {/* Source badge */}
        <div className="absolute bottom-3 right-3">
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white/80">
            {SOURCE_LABELS[attraction.source] ?? attraction.source}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Title + district */}
        <div>
          <h3 className="text-base font-bold text-white leading-tight group-hover:text-emerald-300 transition-colors duration-200">
            {attraction.name}
          </h3>
          <p className="text-xs text-white/50 mt-0.5">
            📍 {attraction.district} District
          </p>
        </div>

        {/* Fee + difficulty row */}
        <div className="flex items-center justify-between">
          <span
            className={`px-2.5 py-1 text-sm font-bold rounded-lg ${
              isFreeFee
                ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/30"
                : "text-amber-300 bg-amber-400/10 border border-amber-400/30"
            }`}
          >
            {feeDisplay === "FREE" ? "✓ FREE" : feeDisplay}
          </span>

          {attraction.difficulty_level && (
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full border ${difficultyStyle}`}
            >
              {attraction.difficulty_level}
            </span>
          )}
        </div>

        {/* Description excerpt */}
        <p className="text-xs text-white/60 leading-relaxed line-clamp-3 flex-1">
          {attraction.description}
        </p>

        {/* Similarity score bar */}
        {attraction.score !== null && attraction.score !== undefined && (
          <div className="mt-auto">
            <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
              <span>Relevance</span>
              <span>{(attraction.score * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
                style={{ width: `${Math.min(attraction.score * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
