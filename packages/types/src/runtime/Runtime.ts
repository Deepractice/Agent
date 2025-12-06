/**
 * Runtime - Event-driven API for managing Containers and Agents
 *
 * All operations are performed through command events.
 *
 * @example
 * ```typescript
 * const runtime = createRuntime({ persistence });
 *
 * // Using request() - convenient async/await
 * const containerRes = await runtime.request("container_create_request", {
 *   containerId: "my-container"
 * });
 *
 * const agentRes = await runtime.request("agent_run_request", {
 *   containerId: "my-container",
 *   config: { name: "Assistant" }
 * });
 *
 * // Using emitCommand/onCommand - fine-grained control
 * runtime.emitCommand("agent_receive_request", {
 *   requestId: "req_123",
 *   agentId: agentRes.data.agentId,
 *   content: "Hello!"
 * });
 *
 * // Subscribe to stream events
 * runtime.on("text_delta", (e) => console.log(e.data.text));
 *
 * // Cleanup
 * await runtime.dispose();
 * ```
 */

import type { SystemBus } from "./internal/event/SystemBus";

/**
 * Runtime interface - event-driven API for AI Agents
 *
 * Extends SystemBus to provide all event operations.
 */
export interface Runtime extends SystemBus {
  /**
   * Dispose runtime and all resources
   */
  dispose(): Promise<void>;
}

// Re-export types from SystemBus for convenience
export type { Unsubscribe, BusEventHandler } from "./internal/event/SystemBus";
