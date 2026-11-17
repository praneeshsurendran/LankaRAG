import * as React from "react";
import type { AttractionResult, QueryType } from "@/lib/api/types";
import { ResultsSection } from "@/components/organisms/ResultsSection";
import AttractionCard from "@/components/organisms/AttractionCard";
import { Badge } from "@/components/atoms/Badge";
import { Database, Search, Image as ImageIcon, Sparkles, Loader2, AlertCircle, Compass } from "lucide-react";
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
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="h-44 animate-shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-4 animate-shimmer rounded-md w-3/4" />
        <div className="h-3 animate-shimmer rounded-md w-1/2" />
        <div className="h-3 animate-shimmer rounded-md w-full" />
        <div className="h-3 animate-shimmer rounded-md w-5/6" />
      </div>
    </div>
  );
}

function AIResponseBlock({ text }: { text: string }) {
  const formatted = text
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-[var(--text-primary)] mt-4 mb-1 font-[family-name:var(--font-outfit)]">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-[var(--text-primary)] mt-4 mb-1.5 font-[family-name:var(--font-outfit)]">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-[var(--text-primary)] mt-4 mb-2 font-[family-name:var(--font-outfit)]">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text-primary)] font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-[var(--text-secondary)] italic">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="flex gap-2.5 text-[var(--text-secondary)]"><span class="text-[var(--primary)] flex-shrink-0 mt-0.5">•</span><span>$1</span></li>')
    .replace(/\n{2,}/g, '</p><p class="text-[var(--text-secondary)] text-sm leading-relaxed mt-2.5">')
    .replace(/\n/g, "<br />");

  return (
    <div className="card-elevated rounded-2xl overflow-hidden animate-slide-up">
      {/* Header with gradient accent */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] bg-gradient-to-r from-[var(--hybrid-light)] to-[var(--bg-surface)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--hybrid-light)] border border-[var(--hybrid-border)] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[var(--hybrid-hue)]" />
        </div>
        <div>
          <Typography variant="small" className="text-[var(--text-primary)] font-semibold">LankaGuide AI Overview</Typography>
          <Typography variant="muted" className="text-[11px]">Synthesized from knowledge base</Typography>
        </div>
      </div>
      {/* Body */}
      <div
        className="px-5 py-4 text-sm text-[var(--text-secondary)] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: `<p class="text-[var(--text-secondary)] text-sm leading-relaxed">${formatted}</p>` }}
      />
    </div>
  );
}

function SQLBlock({ sql }: { sql: string }) {
  return (
    <div className="code-surface rounded-xl p-4 animate-slide-up">
      <Typography variant="small" className="text-[#94a3b8] font-mono mb-2.5 block text-[11px] font-semibold uppercase tracking-widest">
        Generated SQL
      </Typography>
      <pre className="text-sm text-[#e2e8f0] font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {sql}
      </pre>
    </div>
  );
}

const QUERY_BADGE_MAP: Record<QueryType, { label: string, icon: React.ReactNode, variant: "structured" | "semantic" | "image" | "hybrid" }> = {
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
      <div className="space-y-5">
        <div className="flex items-center gap-2.5 text-sm text-[var(--text-muted)]">
          <Loader2 className="animate-spin w-4 h-4 text-[var(--primary)]" />
          <span>Searching across pipelines…</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card-elevated rounded-2xl p-8 text-center animate-slide-up">
        <div className="w-12 h-12 rounded-2xl bg-[var(--danger-light)] border border-[var(--danger-border)] flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-[var(--danger)]" />
        </div>
        <Typography variant="h4" className="text-[var(--danger)] mb-1">Query Error</Typography>
        <Typography variant="muted" className="max-w-md mx-auto">{error}</Typography>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center card-elevated rounded-2xl animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-[var(--primary-light)] border border-[var(--primary)]/20 flex items-center justify-center mb-5">
          <Compass className="w-8 h-8 text-[var(--primary)]" />
        </div>
        <Typography variant="h3" className="mb-2">Explore Sri Lanka</Typography>
        <Typography variant="muted" className="max-w-sm mx-auto leading-relaxed">
          Choose a query mode and search to discover attractions across
          beaches, waterfalls, historical sites, national parks, and temples.
        </Typography>
      </div>
    );
  }

  const hasResults = allResults.length > 0 || totalSources > 0;
  const badgeConfig = QUERY_BADGE_MAP[queryType];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <Badge variant={badgeConfig.variant}>
            {badgeConfig.icon} {badgeConfig.label}
          </Badge>
          {totalSources > 0 && (
            <span className="text-sm text-[var(--text-muted)]">
              {totalSources} source{totalSources !== 1 ? "s" : ""} retrieved
            </span>
          )}
        </div>
      </div>

      {aiResponse && <AIResponseBlock text={aiResponse} />}
      {generatedSql && <SQLBlock sql={generatedSql} />}

      {!hasResults && (
        <div className="text-center py-16 card-elevated rounded-2xl animate-slide-up">
          <Search className="w-8 h-8 text-[var(--text-faint)] mx-auto mb-3" />
          <Typography variant="muted">No attractions matched your query.</Typography>
        </div>
      )}

      {queryType === "hybrid" ? (
        <div className="space-y-8">
          <ResultsSection title="Structured Database Matches" icon={<Database className="w-4 h-4 text-[var(--structured-hue)]" />} items={structuredResults} colorClass="text-[var(--text-primary)]" />
          <ResultsSection title="Semantic Text Matches" icon={<Search className="w-4 h-4 text-[var(--semantic-hue)]" />} items={semanticResults} colorClass="text-[var(--text-primary)]" />
          <ResultsSection title="Visual Image Matches" icon={<ImageIcon className="w-4 h-4 text-[var(--image-hue)]" />} items={imageResults} colorClass="text-[var(--text-primary)]" />
        </div>
      ) : (
        allResults.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {allResults.map((item, i) => (
              <AttractionCard key={`${item.source}-${item.id}`} attraction={item} rank={i + 1} index={i} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
