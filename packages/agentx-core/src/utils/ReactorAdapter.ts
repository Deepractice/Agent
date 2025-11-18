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
import type { ExchangeReactor } from "~/interfaces/ExchangeReactor";

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
      context.consumer.consumeByType("text_content_block_start", reactor.onTextContentBlockStart.bind(reactor));
    }

    if (reactor.onTextDelta) {
      context.consumer.consumeByType("text_delta", reactor.onTextDelta.bind(reactor));
    }

    if (reactor.onTextContentBlockStop) {
      context.consumer.consumeByType("text_content_block_stop", reactor.onTextContentBlockStop.bind(reactor));
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
      consumer.consumeByType("conversation_thinking_state", reactor.onConversationThinking.bind(reactor));
    }

    if (reactor.onConversationResponding) {
      consumer.consumeByType("conversation_responding_state", reactor.onConversationResponding.bind(reactor));
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

    if (reactor.onStreamStart) {
      consumer.consumeByType("stream_start_state", reactor.onStreamStart.bind(reactor));
    }

    if (reactor.onStreamComplete) {
      consumer.consumeByType("stream_complete_state", reactor.onStreamComplete.bind(reactor));
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
 * Exchange layer reactor adapter
 */
export class ExchangeReactorAdapter extends BaseReactorAdapter {
  constructor(userReactor: ExchangeReactor) {
    super(userReactor, "Exchange");
  }

  protected subscribeEvents(context: AgentReactorContext): void {
    const reactor = this.userReactor as ExchangeReactor;

    if (reactor.onExchangeRequest) {
      context.consumer.consumeByType("exchange_request", reactor.onExchangeRequest.bind(reactor));
    }

    if (reactor.onExchangeResponse) {
      context.consumer.consumeByType("exchange_response", reactor.onExchangeResponse.bind(reactor));
    }
  }
}

/**
 * Union type for all user-facing reactors
 */
export type UserReactor = StreamReactor | StateReactor | MessageReactor | ExchangeReactor;

/**
 * Detect which type of reactor the user provided and wrap it
 */
export function wrapUserReactor(userReactor: UserReactor): AgentReactor {
  // Check which interface methods are present to determine reactor type
  // Priority: Exchange > Message > State > Stream

  const hasExchangeMethods =
    "onExchangeRequest" in userReactor || "onExchangeResponse" in userReactor;

  const hasMessageMethods =
    "onUserMessage" in userReactor ||
    "onAssistantMessage" in userReactor ||
    "onToolUseMessage" in userReactor ||
    "onErrorMessage" in userReactor;

  const hasStateMethods =
    "onAgentReady" in userReactor ||
    "onConversationStart" in userReactor ||
    "onConversationThinking" in userReactor ||
    "onConversationResponding" in userReactor ||
    "onConversationEnd" in userReactor ||
    "onToolPlanned" in userReactor ||
    "onToolExecuting" in userReactor ||
    "onToolCompleted" in userReactor ||
    "onToolFailed" in userReactor ||
    "onStreamStart" in userReactor ||
    "onStreamComplete" in userReactor ||
    "onErrorOccurred" in userReactor;

  const hasStreamMethods =
    "onMessageStart" in userReactor ||
    "onMessageDelta" in userReactor ||
    "onMessageStop" in userReactor ||
    "onTextContentBlockStart" in userReactor ||
    "onTextDelta" in userReactor ||
    "onTextContentBlockStop" in userReactor ||
    "onToolUseContentBlockStart" in userReactor ||
    "onInputJsonDelta" in userReactor ||
    "onToolUseContentBlockStop" in userReactor;

  // Priority: Exchange > Message > State > Stream
  if (hasExchangeMethods) {
    return new ExchangeReactorAdapter(userReactor as ExchangeReactor);
  }

  if (hasMessageMethods) {
    return new MessageReactorAdapter(userReactor as MessageReactor);
  }

  if (hasStateMethods) {
    return new StateReactorAdapter(userReactor as StateReactor);
  }

  if (hasStreamMethods) {
    return new StreamReactorAdapter(userReactor as StreamReactor);
  }

  throw new Error(
    `Invalid reactor: no recognized event handler methods found. ` +
      `Reactor must implement at least one method from StreamReactor, StateReactor, MessageReactor, or ExchangeReactor.`
  );
}
