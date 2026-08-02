/**
 * lib/api/semantic.ts
 * Service for the Semantic Vector Search endpoint.
 */
import { post } from "./client";
import type { SemanticQueryRequest, SemanticQueryResponse } from "./types";

export const semanticService = {
  /**
   * Encodes query with sentence-transformers and searches Pinecone text index.
   */
  async query(body: SemanticQueryRequest): Promise<SemanticQueryResponse> {
    return post<SemanticQueryRequest, SemanticQueryResponse>(
      "/api/v1/query/semantic",
      body
    );
  },
};
