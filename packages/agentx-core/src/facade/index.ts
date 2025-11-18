/**
 * Facade Layer
 *
 * System-internal API for agentx-core.
 * This layer is used by:
 * - agentx-framework (exposes to external users)
 * - Other agentx-* packages (internal usage)
 *
 * NOT exposed directly to end users.
 */

// ==================== Agent Creation ====================
export { createAgent, type AgentInstance, type CreateAgentOptions } from "./createAgent";

// ==================== Driver Creation ====================
export { createDriver, type DriverConfig, type ContentBuilder } from "./createDriver";

// ==================== Interfaces (SPI) ====================
export type { AgentService } from "~/interfaces/AgentService";
export type { AgentDriver } from "~/interfaces/AgentDriver";
export type { AgentReactor, AgentReactorContext } from "~/interfaces/AgentReactor";

// ==================== Utilities ====================
export { StreamEventBuilder } from "~/utils/StreamEventBuilder";
export { AgentReactorRegistry, type AgentReactorRegistryConfig } from "~/core/agent/AgentReactorRegistry";
export type { EngineConfig } from "~/core/agent/AgentEngine";

// Reactor adapters - convert user-friendly interfaces to AgentReactor
export {
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  ExchangeReactorAdapter,
  wrapUserReactor,
  type UserReactor,
} from "~/utils/ReactorAdapter";
