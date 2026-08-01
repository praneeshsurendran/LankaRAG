import { useState, useCallback } from "react";
import { hybridService } from "@/lib/api/hybrid";
import type { HybridQueryRequest, HybridQueryResponse } from "@/lib/api/types";

export function useHybridQuery() {
  const [data, setData] = useState<HybridQueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (params: HybridQueryRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await hybridService.query(params);
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
