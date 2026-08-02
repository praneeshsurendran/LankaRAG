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
      <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2 block">
        Category Filter <span className="text-[var(--text-faint)] font-normal normal-case">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 border",
            value === ""
              ? "bg-[var(--primary)] text-white border-[var(--primary-dark)] shadow-sm"
              : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]"
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
              "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 border",
              value === cat
                ? "bg-[var(--primary)] text-white border-[var(--primary-dark)] shadow-sm"
                : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
