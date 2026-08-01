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
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden animate-pulse">
      <div className="h-44 bg-white/10" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/10 rounded-full w-3/4" />
        <div className="h-3 bg-white/10 rounded-full w-1/2" />
        <div className="h-3 bg-white/10 rounded-full w-full" />
        <div className="h-3 bg-white/10 rounded-full w-5/6" />
      </div>
    </div>
  );
}

function AIResponseBlock({ text }: { text: string }) {
  const formatted = text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-emerald-300 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-emerald-200 mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-emerald-100 mt-5 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-white/80 italic">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="flex gap-2 text-white/75"><span class="text-emerald-400 mt-0.5 flex-shrink-0">▸</span><span>$1</span></li>')
    .replace(/\n{2,}/g, '</p><p class="text-white/70 text-sm leading-relaxed mt-3">')
    .replace(/\n/g, "<br />");

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <Typography variant="small" className="text-emerald-300">LankaGuide AI</Typography>
          <Typography variant="muted" className="text-[10px]">Powered by Google Gemini</Typography>
        </div>
      </div>
      <div
        className="text-sm text-white/70 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: `<p class="text-white/70 text-sm leading-relaxed">${formatted}</p>` }}
      />
    </div>
  );
}

function SQLBlock({ sql }: { sql: string }) {
  return (
    <div className="bg-slate-900/80 border border-blue-500/20 rounded-xl p-4">
      <Typography variant="small" className="text-blue-400 font-mono mb-2 block">
        Generated SQL
      </Typography>
      <pre className="text-xs text-blue-300 font-mono overflow-x-auto whitespace-pre-wrap">
        {sql}
      </pre>
    </div>
  );
}

const QUERY_BADGE_MAP: Record<QueryType, { label: string, icon: React.ReactNode, variant: any }> = {
  structured: { label: "Structured SQL", icon: <Database className="w-3 h-3" />, variant: "structured" },
  semantic: { label: "Semantic Search", icon: <Search className="w-3 h-3" />, variant: "semantic" },
  "image-search": { label: "Image Similarity", icon: <ImageIcon className="w-3 h-3" />, variant: "image" },
  hybrid: { label: "Hybrid RAG", icon: <Sparkles className="w-3 h-3" />, variant: "hybrid" },
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
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 className="animate-spin w-4 h-4" />
          Searching across data sources...
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <Typography variant="h4" className="text-red-400 mb-1">Query Failed</Typography>
        <Typography variant="muted">{error}</Typography>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">🌴</div>
        <Typography variant="h2" className="text-white/60 mb-2">Discover Sri Lanka</Typography>
        <Typography variant="muted" className="max-w-sm mx-auto mb-6">
          Select a query mode and ask anything about Sri Lanka&apos;s beaches,
          waterfalls, temples, historical sites, and national parks.
        </Typography>
      </div>
    );
  }

  const hasResults = allResults.length > 0 || totalSources > 0;
  const badgeConfig = QUERY_BADGE_MAP[queryType];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={badgeConfig.variant} pulse>
            {badgeConfig.icon} {badgeConfig.label}
          </Badge>
          {totalSources > 0 && (
            <span className="text-xs text-white/30">
              {totalSources} source{totalSources !== 1 ? "s" : ""} retrieved
            </span>
          )}
        </div>
      </div>

      {aiResponse && <AIResponseBlock text={aiResponse} />}
      {generatedSql && <SQLBlock sql={generatedSql} />}

      {!hasResults && (
        <div className="text-center py-12">
          <Search className="w-8 h-8 text-white/30 mx-auto mb-3" />
          <Typography variant="muted">No attractions found for your query.</Typography>
        </div>
      )}

      {queryType === "hybrid" ? (
        <div className="space-y-8">
          <ResultsSection title="Structured Results" icon={<Database className="w-5 h-5 text-blue-400" />} items={structuredResults} colorClass="text-blue-300" />
          <ResultsSection title="Semantic Matches" icon={<Search className="w-5 h-5 text-violet-400" />} items={semanticResults} colorClass="text-violet-300" />
          <ResultsSection title="Visual Matches" icon={<ImageIcon className="w-5 h-5 text-amber-400" />} items={imageResults} colorClass="text-amber-300" />
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
