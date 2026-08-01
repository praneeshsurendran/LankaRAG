/**
 * lib/api/hybrid.ts
 * Service for the Hybrid RAG endpoint.
 */
import { post } from "./client";
import type { HybridQueryRequest, HybridQueryResponse } from "./types";

export const hybridService = {
  /**
   * Runs all 3 retrieval pipelines and synthesizes a response using Gemini.
   */
  async query(body: HybridQueryRequest): Promise<HybridQueryResponse> {
    return post<HybridQueryRequest, HybridQueryResponse>(
      "/api/query/hybrid",
      body
    );
  },
};
