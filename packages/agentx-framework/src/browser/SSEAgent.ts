/**
 * SSEAgent - Pre-configured Agent using SSE Driver
 *
 * Browser-side Agent that communicates with server via Server-Sent Events.
 *
 * @example
 * ```typescript
 * import { SSEAgent } from "@deepractice-ai/agentx-sdk-browser";
 *
 * const agent = SSEAgent.create({
 *   serverUrl: "http://localhost:5200",
 *   sessionId: "my-session",
 * });
 *
 * await agent.initialize();
 * await agent.send("Hello!");
 * ```
 */

import { defineAgent } from "~/defineAgent";
import { defineConfig } from "~/defineConfig";
import { SSEDriver } from "~/browser/SSEDriver";

/**
 * SSEAgent - Pre-configured SSE Agent for browser
 */
export const SSEAgent = defineAgent({
  name: "SSE",
  driver: SSEDriver,
  config: defineConfig({
    serverUrl: { type: "string", default: "http://localhost:5200" },
    sessionId: { type: "string", required: false },
  }),
});
