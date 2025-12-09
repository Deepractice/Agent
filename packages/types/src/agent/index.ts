/**
 * Agent Module - AgentEngine Domain Types
 *
 * AgentEngine is an independent event processing unit that can be tested
 * in isolation without Runtime dependencies (Container, Session, Bus).
 *
 * ## Two-Domain Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Runtime Domain (@agentxjs/types/runtime)                   │
 * │    - SystemEvent (source, category, intent, context)        │
 * │    - Container, Session, Sandbox, Environment               │
 * │    - Agent (complete runtime entity with lifecycle)         │
 * │                                                             │
 * │   ┌─────────────────────────────────────────────────────┐   │
 * │   │  AgentEngine Domain (@agentxjs/types/agent)         │   │
 * │   │    - AgentEvent (lightweight: type, timestamp, data) │   │
 * │   │    - AgentEngine (event processing unit)            │   │
 * │   │    - Independent, testable in isolation             │   │
 * │   │                                                     │   │
 * │   │  Driver ←── AgentEngine ──→ Presenter               │   │
 * │   │    ↑            │               ↓                   │   │
 * │   └────│────────────│───────────────│───────────────────┘   │
 * │        │            │               │                       │
 * │   DriveableEvent    │          SystemEvent                  │
 * │   → StreamEvent     │          (add context)                │
 * └─────────────────────│───────────────────────────────────────┘
 *                       │
 *                  MealyMachine
 *                  (pure event processor)
 * ```
 *
 * ## Core Components
 *
 * - **AgentEngine**: Event processing unit (Driver + MealyMachine + Presenter)
 * - **AgentDriver**: Input adapter - converts external events to StreamEvent
 * - **AgentPresenter**: Output adapter - emits AgentOutput to external systems
 * - **MealyMachine**: Pure Mealy Machine that transforms StreamEvent → AgentOutput
 *
 * ## Event Layers (AgentOutput)
 *
 * 1. **StreamEvent**: Real-time incremental events (text_delta, tool_use_start...)
 * 2. **AgentStateEvent**: Events that affect AgentState (conversation_*, tool_*, error_*)
 * 3. **AgentMessageEvent**: Assembled messages (user_message, assistant_message...)
 * 4. **AgentTurnEvent**: Turn analytics (turn_request, turn_response)
 *
 * ## Message Types (Three-Party Model)
 *
 * - **User**: Human participant (UserMessage)
 * - **Assistant**: AI participant (AssistantMessage, ToolCallMessage)
 * - **Tool**: Computer/execution environment (ToolResultMessage)
 *
 * @packageDocumentation
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
export type {
  AgentOutputCallback,
  AgentEventHandler,
  Unsubscribe,
} from "./internal/AgentOutputCallback";

// Message types
export type {
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  ErrorMessage,
  Message,
  MessageRole,
  MessageSubtype,
  ContentPart,
  TextPart,
  ThinkingPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultPart,
  ToolResultOutput,
} from "./message";

// Event types
export * from "./event";
