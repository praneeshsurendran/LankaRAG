import * as React from "react";
import type { AttractionCategory } from "@/lib/api/types";
import { cn } from "@/utils/cn";

export interface FilterTagsProps {
  value: AttractionCategory | "";
  onChange: (value: AttractionCategory | "") => void;
}

const CATEGORIES: AttractionCategory[] = [
  "Beaches",
  "Waterfalls",
  "Historical Sites",
  "National Parks",
  "Temples",
];

export function FilterTags({ value, onChange }: FilterTagsProps) {
  return (
    <div>
      <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-2 block">
        Category Filter <span className="text-white/25">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full transition-colors border",
            value === ""
              ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
              : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80"
          )}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full transition-colors border",
              value === cat
                ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80"
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
