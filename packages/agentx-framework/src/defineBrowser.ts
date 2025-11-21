/**
 * defineBrowser - High-level API for creating browser agents
 *
 * @example Basic usage (SSE by default)
 * ```typescript
 * import { SSEAgent } from "@deepractice-ai/agentx-framework/browser";
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

// Main API - Pre-configured agents
export { SSEAgent } from "./browser/SSEAgent";

// Low-level APIs for advanced usage
export { SSEDriver, type SSEDriverConfig } from "./browser/SSEDriver";
