/**
 * defineReactor
 *
 * Framework helper for creating Reactor implementations with minimal boilerplate.
 * Developers only need to define handlers for events they care about.
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
 *   onMessageComplete: (event) => {
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

import type { Reactor, ReactorContext } from "@deepractice-ai/agentx-core";
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
  // Exchange events
  ExchangeRequestEvent,
  ExchangeResponseEvent,
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
  onInit?: (context: ReactorContext, config: TConfig) => void | Promise<void>;

  /**
   * Called when reactor is destroyed
   */
  onDestroy?: () => void | Promise<void>;

  // ==================== Stream Layer ====================
  onMessageStart?: (event: MessageStartEvent, config: TConfig) => void | Promise<void>;
  onMessageDelta?: (event: MessageDeltaEvent, config: TConfig) => void | Promise<void>;
  onMessageStop?: (event: MessageStopEvent, config: TConfig) => void | Promise<void>;
  onTextContentBlockStart?: (event: TextContentBlockStartEvent, config: TConfig) => void | Promise<void>;
  onTextDelta?: (event: TextDeltaEvent, config: TConfig) => void | Promise<void>;
  onTextContentBlockStop?: (event: TextContentBlockStopEvent, config: TConfig) => void | Promise<void>;
  onToolUseContentBlockStart?: (event: ToolUseContentBlockStartEvent, config: TConfig) => void | Promise<void>;
  onInputJsonDelta?: (event: InputJsonDeltaEvent, config: TConfig) => void | Promise<void>;
  onToolUseContentBlockStop?: (event: ToolUseContentBlockStopEvent, config: TConfig) => void | Promise<void>;
  onToolCall?: (event: ToolCallEvent, config: TConfig) => void | Promise<void>;
  onToolResult?: (event: ToolResultEvent, config: TConfig) => void | Promise<void>;

  // ==================== State Layer ====================
  onAgentReady?: (event: AgentReadyStateEvent, config: TConfig) => void | Promise<void>;
  onConversationStart?: (event: ConversationStartStateEvent, config: TConfig) => void | Promise<void>;
  onConversationThinking?: (event: ConversationThinkingStateEvent, config: TConfig) => void | Promise<void>;
  onConversationResponding?: (event: ConversationRespondingStateEvent, config: TConfig) => void | Promise<void>;
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

  // ==================== Exchange Layer ====================
  onExchangeRequest?: (event: ExchangeRequestEvent, config: TConfig) => void | Promise<void>;
  onExchangeResponse?: (event: ExchangeResponseEvent, config: TConfig) => void | Promise<void>;
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
  create: (config?: TConfig) => Reactor;
}

/**
 * Internal reactor implementation
 */
class SimpleReactor implements Reactor {
  readonly id: string;
  readonly name: string;

