import * as React from "react";
import type { QueryType, AttractionCategory } from "@/lib/api/types";
import { QuerySelector } from "@/components/molecules/QuerySelector";
import { SearchBar } from "@/components/molecules/SearchBar";
import { FilterTags } from "@/components/molecules/FilterTags";
import { ImageUploader } from "@/components/organisms/ImageUploader";
import { Button } from "@/components/atoms/Button";
import { Sparkles, Search } from "lucide-react";

export interface SearchPanelState {
  queryType: QueryType;
  query: string;
  imageUrl: string;
  categoryFilter: AttractionCategory | "";
  topK: number;
}

interface SearchPanelProps {
  state: SearchPanelState;
  onStateChange: (state: Partial<SearchPanelState>) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const PLACEHOLDER_MAP: Record<QueryType, string> = {
  structured: "e.g. Which waterfalls have an entrance fee under $5?",
  semantic: "e.g. Serene historical locations perfect for meditation",
  "image-search": "e.g. Describe a visual scene: misty green waterfall in jungle",
  hybrid: "e.g. Best national parks for a family safari under $20",
};

export function SearchPanel({
  state,
  onStateChange,
  onSubmit,
  isLoading,
}: SearchPanelProps) {
  const { queryType, query, imageUrl, categoryFilter, topK } = state;

  const showImageInput = queryType === "image-search" || queryType === "hybrid";
  const showCategoryFilter = queryType === "semantic";
  const requiresQuery = queryType !== "image-search";

  const canSubmit = () => {
    if (queryType === "image-search") {
      return imageUrl.trim() || query.trim();
    }
    return query.trim();
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-6">
      <QuerySelector
        value={queryType}
        onChange={(val) => onStateChange({ queryType: val, query: "", imageUrl: "", categoryFilter: "" })}
      />

      {requiresQuery && (
        <SearchBar
          query={query}
          onChange={(q) => onStateChange({ query: q })}
          onSubmit={onSubmit}
          placeholder={PLACEHOLDER_MAP[queryType]}
          isHybrid={queryType === "hybrid"}
          disabled={isLoading}
        />
      )}

      {showImageInput && (
        <ImageUploader
          value={imageUrl}
          onChange={(val) => onStateChange({ imageUrl: val })}
          disabled={isLoading}
        />
      )}

      {/* When query type is image-search, the searchbar above is hidden. We need the text prompt input here, but actually we can just repurpose the SearchBar above for the text prompt, since the schema has text_prompt and image_url. For simplicity, let's just show the SearchBar above for image-search too and call it "Text Prompt". */}
      {!requiresQuery && (
         <SearchBar
         query={query}
         onChange={(q) => onStateChange({ query: q })}
         onSubmit={onSubmit}
         placeholder="e.g. Describe a visual scene: misty green waterfall in jungle"
         isHybrid={false}
         disabled={isLoading}
       />
      )}

      {showCategoryFilter && (
        <FilterTags
          value={categoryFilter}
          onChange={(c) => onStateChange({ categoryFilter: c })}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
            Results
          </label>
          <span className="text-xs font-bold text-white/70">Top {topK}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={topK}
          onChange={(e) => onStateChange({ topK: Number(e.target.value) })}
          disabled={isLoading}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-500 bg-white/10"
        />
      </div>

      <Button
        className="w-full"
        size="lg"
        variant={queryType === "hybrid" ? "primary" : "secondary"}
        onClick={onSubmit}
        isLoading={isLoading}
        disabled={!canSubmit()}
      >
        {queryType === "hybrid" ? <Sparkles className="w-4 h-4 mr-2" /> : <Search className="w-4 h-4 mr-2" />}
        {queryType === "hybrid" ? "Ask LankaGuide" : "Search"}
      </Button>
    </div>
  );
}
