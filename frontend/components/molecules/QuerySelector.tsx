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
  },
  {
    id: "semantic" as QueryType,
    label: "Semantic",
    icon: Search,
    desc: "Natural language descriptions",
  },
  {
    id: "image-search" as QueryType,
    label: "Image Search",
    icon: ImageIcon,
    desc: "Visual similarity via CLIP",
  },
  {
    id: "hybrid" as QueryType,
    label: "Hybrid RAG",
    icon: Sparkles,
    desc: "All sources + AI synthesis",
  },
];

export function QuerySelector({ value, onChange }: QuerySelectorProps) {
  return (
    <div>
      <label className="text-xs font-medium text-[#12543e] uppercase tracking-wider mb-2.5 block">
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
                "flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border text-left transition-colors",
                isActive
                  ? "bg-[#d4f2e6] border-[#1b8867] text-[#062b20] shadow-sm font-medium"
                  : "border-[#a9e2cc] bg-white text-[#377d64] hover:border-[#78d2b0] hover:text-[#062b20] hover:bg-[#edf8f3]"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-[#157357]" : "text-[#478f77]")} />
              <span className="text-xs font-medium leading-tight mt-0.5">
                {qt.label}
              </span>
              <span className="text-[10px] text-[#377d64] leading-tight">
                {qt.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
