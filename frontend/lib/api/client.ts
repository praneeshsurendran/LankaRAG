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
  public data: unknown;

  constructor(message: string, status: number, data?: unknown) {
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
    let errorData: unknown = null;
    try {
      errorData = await response.json();
    } catch {
      // Ignore if not JSON
    }
    const fallback = `Request failed: ${response.status} ${response.statusText}`;
    const detail =
      typeof errorData === "object" && errorData !== null && "detail" in errorData
        ? errorData.detail
        : undefined;
    const validationMessages = Array.isArray(detail)
      ? detail.flatMap((item: unknown) =>
          typeof item === "object" && item !== null && "msg" in item && typeof item.msg === "string"
            ? [item.msg]
            : []
        )
      : [];
    const message =
      typeof detail === "string" && detail
        ? detail
        : validationMessages.join("; ") || fallback;
    throw new ApiError(message, response.status, errorData);
  }

  return response.json() as Promise<TRes>;
}
