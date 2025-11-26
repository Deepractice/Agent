/**
 * @deepractice-ai/agentx-core
 *
 * Core package for AgentX - Agent and Session management.
 *
 * Architecture (like Spring):
 * - AgentDefinition: Bean definition (static config)
 * - AgentConfig: Runtime configuration
 * - Agent: Bean instance (runtime object)
 * - AgentContainer: ApplicationContext (instance management)
 *
 * @example
 * ```typescript
 * import {
 *   initializeCore,
 *   createAgent,
 *   getAgent,
 *   destroyAgent,
 * } from '@deepractice-ai/agentx-core';
 *
 * // Initialize with engine (once per process)
 * initializeCore(engine);
 *
 * // Create agent
 * const agent = createAgent(
 *   { name: "Claude", driver: claudeDriver },
 *   { model: "claude-3-5-sonnet" }
 * );
 *
 * // Use agent
 * agent.on((event) => console.log(event));
 * await agent.receive("Hello!");
 *
 * // Get existing agent
 * const agent2 = getAgent(agent.agentId);
 *
 * // Clean up
 * await destroyAgent(agent.agentId);
 * ```
 *
 * @packageDocumentation
 */

// ===== Context (Process-level singleton) =====
export {
  initializeCore,
  getContext,
  isInitialized,
  resetContext,
  type CoreContext,
} from "./context";

// ===== Agent =====
export {
  // Types
  type AgentDefinition,
  type AgentConfig,
  type AgentLifecycle,
  type AgentEventHandler,
  type Unsubscribe,
  type AgentContainer,
  // Classes
  Agent,
  MemoryAgentContainer,
  // Functions
  generateAgentId,
} from "./agent";

// ===== Session =====
export {
  // Types
  type Message,
  type MessageRole,
  type Session,
  type SessionRepository,
  type SessionQueryOptions,
  // Classes
  MemorySessionRepository,
  // Functions
  createMessage,
  fromTypesMessage,
  generateSessionId,
  createSession,
  associateAgent,
  disassociateAgent,
  addMessage,
  getMessagesByAgent,
  clearMessages,
} from "./session";

// ===== Functional API =====
export { createAgent } from "./createAgent";
export { getAgent, hasAgent, getAllAgentIds, getAgentCount } from "./getAgent";
export { destroyAgent, destroyAllAgents } from "./destroyAgent";
