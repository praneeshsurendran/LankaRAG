import { useState, useCallback } from "react";
import { semanticService } from "@/lib/api/semantic";
import type { SemanticQueryRequest, SemanticQueryResponse } from "@/lib/api/types";

export function useSemanticQuery() {
  const [data, setData] = useState<SemanticQueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (params: SemanticQueryRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await semanticService.query(params);
      setData(response);
      return response;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { execute, data, isLoading, error, reset };
}
