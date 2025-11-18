/**
 * Reactors
 *
 * - Interfaces: Pure interface definitions (re-exported from @deepractice-ai/agentx-core)
 * - Adapters: Internal adapter implementations
 * - Implementations: Concrete reactor implementations (WebSocketReactor, etc.)
 */

// Re-export interfaces from agentx-core
export type { StreamReactor } from "@deepractice-ai/agentx-core";
export type { StateReactor } from "@deepractice-ai/agentx-core";
export type { MessageReactor } from "@deepractice-ai/agentx-core";
export type { ExchangeReactor } from "@deepractice-ai/agentx-core";

// Export adapters (from internal/)
export {
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  ExchangeReactorAdapter,
  wrapUserReactor,
  type UserReactor,
} from "../internal";

// Export reactor implementations
export { WebSocketReactor, type WebSocketLike, type WebSocketReactorConfig } from "./WebSocketReactor";
