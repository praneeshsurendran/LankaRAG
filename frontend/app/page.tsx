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

const INITIAL_SEARCH_STATE: SearchPanelState = {
  queryType: "hybrid",
  query: "",
  imageUrl: "",
  categoryFilter: "",
  topK: 5,
};

const STATS = [
  { label: "Beaches", count: 5, emoji: "🏖️", color: "text-cyan-400" },
  { label: "Waterfalls", count: 5, emoji: "💧", color: "text-blue-400" },
  { label: "Historical", count: 5, emoji: "🏛️", color: "text-amber-400" },
  { label: "Parks", count: 5, emoji: "🦁", color: "text-emerald-400" },
  { label: "Temples", count: 5, emoji: "🕌", color: "text-rose-400" },
];

function BackgroundDecor() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-teal-500/5 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-500/3 blur-3xl" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(rgba(16,185,129,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}

const PIPELINE_BADGES = [
  { icon: "🗄️", label: "PostgreSQL" },
  { icon: "🧠", label: "Pinecone" },
  { icon: "🖼️", label: "CLIP Vision" },
  { icon: "✨", label: "Gemini AI" },
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
    <>
      <BackgroundDecor />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
                🌴
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-none">
                  Lanka<span className="gradient-text-emerald">RAG</span>
                </h1>
                <p className="text-[10px] text-white/40 leading-none mt-0.5">
                  Multimodal AI Travel Guide
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              {PIPELINE_BADGES.map((b) => (
                <span key={b.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/50">
                  {b.icon} {b.label}
                </span>
              ))}
            </div>
          </div>
        </header>

        <section className="border-b border-white/5 bg-gradient-to-b from-emerald-500/5 to-transparent">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              25 attractions · 5 categories · 4 query pipelines
            </div>

            <Typography variant="h1" className="mb-3 leading-tight">
              Your Intelligent Guide to <span className="gradient-text-emerald">Sri Lanka</span>
            </Typography>
            <Typography variant="muted" className="max-w-xl mx-auto">
              Search by structured facts, semantic meaning, visual similarity,
              or let the AI synthesize everything for you.
            </Typography>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
              {STATS.map((s) => (
                <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                  <span>{s.emoji}</span>
                  <span className={`text-sm font-semibold ${s.color}`}>{s.count}</span>
                  <span className="text-xs text-white/40">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
            <div className="lg:sticky lg:top-20">
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
    </>
  );
}
