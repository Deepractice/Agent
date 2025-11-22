/**
 * ReactorAdapter
 *
 * Utility adapters that wrap user-facing Reactor interfaces into
 * the internal AgentReactor pattern with automatic event subscription.
 *
 * This allows users to write simple interfaces like StreamReactor without
 * manually implementing the full AgentReactor lifecycle.
 */

import type { AgentReactor, AgentReactorContext } from "~/interfaces/AgentReactor";
import type { StreamReactor } from "~/interfaces/StreamReactor";
import type { StateReactor } from "~/interfaces/StateReactor";
import type { MessageReactor } from "~/interfaces/MessageReactor";
import type { TurnReactor } from "~/interfaces/TurnReactor";

/**
 * Generate unique ID for reactors
 */
function generateId(): string {
  return `reactor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Base adapter for wrapping user reactors
 */
abstract class BaseReactorAdapter implements AgentReactor {
  readonly id: string;
  readonly name: string;

  constructor(
    protected userReactor: any,
    layerName: string
  ) {
    this.id = generateId();
    this.name = `${layerName}Adapter(${userReactor.constructor.name})`;
  }

  async initialize(context: AgentReactorContext): Promise<void> {
    // Subscribe to events
    this.subscribeEvents(context);

    // Call user's lifecycle hook if defined
    if (this.userReactor.onInitialize) {
      await this.userReactor.onInitialize(context);
    }
  }

  async destroy(): Promise<void> {
    // Call user's lifecycle hook if defined
    if (this.userReactor.onDestroy) {
      await this.userReactor.onDestroy();
    }
  }

  protected abstract subscribeEvents(context: AgentReactorContext): void;
}

/**
 * Stream layer reactor adapter
 */
export class StreamReactorAdapter extends BaseReactorAdapter {
  constructor(userReactor: StreamReactor) {
    super(userReactor, "Stream");
  }

  protected subscribeEvents(context: AgentReactorContext): void {
    const reactor = this.userReactor as StreamReactor;

    if (reactor.onMessageStart) {
      context.consumer.consumeByType("message_start", reactor.onMessageStart.bind(reactor));
    }

    if (reactor.onMessageDelta) {
      context.consumer.consumeByType("message_delta", reactor.onMessageDelta.bind(reactor));
    }

    if (reactor.onMessageStop) {
      context.consumer.consumeByType("message_stop", reactor.onMessageStop.bind(reactor));
    }

    if (reactor.onTextContentBlockStart) {
      context.consumer.consumeByType(
        "text_content_block_start",
        reactor.onTextContentBlockStart.bind(reactor)
      );
    }

    if (reactor.onTextDelta) {
      context.consumer.consumeByType("text_delta", reactor.onTextDelta.bind(reactor));
    }

    if (reactor.onTextContentBlockStop) {
      context.consumer.consumeByType(
        "text_content_block_stop",
        reactor.onTextContentBlockStop.bind(reactor)
      );
    }

    if (reactor.onToolUseContentBlockStart) {
      context.consumer.consumeByType(
        "tool_use_content_block_start",
        reactor.onToolUseContentBlockStart.bind(reactor)
      );
    }

    if (reactor.onInputJsonDelta) {
      context.consumer.consumeByType("input_json_delta", reactor.onInputJsonDelta.bind(reactor));
    }

    if (reactor.onToolUseContentBlockStop) {
      context.consumer.consumeByType(
        "tool_use_content_block_stop",
        reactor.onToolUseContentBlockStop.bind(reactor)
      );
    }
  }
}

/**
 * State layer reactor adapter
 */
export class StateReactorAdapter extends BaseReactorAdapter {
  constructor(userReactor: StateReactor) {
    super(userReactor, "State");
  }

  protected subscribeEvents(context: AgentReactorContext): void {
    const reactor = this.userReactor as StateReactor;
    const consumer = context.consumer as any; // Type workaround for consumeByType

    if (reactor.onAgentReady) {
      consumer.consumeByType("agent_ready_state", reactor.onAgentReady.bind(reactor));
    }

    if (reactor.onConversationStart) {
      consumer.consumeByType("conversation_start_state", reactor.onConversationStart.bind(reactor));
    }

    if (reactor.onConversationThinking) {
      consumer.consumeByType(
        "conversation_thinking_state",
        reactor.onConversationThinking.bind(reactor)
      );
    }

    if (reactor.onConversationResponding) {
      consumer.consumeByType(
        "conversation_responding_state",
        reactor.onConversationResponding.bind(reactor)
      );
    }

    if (reactor.onConversationEnd) {
      consumer.consumeByType("conversation_end_state", reactor.onConversationEnd.bind(reactor));
    }

    if (reactor.onToolPlanned) {
      consumer.consumeByType("tool_planned_state", reactor.onToolPlanned.bind(reactor));
    }

    if (reactor.onToolExecuting) {
      consumer.consumeByType("tool_executing_state", reactor.onToolExecuting.bind(reactor));
    }

    if (reactor.onToolCompleted) {
      consumer.consumeByType("tool_completed_state", reactor.onToolCompleted.bind(reactor));
    }

    if (reactor.onToolFailed) {
      consumer.consumeByType("tool_failed_state", reactor.onToolFailed.bind(reactor));
    }

    if (reactor.onErrorOccurred) {
      consumer.consumeByType("error_occurred_state", reactor.onErrorOccurred.bind(reactor));
    }
  }
}

/**
 * Message layer reactor adapter
 */
export class MessageReactorAdapter extends BaseReactorAdapter {
  constructor(userReactor: MessageReactor) {
    super(userReactor, "Message");
  }

  protected subscribeEvents(context: AgentReactorContext): void {
    const reactor = this.userReactor as MessageReactor;

    if (reactor.onUserMessage) {
      context.consumer.consumeByType("user_message", reactor.onUserMessage.bind(reactor));
    }

    if (reactor.onAssistantMessage) {
      context.consumer.consumeByType("assistant_message", reactor.onAssistantMessage.bind(reactor));
    }

    if (reactor.onToolUseMessage) {
      context.consumer.consumeByType("tool_use_message", reactor.onToolUseMessage.bind(reactor));
    }

    if (reactor.onErrorMessage) {
      context.consumer.consumeByType("error_message", reactor.onErrorMessage.bind(reactor));
    }
  }
}

/**
 * Turn layer reactor adapter
 */
export class TurnReactorAdapter extends BaseReactorAdapter {
  constructor(userReactor: TurnReactor) {
    super(userReactor, "Turn");
  }

  protected subscribeEvents(context: AgentReactorContext): void {
    const reactor = this.userReactor as TurnReactor;

    if (reactor.onTurnRequest) {
      context.consumer.consumeByType("turn_request", reactor.onTurnRequest.bind(reactor));
    }

    if (reactor.onTurnResponse) {
      context.consumer.consumeByType("turn_response", reactor.onTurnResponse.bind(reactor));
    }
  }
}

/**
 * Union type for all reactor adapter interfaces
 */
export type ReactorAdapter = StreamReactor | StateReactor | MessageReactor | TurnReactor;

/**
 * Composite adapter that supports multiple layers
 *
 * This adapter allows a single reactor to handle events from all 4 layers.
 * Essential for reactors like WebSocketReactor that forward all event types.
 */
class CompositeReactorAdapter implements AgentReactor {
  readonly id: string;
  readonly name: string;

  constructor(private userReactor: any) {
    this.id = generateId();
    this.name = `CompositeAdapter(${userReactor.constructor?.name || "Anonymous"})`;
  }

  async initialize(context: AgentReactorContext): Promise<void> {
    // Subscribe to all layers
    this.subscribeStreamEvents(context);
    this.subscribeStateEvents(context);
    this.subscribeMessageEvents(context);
    this.subscribeTurnEvents(context);

    // Call user's lifecycle hook if defined
    if (this.userReactor.onInitialize) {
      await this.userReactor.onInitialize(context);
    }
  }

  async destroy(): Promise<void> {
    if (this.userReactor.onDestroy) {
      await this.userReactor.onDestroy();
    }
  }

  private subscribeStreamEvents(context: AgentReactorContext): void {
    const reactor = this.userReactor;

    if (reactor.onMessageStart) {
      context.consumer.consumeByType("message_start", reactor.onMessageStart.bind(reactor));
    }
    if (reactor.onMessageDelta) {
      context.consumer.consumeByType("message_delta", reactor.onMessageDelta.bind(reactor));
    }
    if (reactor.onMessageStop) {
      context.consumer.consumeByType("message_stop", reactor.onMessageStop.bind(reactor));
    }
    if (reactor.onTextContentBlockStart) {
      context.consumer.consumeByType(
        "text_content_block_start",
        reactor.onTextContentBlockStart.bind(reactor)
      );
    }
    if (reactor.onTextDelta) {
      context.consumer.consumeByType("text_delta", reactor.onTextDelta.bind(reactor));
    }
    if (reactor.onTextContentBlockStop) {
      context.consumer.consumeByType(
        "text_content_block_stop",
        reactor.onTextContentBlockStop.bind(reactor)
      );
    }
    if (reactor.onToolUseContentBlockStart) {
      context.consumer.consumeByType(
        "tool_use_content_block_start",
        reactor.onToolUseContentBlockStart.bind(reactor)
      );
    }
    if (reactor.onInputJsonDelta) {
      context.consumer.consumeByType("input_json_delta", reactor.onInputJsonDelta.bind(reactor));
    }
    if (reactor.onToolUseContentBlockStop) {
      context.consumer.consumeByType(
        "tool_use_content_block_stop",
        reactor.onToolUseContentBlockStop.bind(reactor)
      );
    }
    if (reactor.onToolCall) {
      context.consumer.consumeByType("tool_call", reactor.onToolCall.bind(reactor));
    }
    if (reactor.onToolResult) {
      context.consumer.consumeByType("tool_result", reactor.onToolResult.bind(reactor));
    }
  }

  private subscribeStateEvents(context: AgentReactorContext): void {
    const reactor = this.userReactor;

    if (reactor.onAgentReady) {
      context.consumer.consumeByType("agent_ready_state", reactor.onAgentReady.bind(reactor));
    }
    if (reactor.onConversationStart) {
      context.consumer.consumeByType(
        "conversation_start_state",
        reactor.onConversationStart.bind(reactor)
      );
    }
    if (reactor.onConversationThinking) {
      context.consumer.consumeByType(
        "conversation_thinking_state",
        reactor.onConversationThinking.bind(reactor)
      );
    }
    if (reactor.onConversationResponding) {
      context.consumer.consumeByType(
        "conversation_responding_state",
        reactor.onConversationResponding.bind(reactor)
      );
    }
    if (reactor.onConversationEnd) {
      context.consumer.consumeByType(
        "conversation_end_state",
        reactor.onConversationEnd.bind(reactor)
      );
    }
    if (reactor.onToolPlanned) {
      context.consumer.consumeByType("tool_planned_state", reactor.onToolPlanned.bind(reactor));
    }
    if (reactor.onToolExecuting) {
      context.consumer.consumeByType("tool_executing_state", reactor.onToolExecuting.bind(reactor));
    }
    if (reactor.onToolCompleted) {
      context.consumer.consumeByType("tool_completed_state", reactor.onToolCompleted.bind(reactor));
    }
    if (reactor.onToolFailed) {
      context.consumer.consumeByType("tool_failed_state", reactor.onToolFailed.bind(reactor));
    }
    if (reactor.onErrorOccurred) {
      context.consumer.consumeByType("error_occurred_state", reactor.onErrorOccurred.bind(reactor));
    }
  }

  private subscribeMessageEvents(context: AgentReactorContext): void {
    const reactor = this.userReactor;

    if (reactor.onUserMessage) {
      context.consumer.consumeByType("user_message", reactor.onUserMessage.bind(reactor));
    }
    if (reactor.onAssistantMessage) {
      context.consumer.consumeByType("assistant_message", reactor.onAssistantMessage.bind(reactor));
    }
    if (reactor.onToolUseMessage) {
      context.consumer.consumeByType("tool_use_message", reactor.onToolUseMessage.bind(reactor));
    }
    if (reactor.onErrorMessage) {
      context.consumer.consumeByType("error_message", reactor.onErrorMessage.bind(reactor));
    }
  }

  private subscribeTurnEvents(context: AgentReactorContext): void {
    const reactor = this.userReactor;

    if (reactor.onTurnRequest) {
      context.consumer.consumeByType("turn_request", reactor.onTurnRequest.bind(reactor));
    }
    if (reactor.onTurnResponse) {
      context.consumer.consumeByType("turn_response", reactor.onTurnResponse.bind(reactor));
    }
  }
}

/**
 * Create a reactor adapter based on the provided reactor interface
 *
 * Automatically detects which layer interfaces the reactor implements and
 * wraps it with the appropriate adapter:
 * - Single-layer reactors use specific adapters (StreamReactorAdapter, etc.)
 * - Multi-layer reactors use CompositeReactorAdapter
 *
 * @param reactor - Reactor implementing one or more layer interfaces
 * @returns AgentReactor with full lifecycle support
 */
export function createReactorAdapter(reactor: ReactorAdapter): AgentReactor {
  // Check which interface methods are present to determine reactor type

  const hasTurnMethods = "onTurnRequest" in reactor || "onTurnResponse" in reactor;

  const hasMessageMethods =
    "onUserMessage" in reactor ||
    "onAssistantMessage" in reactor ||
    "onToolUseMessage" in reactor ||
    "onErrorMessage" in reactor;

  const hasStateMethods =
    "onAgentReady" in reactor ||
    "onConversationStart" in reactor ||
    "onConversationThinking" in reactor ||
    "onConversationResponding" in reactor ||
    "onConversationEnd" in reactor ||
    "onToolPlanned" in reactor ||
    "onToolExecuting" in reactor ||
    "onToolCompleted" in reactor ||
    "onToolFailed" in reactor ||
    "onErrorOccurred" in reactor;

  const hasStreamMethods =
    "onMessageStart" in reactor ||
    "onMessageDelta" in reactor ||
    "onMessageStop" in reactor ||
    "onTextContentBlockStart" in reactor ||
    "onTextDelta" in reactor ||
    "onTextContentBlockStop" in reactor ||
    "onToolUseContentBlockStart" in reactor ||
    "onInputJsonDelta" in reactor ||
    "onToolUseContentBlockStop" in reactor ||
    "onToolCall" in reactor ||
    "onToolResult" in reactor;

  // Count how many layers this reactor implements
  const layerCount = [hasStreamMethods, hasStateMethods, hasMessageMethods, hasTurnMethods].filter(
    Boolean
  ).length;

  // If multi-layer reactor, use CompositeAdapter
  if (layerCount > 1) {
    return new CompositeReactorAdapter(reactor);
  }

  // Single-layer reactors use specific adapters for performance
  if (hasTurnMethods) {
    return new TurnReactorAdapter(reactor as TurnReactor);
  }

  if (hasMessageMethods) {
    return new MessageReactorAdapter(reactor as MessageReactor);
  }

  if (hasStateMethods) {
    return new StateReactorAdapter(reactor as StateReactor);
  }

  if (hasStreamMethods) {
    return new StreamReactorAdapter(reactor as StreamReactor);
  }

  throw new Error(
    `Invalid reactor: no recognized event handler methods found. ` +
      `Reactor must implement at least one method from StreamReactor, StateReactor, MessageReactor, or TurnReactor.`
  );
}
