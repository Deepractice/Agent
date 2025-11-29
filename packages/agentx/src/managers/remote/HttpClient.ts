/**
 * HttpClient - ky-based HTTP client for Remote managers
 */

import ky, { type KyInstance } from "ky";

/**
 * HTTP client options
 */
export interface HttpClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * API error from server
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Create HTTP client instance
 */
export function createHttpClient(options: HttpClientOptions): KyInstance {
  return ky.create({
    prefixUrl: options.baseUrl.replace(/\/+$/, ""),
    headers: options.headers,
    timeout: options.timeout || 30000,
    hooks: {
      afterResponse: [
        async (_request, _options, response) => {
          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as {
              error?: { code?: string; message?: string; details?: unknown };
            };
            throw new ApiError(
              data.error?.code || "UNKNOWN_ERROR",
              data.error?.message || `Request failed: ${response.status}`,
              data.error?.details
            );
          }
          return response;
        },
      ],
    },
  });
}

export type { KyInstance };
