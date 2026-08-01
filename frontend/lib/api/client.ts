/**
 * lib/api/client.ts
 * Base HTTP client configured with the API base URL and unified error handling.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Unified error class for API errors.
 */
export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Generic JSON POST request wrapper.
 */
export async function post<TReq, TRes>(
  endpoint: string,
  body: TReq
): Promise<TRes> {
  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // Ignore if not JSON
    }
    const message =
      errorData?.detail || `Request failed: ${response.status} ${response.statusText}`;
    throw new ApiError(message, response.status, errorData);
  }

  return response.json() as Promise<TRes>;
}
