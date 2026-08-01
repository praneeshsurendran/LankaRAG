import { useState, useCallback } from "react";
import { structuredService } from "@/lib/api/structured";
import type { StructuredQueryRequest, StructuredQueryResponse } from "@/lib/api/types";

export function useStructuredQuery() {
  const [data, setData] = useState<StructuredQueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (params: StructuredQueryRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await structuredService.query(params);
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
