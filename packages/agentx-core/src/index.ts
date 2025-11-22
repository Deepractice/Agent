/**
 * @deepractice-ai/agentx-core
 *
 * Core implementations for AgentX ecosystem
 * - Agent instance (AgentInstance, AgentService)
 * - Session management (SessionStore)
 * - Agent registry (AgentRegistry)
 */

// Agent instance
export {
  AgentInstance,
  type TurnStats,
  type EventHandlers,
  type AgentInstanceInfo,
} from "./AgentInstance";

// Session management
export { SessionStore } from "./SessionStore";
export type { SessionQueryOptions } from "./SessionStore";

// Agent registry
export { AgentRegistry } from "./AgentRegistry";
export type { AgentRegistryConfig } from "./AgentRegistry";
