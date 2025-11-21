/**
 * defineReactor
 *
 * Framework helper for creating Reactor implementations with minimal boilerplate.
 * Developers only need to define handlers for events they care about.
 *
 * This function creates reactors that are compatible with agentx-core's 4-layer
 * reactor interfaces (StreamReactor, StateReactor, MessageReactor, ExchangeReactor)
 * and automatically wraps them using wrapUserReactor.
 *
 * @example
 * ```typescript
 * const myReactor = defineReactor({
 *   name: "Logger",
 *
 *   // Only implement events you care about
 *   onTextDelta: (event) => {
 *     console.log("Text:", event.data.text);
 *   },
 *
 *   onAssistantMessage: (event) => {
 *     console.log("Message complete:", event.data.content);
 *   },
 *
 *   // Optional lifecycle
 *   onInit: (context) => console.log("Reactor initialized"),
 *   onDestroy: () => console.log("Reactor destroyed"),
 * });
 *
 * // Use it
 * const reactor = myReactor.create({ logLevel: "debug" });
 * ```
 */

import type { AgentReactor, AgentReactorContext } from "@deepractice-ai/agentx-core";
import { wrapUserReactor as coreWrapUserReactor } from "@deepractice-ai/agentx-core";
import type {
  // Stream events
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  ToolCallEvent,
  ToolResultEvent,
  // State events
  AgentReadyStateEvent,
  ConversationStartStateEvent,
  ConversationThinkingStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  ToolPlannedStateEvent,
  ToolExecutingStateEvent,
  ToolCompletedStateEvent,
  ToolFailedStateEvent,
  StreamStartStateEvent,
  StreamCompleteStateEvent,
  ErrorOccurredStateEvent,
  // Message events
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ErrorMessageEvent,
  // Turn events
  TurnRequestEvent,
  TurnResponseEvent,
} from "@deepractice-ai/agentx-event";

/**
 * Reactor definition configuration
 *
 * All event handlers are optional.
 * Only implement the ones you need.
 */
export interface ReactorDefinition<TConfig = any> {
  /**
   * Reactor name (for identification)
   */
  name: string;

  // ==================== Lifecycle ====================
  /**
   * Called when reactor is initialized
   */
  onInit?: (context: AgentReactorContext, config: TConfig) => void | Promise<void>;

  /**
   * Called when reactor is destroyed
   */
  onDestroy?: () => void | Promise<void>;

  // ==================== Stream Layer ====================
  onMessageStart?: (event: MessageStartEvent, config: TConfig) => void | Promise<void>;
  onMessageDelta?: (event: MessageDeltaEvent, config: TConfig) => void | Promise<void>;
  onMessageStop?: (event: MessageStopEvent, config: TConfig) => void | Promise<void>;
  onTextContentBlockStart?: (
    event: TextContentBlockStartEvent,
    config: TConfig
  ) => void | Promise<void>;
  onTextDelta?: (event: TextDeltaEvent, config: TConfig) => void | Promise<void>;
  onTextContentBlockStop?: (
    event: TextContentBlockStopEvent,
    config: TConfig
  ) => void | Promise<void>;
  onToolUseContentBlockStart?: (
    event: ToolUseContentBlockStartEvent,
    config: TConfig
  ) => void | Promise<void>;
  onInputJsonDelta?: (event: InputJsonDeltaEvent, config: TConfig) => void | Promise<void>;
  onToolUseContentBlockStop?: (
    event: ToolUseContentBlockStopEvent,
    config: TConfig
  ) => void | Promise<void>;
  onToolCall?: (event: ToolCallEvent, config: TConfig) => void | Promise<void>;
  onToolResult?: (event: ToolResultEvent, config: TConfig) => void | Promise<void>;

