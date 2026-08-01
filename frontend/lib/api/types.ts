/**
 * lib/api/types.ts
 * Type definitions for all LankaRAG API requests, responses, and data models.
 */

// ─────────────────────────────────────────────────────────────────
//  Core data model
// ─────────────────────────────────────────────────────────────────

export interface AttractionResult {
  id: number;
  name: string;
  category: AttractionCategory;
  district: string;
  entrance_fee_usd: number | null;
  difficulty_level: DifficultyLevel | null;
  description: string;
  image_url: string | null;
  score: number | null; // similarity score (0-1) from vector search
  source: ResultSource; // data source identifier
}

export type AttractionCategory =
  | "Beaches"
  | "Waterfalls"
  | "Historical Sites"
  | "National Parks"
  | "Temples";

export type DifficultyLevel = "Easy" | "Moderate" | "Hard";

export type ResultSource = "postgres" | "pinecone-text" | "pinecone-image";

export type QueryType = "structured" | "semantic" | "image-search" | "hybrid";

// ─────────────────────────────────────────────────────────────────
//  API Request shapes
// ─────────────────────────────────────────────────────────────────

export interface StructuredQueryRequest {
  query: string;
  top_k?: number;
}

export interface SemanticQueryRequest {
  query: string;
  top_k?: number;
  category_filter?: AttractionCategory;
}

export interface ImageSearchRequest {
  image_url?: string;
  text_prompt?: string;
  top_k?: number;
}

export interface HybridQueryRequest {
  query: string;
  image_url?: string;
  top_k?: number;
}

// ─────────────────────────────────────────────────────────────────
//  API Response shapes
// ─────────────────────────────────────────────────────────────────

export interface StructuredQueryResponse {
  results: AttractionResult[];
  generated_sql: string | null;
  total: number;
}

export interface SemanticQueryResponse {
  results: AttractionResult[];
  query_embedding_model: string;
}

export interface ImageSearchResponse {
  results: AttractionResult[];
  query_type: "image" | "text-clip";
  embedding_model: string;
}

export interface HybridQueryResponse {
  ai_response: string;
  structured_results: AttractionResult[];
  semantic_results: AttractionResult[];
  image_results: AttractionResult[];
  total_sources: number;
}
