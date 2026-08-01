/**
 * lib/api/structured.ts
 * Service for the Structured SQL Query endpoint.
 */
import { post } from "./client";
import type { StructuredQueryRequest, StructuredQueryResponse } from "./types";

export const structuredService = {
  /**
   * Converts natural language to SQL and queries PostgreSQL.
   */
  async query(body: StructuredQueryRequest): Promise<StructuredQueryResponse> {
    return post<StructuredQueryRequest, StructuredQueryResponse>(
      "/api/query/structured",
      body
    );
  },
};
