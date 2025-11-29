/**
 * AgentPresenter - Output adapter interface
 *
 * AgentPresenter receives agent outputs and presents them to external systems.
 * Examples: SSE streaming, WebSocket, logging, persistence.
 *
 * @example
 * ```typescript
 * const ssePresenter: AgentPresenter = {
 *   name: "SSEPresenter",
 *   description: "Forwards stream events via Server-Sent Events",
 *
 *   present(agentId, output) {
 *     if (output.type === "text_delta") {
 *       sseConnection.send(agentId, output);
 *     }
 *   },
 * };
 * ```
 */

import type { AgentOutput } from "./AgentOutput";

/**
 * AgentPresenter interface
 *
 * A named, self-describing presenter that receives agent outputs
 * and presents them to external systems.
 */
export interface AgentPresenter {
  /**
   * Presenter name (for identification and logging)
   */
  readonly name: string;

  /**
   * Optional description
   */
  readonly description?: string;

  /**
   * Present an agent output
   *
   * @param agentId - The agent ID
   * @param output - The output to present
   */
  present(agentId: string, output: AgentOutput): void | Promise<void>;
}