  // ==================== State Layer ====================
  onAgentReady?: (event: AgentReadyStateEvent, config: TConfig) => void | Promise<void>;
  onConversationStart?: (
    event: ConversationStartStateEvent,
    config: TConfig
  ) => void | Promise<void>;
  onConversationThinking?: (
    event: ConversationThinkingStateEvent,
    config: TConfig
  ) => void | Promise<void>;
  onConversationResponding?: (
    event: ConversationRespondingStateEvent,
    config: TConfig
  ) => void | Promise<void>;
  onConversationEnd?: (event: ConversationEndStateEvent, config: TConfig) => void | Promise<void>;
  onToolPlanned?: (event: ToolPlannedStateEvent, config: TConfig) => void | Promise<void>;
  onToolExecuting?: (event: ToolExecutingStateEvent, config: TConfig) => void | Promise<void>;
  onToolCompleted?: (event: ToolCompletedStateEvent, config: TConfig) => void | Promise<void>;
  onToolFailed?: (event: ToolFailedStateEvent, config: TConfig) => void | Promise<void>;
  onStreamStart?: (event: StreamStartStateEvent, config: TConfig) => void | Promise<void>;
  onStreamComplete?: (event: StreamCompleteStateEvent, config: TConfig) => void | Promise<void>;
  onErrorOccurred?: (event: ErrorOccurredStateEvent, config: TConfig) => void | Promise<void>;

  // ==================== Message Layer ====================
  onUserMessage?: (event: UserMessageEvent, config: TConfig) => void | Promise<void>;
  onAssistantMessage?: (event: AssistantMessageEvent, config: TConfig) => void | Promise<void>;
  onToolUseMessage?: (event: ToolUseMessageEvent, config: TConfig) => void | Promise<void>;
  onErrorMessage?: (event: ErrorMessageEvent, config: TConfig) => void | Promise<void>;

  // ==================== Turn Layer ====================
  onTurnRequest?: (event: TurnRequestEvent, config: TConfig) => void | Promise<void>;
  onTurnResponse?: (event: TurnResponseEvent, config: TConfig) => void | Promise<void>;
}

/**
 * Defined reactor factory
 */
export interface DefinedReactor<TConfig = any> {
  /**
   * Reactor name
   */
  name: string;

  /**
   * Create a reactor instance
   */
  create: (config?: TConfig) => AgentReactor;
}

/**
 * Build user reactor object from definition
 *
 * This creates an object that implements the appropriate layer interfaces
 * (StreamReactor, StateReactor, MessageReactor, ExchangeReactor) based on
 * which event handlers are defined.
 *
 * The object is then wrapped by core's wrapUserReactor to become an AgentReactor.
 */
