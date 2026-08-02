import * as React from "react";
import AttractionCard from "@/components/organisms/AttractionCard";
import type { AttractionResult } from "@/lib/api/types";
import { cn } from "@/utils/cn";

export interface ResultsSectionProps {
  title: string;
  icon: string | React.ReactNode;
  items: AttractionResult[];
  colorClass: string;
  className?: string;
}

export function ResultsSection({ title, icon, items, colorClass, className }: ResultsSectionProps) {
  if (!items.length) return null;

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2.5">
        <span className="text-lg flex items-center justify-center">{icon}</span>
        <h3 className={cn("text-sm font-semibold font-[family-name:var(--font-outfit)]", colorClass)}>{title}</h3>
        <span className="text-xs text-[var(--text-faint)]">({items.length} results)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <AttractionCard key={`${item.source}-${item.id}`} attraction={item} rank={i + 1} index={i} />
        ))}
      </div>
    </section>
  );
}
