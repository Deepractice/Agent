/**
 * agentxjs - Unified API for AI Agents
 *
 * @example
 * ```typescript
 * // Local mode
 * const agentx = await createAgentX();
 *
 * // Local mode with server
 * const agentx = await createAgentX({ apiKey: "sk-..." });
 * await agentx.listen(5200);
 *
 * // Remote mode
 * const agentx = await createAgentX({ server: "ws://localhost:5200" });
 *
 * // Same API for both modes!
 * const res = await agentx.request("container_create_request", {
 *   containerId: "my-container"
 * });
 *
 * agentx.on("text_delta", (e) => console.log(e.data.text));
 * ```
 *
 * @packageDocumentation
 */

export { createAgentX } from "./createAgentX";

// Re-export types
export type { AgentX, AgentXConfig, Unsubscribe } from "@agentxjs/types/agentx";