function buildUserReactor(definition: ReactorDefinition, config: any): any {
  const userReactor: any = {};

  // ==================== Lifecycle ====================
  if (definition.onInit) {
    userReactor.onInitialize = (context: AgentReactorContext) =>
      definition.onInit!(context, config);
  }
  if (definition.onDestroy) {
    userReactor.onDestroy = () => definition.onDestroy!();
  }

  // ==================== Stream Layer ====================
  if (definition.onMessageStart) {
    userReactor.onMessageStart = (e: MessageStartEvent) => definition.onMessageStart!(e, config);
  }
  if (definition.onMessageDelta) {
    userReactor.onMessageDelta = (e: MessageDeltaEvent) => definition.onMessageDelta!(e, config);
  }
  if (definition.onMessageStop) {
    userReactor.onMessageStop = (e: MessageStopEvent) => definition.onMessageStop!(e, config);
  }
  if (definition.onTextContentBlockStart) {
    userReactor.onTextContentBlockStart = (e: TextContentBlockStartEvent) =>
      definition.onTextContentBlockStart!(e, config);
  }
  if (definition.onTextDelta) {
    userReactor.onTextDelta = (e: TextDeltaEvent) => definition.onTextDelta!(e, config);
  }
  if (definition.onTextContentBlockStop) {
    userReactor.onTextContentBlockStop = (e: TextContentBlockStopEvent) =>
      definition.onTextContentBlockStop!(e, config);
  }
  if (definition.onToolUseContentBlockStart) {
    userReactor.onToolUseContentBlockStart = (e: ToolUseContentBlockStartEvent) =>
      definition.onToolUseContentBlockStart!(e, config);
  }
  if (definition.onInputJsonDelta) {
    userReactor.onInputJsonDelta = (e: InputJsonDeltaEvent) =>
      definition.onInputJsonDelta!(e, config);
  }
  if (definition.onToolUseContentBlockStop) {
    userReactor.onToolUseContentBlockStop = (e: ToolUseContentBlockStopEvent) =>
      definition.onToolUseContentBlockStop!(e, config);
  }
  if (definition.onToolCall) {
    userReactor.onToolCall = (e: ToolCallEvent) => definition.onToolCall!(e, config);
  }
  if (definition.onToolResult) {
    userReactor.onToolResult = (e: ToolResultEvent) => definition.onToolResult!(e, config);
  }

  // ==================== State Layer ====================
  if (definition.onAgentReady) {
    userReactor.onAgentReady = (e: AgentReadyStateEvent) => definition.onAgentReady!(e, config);
  }
  if (definition.onConversationStart) {
    userReactor.onConversationStart = (e: ConversationStartStateEvent) =>
      definition.onConversationStart!(e, config);
  }
  if (definition.onConversationThinking) {
    userReactor.onConversationThinking = (e: ConversationThinkingStateEvent) =>
      definition.onConversationThinking!(e, config);
  }
  if (definition.onConversationResponding) {
    userReactor.onConversationResponding = (e: ConversationRespondingStateEvent) =>
      definition.onConversationResponding!(e, config);
  }
  if (definition.onConversationEnd) {
    userReactor.onConversationEnd = (e: ConversationEndStateEvent) =>
      definition.onConversationEnd!(e, config);
  }
  if (definition.onToolPlanned) {
    userReactor.onToolPlanned = (e: ToolPlannedStateEvent) => definition.onToolPlanned!(e, config);
  }
  if (definition.onToolExecuting) {
    userReactor.onToolExecuting = (e: ToolExecutingStateEvent) =>
      definition.onToolExecuting!(e, config);
  }
  if (definition.onToolCompleted) {
    userReactor.onToolCompleted = (e: ToolCompletedStateEvent) =>
      definition.onToolCompleted!(e, config);
  }
  if (definition.onToolFailed) {
    userReactor.onToolFailed = (e: ToolFailedStateEvent) => definition.onToolFailed!(e, config);
  }
  if (definition.onStreamStart) {
    userReactor.onStreamStart = (e: StreamStartStateEvent) => definition.onStreamStart!(e, config);
  }
  if (definition.onStreamComplete) {
    userReactor.onStreamComplete = (e: StreamCompleteStateEvent) =>
      definition.onStreamComplete!(e, config);
  }
  if (definition.onErrorOccurred) {
    userReactor.onErrorOccurred = (e: ErrorOccurredStateEvent) =>
      definition.onErrorOccurred!(e, config);
  }

  // ==================== Message Layer ====================
  if (definition.onUserMessage) {
    userReactor.onUserMessage = (e: UserMessageEvent) => definition.onUserMessage!(e, config);
  }
  if (definition.onAssistantMessage) {
    userReactor.onAssistantMessage = (e: AssistantMessageEvent) =>
      definition.onAssistantMessage!(e, config);
  }
  if (definition.onToolUseMessage) {
    userReactor.onToolUseMessage = (e: ToolUseMessageEvent) =>
      definition.onToolUseMessage!(e, config);
  }
  if (definition.onErrorMessage) {
    userReactor.onErrorMessage = (e: ErrorMessageEvent) => definition.onErrorMessage!(e, config);
  }

  // ==================== Turn Layer ====================
  if (definition.onTurnRequest) {
    userReactor.onTurnRequest = (e: TurnRequestEvent) => definition.onTurnRequest!(e, config);
  }
  if (definition.onTurnResponse) {
    userReactor.onTurnResponse = (e: TurnResponseEvent) => definition.onTurnResponse!(e, config);
  }

  return userReactor;
}

/**
 * Define a custom reactor with simplified API
 *
 * This creates a reactor definition that can be instantiated with config.
 * Internally, it builds an object compatible with agentx-core's 4-layer reactor
 * interfaces and wraps it using wrapUserReactor.
 *
 * @param definition - Reactor definition
 * @returns Defined reactor factory
 *
 * @example
 * ```typescript
 * const LoggerReactor = defineReactor({
 *   name: "Logger",
 *   onTextDelta: (event, config) => {
 *     console.log(event.data.text);
 *   }
 * });
 *
 * const reactor = LoggerReactor.create({ logLevel: "debug" });
 * ```
 */
export function defineReactor<TConfig = any>(
  definition: ReactorDefinition<TConfig>
): DefinedReactor<TConfig> {
  return {
    name: definition.name,

    create: (config?: TConfig) => {
      // Build user reactor object that implements 4-layer interfaces
      const userReactor = buildUserReactor(definition, config || {});

      // Use core's wrapUserReactor to convert to AgentReactor
      // This automatically handles event subscription and lifecycle
      return coreWrapUserReactor(userReactor);
    },
  };
}
