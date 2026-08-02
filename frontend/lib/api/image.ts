/**
 * lib/api/image.ts
 * Service for the CLIP Image Similarity endpoint.
 */
import { post } from "./client";
import type { ImageSearchRequest, ImageSearchResponse } from "./types";

export const imageService = {
  /**
   * Uses CLIP to encode an image URL or text prompt and searches Pinecone image index.
   * Note: The current backend only supports public `image_url` strings. 
   * If a local file is uploaded via the drag-and-drop organism, we assume it is
   * mapped to a data URL, but the backend requires a public URL or handles the base64.
   * For the scope of this refactor, we maintain the contract of `image_url`.
   */
  async query(body: ImageSearchRequest): Promise<ImageSearchResponse> {
    return post<ImageSearchRequest, ImageSearchResponse>(
      "/api/v1/query/image-search",
      body
    );
  },
};
