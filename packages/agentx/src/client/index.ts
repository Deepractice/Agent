/**
 * AgentX Client Module (Browser)
 *
 * Provides SSERuntime for browser to connect to remote AgentX servers.
 * Uses the same API as server-side (createAgentX), enabling unified code.
 *
 * @example
 * ```typescript
 * import { createAgentX, defineAgent } from "@deepractice-ai/agentx";
 * import { createSSERuntime } from "@deepractice-ai/agentx/client";
 *
 * // Define agent (same as server-side)
 * const MyAgent = defineAgent({
 *   name: "Assistant",
 *   systemPrompt: "You are a helpful assistant",
 * });
 *
 * // Create runtime for browser
 * const runtime = createSSERuntime({
 *   serverUrl: "http://localhost:5200/agentx",
 * });
 *
 * // Use unified API
 * const agentx = createAgentX(runtime);
 * const agent = agentx.agents.create(MyAgent);
 *
 * // Subscribe to events
 * agent.on("assistant_message", (event) => {
 *   console.log(event.data.content);
 * });
 *
 * await agent.receive("Hello!");
 * ```
 *
 * @packageDocumentation
 */

// Types
export type { ConnectionState } from "./types";

// SSE Runtime (primary API for browser)
export { createSSERuntime, SSERuntime, type SSERuntimeConfig } from "./SSERuntime";

// SSE Driver (internal, used by SSERuntime)
export { createSSEDriver, type SSEDriverConfig } from "./SSEDriver";
