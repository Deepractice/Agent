/**
 * @deepractice-ai/agentx-core
 *
 * Core implementations for AgentX ecosystem
 * - Agent instance (AgentInstance, AgentService)
 * - Session management (SessionStore)
 * - Agent registry (AgentRegistry)
 */

// Agent instance
export type {
  AgentInstance,
  TurnStats,
  EventHandlers,
  AgentInstanceInfo,
} from "./AgentInstance";
export { AgentService } from "./AgentService";

// Session management
export { SessionStore } from "./SessionStore";
export type { SessionQueryOptions } from "./SessionStore";

// Agent registry
export { AgentRegistry } from "./AgentRegistry";
export type { AgentRegistryConfig } from "./AgentRegistry";

// EventBus implementation (moved from agentx-engine)
export { RxJSEventBus } from "./RxJSEventBus";
