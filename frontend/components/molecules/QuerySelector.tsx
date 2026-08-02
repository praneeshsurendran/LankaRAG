import * as React from "react";
import type { QueryType } from "@/lib/api/types";
import { cn } from "@/utils/cn";
import { Database, Search, Image as ImageIcon, Sparkles } from "lucide-react";

export interface QuerySelectorProps {
  value: QueryType;
  onChange: (value: QueryType) => void;
}

const QUERY_TYPES = [
  {
    id: "structured" as QueryType,
    label: "Structured",
    icon: Database,
    desc: "Filter by fee, category, district",
    color: "var(--structured-hue)",
    activeBg: "bg-[var(--structured-light)]",
    activeBorder: "border-[var(--structured-hue)]",
    activeText: "text-[#1e40af]",
    activeIcon: "text-[var(--structured-hue)]",
  },
  {
    id: "semantic" as QueryType,
    label: "Semantic",
    icon: Search,
    desc: "Natural language descriptions",
    color: "var(--semantic-hue)",
    activeBg: "bg-[var(--semantic-light)]",
    activeBorder: "border-[var(--semantic-hue)]",
    activeText: "text-[#5b21b6]",
    activeIcon: "text-[var(--semantic-hue)]",
  },
  {
    id: "image-search" as QueryType,
    label: "Image Search",
    icon: ImageIcon,
    desc: "Visual similarity via CLIP",
    color: "var(--image-hue)",
    activeBg: "bg-[var(--image-light)]",
    activeBorder: "border-[var(--image-hue)]",
    activeText: "text-[#c2410c]",
    activeIcon: "text-[var(--image-hue)]",
  },
  {
    id: "hybrid" as QueryType,
    label: "Hybrid RAG",
    icon: Sparkles,
    desc: "All sources + AI synthesis",
    color: "var(--hybrid-hue)",
    activeBg: "bg-[var(--hybrid-light)]",
    activeBorder: "border-[var(--hybrid-hue)]",
    activeText: "text-[#a16207]",
    activeIcon: "text-[var(--hybrid-hue)]",
  },
];

export function QuerySelector({ value, onChange }: QuerySelectorProps) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2.5 block">
        Query Mode
      </label>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {QUERY_TYPES.map((qt) => {
          const Icon = qt.icon;
          const isActive = value === qt.id;

          return (
            <button
              key={qt.id}
              type="button"
              onClick={() => onChange(qt.id)}
              className={cn(
                "relative flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all duration-200",
                isActive
                  ? cn(qt.activeBg, qt.activeBorder, qt.activeText, "shadow-sm font-medium border-l-[3px]")
                  : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? qt.activeIcon : "text-[var(--text-faint)]")} />
              <span className="text-xs font-medium leading-tight mt-0.5">
                {qt.label}
              </span>
              <span className={cn("text-[10px] leading-tight", isActive ? "opacity-70" : "text-[var(--text-faint)]")}>
                {qt.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
