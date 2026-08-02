"use client";

import { useState, useCallback } from "react";
import { SearchPanel, type SearchPanelState } from "@/components/organisms/SearchPanel";
import { ResultsPanel } from "@/components/organisms/ResultsPanel";
import { useStructuredQuery } from "@/hooks/useStructuredQuery";
import { useSemanticQuery } from "@/hooks/useSemanticQuery";
import { useImageQuery } from "@/hooks/useImageQuery";
import { useHybridQuery } from "@/hooks/useHybridQuery";
import type { QueryType } from "@/lib/api/types";
import { Typography } from "@/components/atoms/Typography";
import {
  Palmtree,
  Waves,
  Droplets,
  Landmark,
  TreePine,
  Database,
  Brain,
  Eye,
  Sparkles,
} from "lucide-react";

const INITIAL_SEARCH_STATE: SearchPanelState = {
  queryType: "hybrid",
  query: "",
  imageUrl: "",
  categoryFilter: "",
  topK: 5,
};

const STATS = [
  { label: "Beaches", count: 5, icon: Waves },
  { label: "Waterfalls", count: 5, icon: Droplets },
  { label: "Historical", count: 5, icon: Landmark },
  { label: "Parks", count: 5, icon: TreePine },
  { label: "Temples", count: 5, icon: Palmtree },
];

const PIPELINE_BADGES = [
  { icon: Database, label: "PostgreSQL" },
  { icon: Brain, label: "Pinecone" },
  { icon: Eye, label: "CLIP Vision" },
  { icon: Sparkles, label: "Gemini AI" },
];

export default function Home() {
  const [searchState, setSearchState] = useState<SearchPanelState>(INITIAL_SEARCH_STATE);
  const [activeQueryType, setActiveQueryType] = useState<QueryType>("hybrid");
  const [overallStatus, setOverallStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const structuredQ = useStructuredQuery();
  const semanticQ = useSemanticQuery();
  const imageQ = useImageQuery();
  const hybridQ = useHybridQuery();

  const handleStateChange = useCallback((newState: Partial<SearchPanelState>) => {
    setSearchState((prev) => ({ ...prev, ...newState }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setActiveQueryType(searchState.queryType);
    setOverallStatus("loading");
    
    // Reset all queries so we only show fresh data from the active one
    structuredQ.reset();
    semanticQ.reset();
    imageQ.reset();
    hybridQ.reset();

    try {
      switch (searchState.queryType) {
        case "structured":
          await structuredQ.execute({ query: searchState.query, top_k: searchState.topK });
          break;
        case "semantic":
          await semanticQ.execute({
            query: searchState.query,
            top_k: searchState.topK,
            category_filter: searchState.categoryFilter || undefined,
          });
          break;
        case "image-search":
          await imageQ.execute({
            image_url: searchState.imageUrl.startsWith("data:image") ? searchState.imageUrl : searchState.imageUrl || undefined,
            text_prompt: searchState.query || undefined,
            top_k: searchState.topK,
          });
          break;
        case "hybrid":
          await hybridQ.execute({
            query: searchState.query,
            image_url: searchState.imageUrl || undefined,
            top_k: searchState.topK,
          });
          break;
      }
      setOverallStatus("success");
    } catch (e) {
      setOverallStatus("error");
    }
  }, [searchState, structuredQ, semanticQ, imageQ, hybridQ]);

  const isLoading = 
    structuredQ.isLoading || semanticQ.isLoading || imageQ.isLoading || hybridQ.isLoading;

  // Derive consolidated results for ResultsPanel based on active hook
  let consolidated = {
    aiResponse: null as string | null,
    generatedSql: null as string | null,
    allResults: [] as any[],
    structuredResults: [] as any[],
    semanticResults: [] as any[],
    imageResults: [] as any[],
    totalSources: 0,
    error: null as string | null,
  };

  if (activeQueryType === "structured" && structuredQ.data) {
    consolidated.generatedSql = structuredQ.data.generated_sql;
    consolidated.allResults = structuredQ.data.results;
    consolidated.totalSources = structuredQ.data.total;
  } else if (activeQueryType === "semantic" && semanticQ.data) {
    consolidated.allResults = semanticQ.data.results;
    consolidated.totalSources = semanticQ.data.results.length;
  } else if (activeQueryType === "image-search" && imageQ.data) {
    consolidated.allResults = imageQ.data.results;
    consolidated.totalSources = imageQ.data.results.length;
  } else if (activeQueryType === "hybrid" && hybridQ.data) {
    const data = hybridQ.data;
    consolidated.aiResponse = data.ai_response;
    consolidated.structuredResults = data.structured_results;
    consolidated.semanticResults = data.semantic_results;
    consolidated.imageResults = data.image_results;
    consolidated.allResults = [
      ...data.structured_results,
      ...data.semantic_results,
      ...data.image_results,
    ];
    consolidated.totalSources = data.total_sources;
  }

  const activeError = structuredQ.error || semanticQ.error || imageQ.error || hybridQ.error;

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Gradient mesh background — CSS only, no blob divs */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(42,157,143,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 100% 50%, rgba(232,145,58,0.04) 0%, transparent 50%),
            radial-gradient(ellipse 50% 60% at 0% 80%, rgba(42,157,143,0.04) 0%, transparent 50%),
            var(--bg-base)
          `,
        }}
      />

      {/* ─── Header ─── */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-surface)]/80 sticky top-0 z-20 backdrop-blur-xl">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-sm">
              <Palmtree className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[var(--text-primary)] leading-none font-[family-name:var(--font-outfit)]">
                Lanka<span className="text-[var(--primary)]">RAG</span>
              </h1>
              <p className="text-[10px] text-[var(--text-muted)] leading-none mt-0.5">
                Multimodal AI Travel Guide
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            {PIPELINE_BADGES.map((b) => {
              const Icon = b.icon;
              return (
                <span key={b.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[var(--text-muted)] font-medium">
                  <Icon className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                  {b.label}
                </span>
              );
            })}
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="border-b border-[var(--border)]">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary-light)] border border-[var(--primary)]/15 text-xs text-[var(--primary-dark)] font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse-glow" />
            25 attractions · 5 categories · 4 query pipelines
          </div>

          <Typography variant="h1" className="mb-4 leading-[1.15]">
            Your Intelligent Guide to{" "}
            <span className="text-[var(--primary)] relative">
              Sri Lanka
            </span>
          </Typography>
          <Typography variant="muted" className="max-w-lg mx-auto text-base leading-relaxed">
            Search by structured facts, semantic meaning, visual similarity,
            or let the AI synthesize everything for you.
          </Typography>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-8">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-md hover:border-[var(--border-strong)] transition-all duration-200">
                  <Icon className="w-4 h-4 text-[var(--primary)]" />
                  <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{s.count}</span>
                  <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Main Content ─── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
          <div className="lg:sticky lg:top-[72px]">
            <SearchPanel
              state={searchState}
              onStateChange={handleStateChange}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>

          <div>
            <ResultsPanel
              status={overallStatus}
              queryType={activeQueryType}
              error={activeError}
              aiResponse={consolidated.aiResponse}
              generatedSql={consolidated.generatedSql}
              allResults={consolidated.allResults}
              structuredResults={consolidated.structuredResults}
              semanticResults={consolidated.semanticResults}
              imageResults={consolidated.imageResults}
              totalSources={consolidated.totalSources}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
