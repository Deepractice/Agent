/**
 * AgentX API
 *
 * Public API for the AgentX ecosystem.
 * Provides configuration types, interfaces, events, and factory functions.
 *
 * @packageDocumentation
 */

// === Config ===
export type {
  ApiConfig,
  LLMConfig,
  McpConfig,
  McpServerConfig,
  McpTransportConfig,
  AgentConfig,
} from "./config";

// === Interfaces ===
export type { Agent } from "./interfaces";

// === Events ===
export type {
  AgentEvent,
  EventType,
  EventPayload,
  UserMessageEvent,
  AssistantMessageEvent,
  StreamDeltaEvent,
  ResultEvent,
  ResultSuccessEvent,
  ResultErrorEvent,
  SystemInitEvent,
} from "./events";

// === Errors ===
export { AgentConfigError, AgentAbortError } from "./errors";

// === Functions ===
export { createAgent } from "./functions";
