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
      <label className="text-xs font-medium text-[#12543e] uppercase tracking-wider mb-2 block">
        Category Filter <span className="text-[#377d64] font-normal">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-colors border",
            value === ""
              ? "bg-[#1b8867] text-white border-[#157357]"
              : "bg-white text-[#12543e] border-[#a9e2cc] hover:bg-[#d4f2e6] hover:border-[#78d2b0]"
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
              "px-2.5 py-1 text-xs font-medium rounded-md transition-colors border",
              value === cat
                ? "bg-[#1b8867] text-white border-[#157357]"
                : "bg-white text-[#12543e] border-[#a9e2cc] hover:bg-[#d4f2e6] hover:border-[#78d2b0]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
