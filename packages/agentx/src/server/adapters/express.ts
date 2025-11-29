/**
 * Express Adapter
 *
 * Adapts AgentXHandler to Express middleware.
 *
 * @example
 * ```typescript
 * import express from "express";
 * import { agentx } from "@deepractice-ai/agentx";
 * import { createAgentXHandler } from "@deepractice-ai/agentx/server";
 * import { toExpressHandler } from "@deepractice-ai/agentx/server/adapters/express";
 *
 * const app = express();
 * const handler = createAgentXHandler(agentx);
 *
 * app.use("/agentx", toExpressHandler(handler));
 * app.listen(3000);
 * ```
 */

import type { AgentXHandler } from "../types";

/**
 * Express-like request interface (minimal)
 */
interface ExpressRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  protocol?: string;
  hostname?: string;
  originalUrl?: string;
  // For reading body as stream
  on?: (event: string, handler: (chunk: unknown) => void) => void;
}

/**
 * Express-like response interface (minimal)
 */
interface ExpressResponse {
  status(code: number): ExpressResponse;
  set(headers: Record<string, string>): ExpressResponse;
  setHeader(name: string, value: string): void;
  write(chunk: string | Uint8Array): boolean;
  end(data?: string | Buffer): void;
  headersSent: boolean;
  flushHeaders?(): void;
}

/**
 * Express-like next function
 */
type ExpressNext = (error?: unknown) => void;

/**
 * Express request handler type
 */
export type ExpressHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNext
) => void | Promise<void>;

/**
 * Convert Express request to Web Request
 */
function toWebRequest(req: ExpressRequest): Request {
  // Build URL
  const protocol = req.protocol || "http";
  const host = req.hostname || req.headers.host || "localhost";
  const url = `${protocol}://${host}${req.originalUrl || req.url}`;

  // Build headers
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  // Build request options
  const init: RequestInit = {
    method: req.method,
    headers,
  };

  // Add body for non-GET/HEAD requests
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (req.body !== undefined) {
      // Body already parsed (e.g., by express.json())
      init.body = JSON.stringify(req.body);
    }
  }

  return new Request(url, init);
}

/**
 * Send Web Response to Express response
 */
async function sendWebResponse(res: ExpressResponse, webResponse: Response): Promise<void> {
  // Set status
  res.status(webResponse.status);

  // Set headers
  webResponse.headers.forEach((value, key) => {
    // Skip content-encoding for SSE (we handle it differently)
    if (key.toLowerCase() !== "content-encoding") {
      res.setHeader(key, value);
    }
  });

  // Check if SSE response
  const contentType = webResponse.headers.get("content-type");
  if (contentType?.includes("text/event-stream")) {
    // SSE: Stream the response
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Flush headers immediately for SSE
    if (res.flushHeaders) {
      res.flushHeaders();
    }

    const reader = webResponse.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch {
        // Connection closed
      } finally {
        reader.releaseLock();
      }
    }
    res.end();
  } else {
    // Regular response: Send body as text
    const body = await webResponse.text();
    res.end(body);
  }
}

/**
 * Convert AgentXHandler to Express middleware
 *
 * @param handler - AgentX handler (Web Standard based)
 * @returns Express middleware function
 */
export function toExpressHandler(handler: AgentXHandler): ExpressHandler {
  return async (req, res, next) => {
    try {
      const webRequest = toWebRequest(req);
      const webResponse = await handler(webRequest);
      await sendWebResponse(res, webResponse);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create Express router with AgentX handler
 *
 * This is a convenience function that wraps toExpressHandler
 * and can be used directly with app.use()
 *
 * @param handler - AgentX handler
 * @returns Express handler
 */
export function createExpressAdapter(handler: AgentXHandler): ExpressHandler {
  return toExpressHandler(handler);
}
