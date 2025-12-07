/**
 * @agentxjs/runtime - Runtime for AI Agents
 *
 * @example
 * ```typescript
 * import { createRuntime, createPersistence } from "@agentxjs/runtime";
 *
 * const runtime = createRuntime({
 *   persistence: createPersistence(),
 * });
 *
 * // Use request/response pattern
 * const res = await runtime.request("container_create_request", {
 *   containerId: "my-container"
 * });
 *
 * runtime.on("text_delta", (e) => console.log(e.data.text));
 *
 * await runtime.dispose();
 * ```
 *
 * @packageDocumentation
 */

export { createRuntime, type RuntimeConfig } from "./createRuntime";
export {
  createPersistence,
  type PersistenceConfig,
  type StorageDriver,
} from "./internal/persistence";
