import * as React from "react";
import type { AttractionResult, QueryType } from "@/lib/api/types";
import { ResultsSection } from "@/components/organisms/ResultsSection";
import AttractionCard from "@/components/organisms/AttractionCard";
import { Badge } from "@/components/atoms/Badge";
import { Database, Search, Image as ImageIcon, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Typography } from "@/components/atoms/Typography";

export interface ResultsPanelProps {
  status: "idle" | "loading" | "success" | "error";
  queryType: QueryType;
  aiResponse: string | null;
  generatedSql: string | null;
  allResults: AttractionResult[];
  structuredResults: AttractionResult[];
  semanticResults: AttractionResult[];
  imageResults: AttractionResult[];
  totalSources: number;
  error: string | null;
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#a9e2cc] rounded-xl overflow-hidden animate-pulse shadow-sm">
      <div className="h-40 bg-[#d4f2e6]/60" />
      <div className="p-4 space-y-3">
        <div className="h-3.5 bg-[#d4f2e6] rounded w-3/4" />
        <div className="h-3 bg-[#d4f2e6] rounded w-1/2" />
        <div className="h-3 bg-[#d4f2e6] rounded w-full" />
        <div className="h-3 bg-[#d4f2e6] rounded w-5/6" />
      </div>
    </div>
  );
}

function AIResponseBlock({ text }: { text: string }) {
  const formatted = text
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-[#062b20] mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-[#062b20] mt-4 mb-1.5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-[#062b20] mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#062b20] font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-[#12543e] italic">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="flex gap-2 text-[#12543e]"><span class="text-[#1b8867] flex-shrink-0">•</span><span>$1</span></li>')
    .replace(/\n{2,}/g, '</p><p class="text-[#12543e] text-sm leading-relaxed mt-2.5">')
    .replace(/\n/g, "<br />");

  return (
    <div className="bg-white border border-[#a9e2cc] rounded-xl p-5 space-y-3 shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#a9e2cc]/80 pb-3">
        <Sparkles className="w-4 h-4 text-[#1b8867]" />
        <div>
          <Typography variant="small" className="text-[#062b20] font-semibold">LankaGuide AI Overview</Typography>
          <Typography variant="muted" className="text-[10px] text-[#377d64]">Synthesized from knowledge base</Typography>
        </div>
      </div>
      <div
        className="text-sm text-[#12543e] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: `<p class="text-[#12543e] text-sm leading-relaxed">${formatted}</p>` }}
      />
    </div>
  );
}

function SQLBlock({ sql }: { sql: string }) {
  return (
    <div className="bg-[#edf8f3] border border-[#a9e2cc] rounded-lg p-4">
      <Typography variant="small" className="text-[#12543e] font-mono mb-2 block text-xs font-semibold">
        Generated SQL Query
      </Typography>
      <pre className="text-xs text-[#062b20] font-mono overflow-x-auto whitespace-pre-wrap">
        {sql}
      </pre>
    </div>
  );
}

const QUERY_BADGE_MAP: Record<QueryType, { label: string, icon: React.ReactNode, variant: any }> = {
  structured: { label: "Structured SQL", icon: <Database className="w-3 h-3 text-[#157357]" />, variant: "structured" },
  semantic: { label: "Semantic Search", icon: <Search className="w-3 h-3 text-[#157357]" />, variant: "semantic" },
  "image-search": { label: "Image Similarity", icon: <ImageIcon className="w-3 h-3 text-[#157357]" />, variant: "image" },
  hybrid: { label: "Hybrid RAG", icon: <Sparkles className="w-3 h-3 text-[#157357]" />, variant: "hybrid" },
};

export function ResultsPanel({
  status,
  queryType,
  aiResponse,
  generatedSql,
  allResults,
  structuredResults,
  semanticResults,
  imageResults,
  totalSources,
  error,
}: ResultsPanelProps) {
  if (status === "loading") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-[#12543e]">
          <Loader2 className="animate-spin w-3.5 h-3.5 text-[#1b8867]" />
          Searching dataset...
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-[#fdeded] border border-[#f8c4c4] rounded-xl p-6 text-center">
        <AlertCircle className="w-6 h-6 text-[#8a2b2b] mx-auto mb-2" />
        <Typography variant="h4" className="text-[#8a2b2b] mb-1">Query Error</Typography>
        <Typography variant="muted" className="text-[#a84343]">{error}</Typography>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border border-[#a9e2cc] rounded-xl bg-white shadow-sm">
        <Typography variant="h3" className="text-[#062b20] mb-2">Sri Lanka Travel Search</Typography>
        <Typography variant="muted" className="max-w-sm mx-auto text-[#377d64]">
          Choose a query mode to explore attractions across beaches, waterfalls,
          historical sites, national parks, and temples.
        </Typography>
      </div>
    );
  }

  const hasResults = allResults.length > 0 || totalSources > 0;
  const badgeConfig = QUERY_BADGE_MAP[queryType];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={badgeConfig.variant}>
            {badgeConfig.icon} {badgeConfig.label}
          </Badge>
          {totalSources > 0 && (
            <span className="text-xs text-[#377d64]">
              {totalSources} source{totalSources !== 1 ? "s" : ""} retrieved
            </span>
          )}
        </div>
      </div>

      {aiResponse && <AIResponseBlock text={aiResponse} />}
      {generatedSql && <SQLBlock sql={generatedSql} />}

      {!hasResults && (
        <div className="text-center py-12 border border-[#a9e2cc] rounded-xl bg-white shadow-sm">
          <Search className="w-6 h-6 text-[#377d64] mx-auto mb-2" />
          <Typography variant="muted" className="text-[#377d64]">No attractions matched your query.</Typography>
        </div>
      )}

      {queryType === "hybrid" ? (
        <div className="space-y-6">
          <ResultsSection title="Structured Database Matches" icon={<Database className="w-4 h-4 text-[#157357]" />} items={structuredResults} colorClass="text-[#062b20]" />
          <ResultsSection title="Semantic Text Matches" icon={<Search className="w-4 h-4 text-[#157357]" />} items={semanticResults} colorClass="text-[#062b20]" />
          <ResultsSection title="Visual Image Matches" icon={<ImageIcon className="w-4 h-4 text-[#157357]" />} items={imageResults} colorClass="text-[#062b20]" />
        </div>
      ) : (
        allResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {allResults.map((item, i) => (
              <AttractionCard key={`${item.source}-${item.id}`} attraction={item} rank={i + 1} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
