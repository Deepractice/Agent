/**
 * @deepractice-ai/agentx-core
 *
 * Core implementations for AgentX.
 *
 * This package provides internal implementations.
 * For public API, use @deepractice-ai/agentx instead.
 *
 * @packageDocumentation
 */

// ===== Agent Implementations =====
export {
  // Types (re-exported from @deepractice-ai/agentx-types)
  type Agent,
  type AgentContext,
  type AgentContextBase,
  type AgentDriver,
  type AgentPresenter,
  type AgentDefinition,
  type AgentLifecycle,
  type AgentEventHandler,
  type AgentEventType,
  type Unsubscribe,
  type AgentContainer,
  type AgentOutput,
  // Classes (implementations)
  AgentInstance,
  MemoryAgentContainer,
  // Functions
  generateAgentId,
  createAgentContext,
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
