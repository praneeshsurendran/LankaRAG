import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind CSS classes dynamically
 * while resolving conflicts (e.g., "px-2 px-4" -> "px-4")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
