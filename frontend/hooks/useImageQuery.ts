import { useState, useCallback } from "react";
import { imageService } from "@/lib/api/image";
import type { ImageSearchRequest, ImageSearchResponse } from "@/lib/api/types";

export function useImageQuery() {
  const [data, setData] = useState<ImageSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (params: ImageSearchRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await imageService.query(params);
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
