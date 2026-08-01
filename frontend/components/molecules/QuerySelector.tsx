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
    color: "blue",
  },
  {
    id: "semantic" as QueryType,
    label: "Semantic",
    icon: Search,
    desc: "Natural language descriptions",
    color: "violet",
  },
  {
    id: "image-search" as QueryType,
    label: "Image Search",
    icon: ImageIcon,
    desc: "Visual similarity via CLIP",
    color: "amber",
  },
  {
    id: "hybrid" as QueryType,
    label: "Hybrid RAG",
    icon: Sparkles,
    desc: "All sources + Gemini AI",
    color: "emerald",
  },
];

export function QuerySelector({ value, onChange }: QuerySelectorProps) {
  return (
    <div>
      <label className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3 block">
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
                "flex flex-col items-start gap-1 px-3 py-3 rounded-xl border text-left transition-all duration-200",
                isActive
                  ? `bg-${qt.color}-500/20 border-${qt.color}-500/50 text-${qt.color}-300`
                  : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/70 hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? `text-${qt.color}-400` : "text-white/40")} />
              <span className="text-xs font-semibold leading-tight mt-1">
                {qt.label}
              </span>
              <span className="text-[10px] opacity-70 leading-tight">
                {qt.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
