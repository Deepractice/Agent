/**
 * Public Agent Types
 *
 * These are the types exposed to users of the agent package.
 */

// Core types
export type {
  AgentEngine,
  StateChange,
  StateChangeHandler,
  EventHandlerMap,
  ReactHandlerMap,
} from "./Agent";
export type { AgentState } from "./AgentState";
export type { AgentOutput } from "./AgentOutput";
export type { AgentError, AgentErrorCategory } from "./AgentError";
export type { MessageQueue } from "./MessageQueue";

// Driver & Presenter
export type { AgentDriver } from "./AgentDriver";
export type { AgentPresenter } from "./AgentPresenter";

// Factory
export type { CreateAgentOptions } from "./createAgent";
export { createAgent } from "./createAgent";

// Event handling types
export type { AgentEventHandler, Unsubscribe } from "./internal/AgentEventHandler";

// Message types
export type {
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  Message,
  ContentPart,
  TextPart,
  ImagePart,
  ToolCallPart,
  ToolResultPart,
} from "./message";

// Event types
export * from "./event";