  constructor(
    private definition: ReactorDefinition,
    private config: any
  ) {
    this.id = `${definition.name}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.name = definition.name;
  }

  async initialize(context: ReactorContext): Promise<void> {
    // Subscribe to all events defined in the definition
    this.subscribeEvents(context);

    // Call onInit if provided
    if (this.definition.onInit) {
      await this.definition.onInit(context, this.config);
    }
  }

  async destroy(): Promise<void> {
    if (this.definition.onDestroy) {
      await this.definition.onDestroy();
    }
  }

  /**
   * Subscribe to all events that have handlers
   */
  private subscribeEvents(context: ReactorContext): void {
    const def = this.definition;

    // Stream layer
    if (def.onMessageStart) {
      context.consumer.consumeByType("message_start", (e) => def.onMessageStart!(e, this.config));
    }
    if (def.onMessageDelta) {
      context.consumer.consumeByType("message_delta", (e) => def.onMessageDelta!(e, this.config));
    }
    if (def.onMessageStop) {
      context.consumer.consumeByType("message_stop", (e) => def.onMessageStop!(e, this.config));
    }
    if (def.onTextContentBlockStart) {
      context.consumer.consumeByType("text_content_block_start", (e) => def.onTextContentBlockStart!(e, this.config));
    }
    if (def.onTextDelta) {
      context.consumer.consumeByType("text_delta", (e) => def.onTextDelta!(e, this.config));
    }
    if (def.onTextContentBlockStop) {
      context.consumer.consumeByType("text_content_block_stop", (e) => def.onTextContentBlockStop!(e, this.config));
    }
    if (def.onToolUseContentBlockStart) {
      context.consumer.consumeByType("tool_use_content_block_start", (e) => def.onToolUseContentBlockStart!(e, this.config));
    }
    if (def.onInputJsonDelta) {
      context.consumer.consumeByType("input_json_delta", (e) => def.onInputJsonDelta!(e, this.config));
    }
    if (def.onToolUseContentBlockStop) {
      context.consumer.consumeByType("tool_use_content_block_stop", (e) => def.onToolUseContentBlockStop!(e, this.config));
    }
    if (def.onToolCall) {
      context.consumer.consumeByType("tool_call", (e) => def.onToolCall!(e, this.config));
    }
    if (def.onToolResult) {
      context.consumer.consumeByType("tool_result", (e) => def.onToolResult!(e, this.config));
    }

    // State layer
    if (def.onAgentReady) {
      context.consumer.consumeByType("agent_ready", (e) => def.onAgentReady!(e, this.config));
    }
    if (def.onConversationStart) {
      context.consumer.consumeByType("conversation_start", (e) => def.onConversationStart!(e, this.config));
    }
    if (def.onConversationThinking) {
      context.consumer.consumeByType("conversation_thinking", (e) => def.onConversationThinking!(e, this.config));
    }
    if (def.onConversationResponding) {
      context.consumer.consumeByType("conversation_responding", (e) => def.onConversationResponding!(e, this.config));
    }
    if (def.onConversationEnd) {
      context.consumer.consumeByType("conversation_end", (e) => def.onConversationEnd!(e, this.config));
    }
    if (def.onToolPlanned) {
      context.consumer.consumeByType("tool_planned", (e) => def.onToolPlanned!(e, this.config));
    }
    if (def.onToolExecuting) {
      context.consumer.consumeByType("tool_executing", (e) => def.onToolExecuting!(e, this.config));
    }
    if (def.onToolCompleted) {
      context.consumer.consumeByType("tool_completed", (e) => def.onToolCompleted!(e, this.config));
    }
    if (def.onToolFailed) {
      context.consumer.consumeByType("tool_failed", (e) => def.onToolFailed!(e, this.config));
    }
    if (def.onStreamStart) {
      context.consumer.consumeByType("stream_start", (e) => def.onStreamStart!(e, this.config));
    }
    if (def.onStreamComplete) {
      context.consumer.consumeByType("stream_complete", (e) => def.onStreamComplete!(e, this.config));
    }
    if (def.onErrorOccurred) {
      context.consumer.consumeByType("error_occurred", (e) => def.onErrorOccurred!(e, this.config));
    }

    // Message layer
    if (def.onUserMessage) {
      context.consumer.consumeByType("user_message", (e) => def.onUserMessage!(e, this.config));
    }
    if (def.onAssistantMessage) {
      context.consumer.consumeByType("assistant_message", (e) => def.onAssistantMessage!(e, this.config));
    }
    if (def.onToolUseMessage) {
      context.consumer.consumeByType("tool_use_message", (e) => def.onToolUseMessage!(e, this.config));
    }
    if (def.onErrorMessage) {
      context.consumer.consumeByType("error_message", (e) => def.onErrorMessage!(e, this.config));
    }

    // Exchange layer
    if (def.onExchangeRequest) {
      context.consumer.consumeByType("exchange_request", (e) => def.onExchangeRequest!(e, this.config));
    }
    if (def.onExchangeResponse) {
      context.consumer.consumeByType("exchange_response", (e) => def.onExchangeResponse!(e, this.config));
    }
  }
}

/**
 * Define a custom reactor with simplified API
 *
 * @param definition - Reactor definition
 * @returns Defined reactor factory
 *
 * @example
 * ```typescript
 * const LoggerReactor = defineReactor({
 *   name: "Logger",
 *   onTextDelta: (event) => {
 *     console.log(event.data.text);
 *   }
 * });
 *
 * const reactor = LoggerReactor.create();
 * ```
 */
export function defineReactor<TConfig = any>(
  definition: ReactorDefinition<TConfig>
): DefinedReactor<TConfig> {
  return {
    name: definition.name,

    create: (config?: TConfig) => {
      return new SimpleReactor(definition, config || {});
    }
  };
}
