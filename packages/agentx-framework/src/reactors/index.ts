/**
 * Reactors
 *
 * - Interfaces: Pure interface definitions (re-exported from @deepractice-ai/agentx-core)
 * - Adapters: Internal adapter implementations
 */

// Re-export interfaces and adapters from agentx-core
export type { StreamReactor } from "@deepractice-ai/agentx-engine";
export type { StateReactor } from "@deepractice-ai/agentx-engine";
export type { MessageReactor } from "@deepractice-ai/agentx-engine";
export type { TurnReactor } from "@deepractice-ai/agentx-engine";

// Export adapters (from agentx-core, not internal/)
export {
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  TurnReactorAdapter,
  createReactorAdapter,
  type ReactorAdapter,
} from "@deepractice-ai/agentx-engine";
