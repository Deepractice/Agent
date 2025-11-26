/**
 * messageAssemblerProcessor
 *
 * Pure Mealy transition function that assembles complete Message Layer events
 * from Stream Layer events.
 *
 * Input Events (Stream Layer):
 * - message_start
 * - text_delta
 * - text_content_block_stop
 * - tool_use_content_block_start
 * - input_json_delta
 * - tool_use_content_block_stop
 * - message_stop
 *
 * Output Events (Message Layer + tool_call):
 * - tool_call (when tool parameters are fully assembled)
 * - tool_use_message (complete tool use record)
 * - assistant_message (complete assistant response)
 */

import type { Processor, ProcessorDefinition } from "@deepractice-ai/agentx-mealy";
import type {
  StreamEventType,
  MessageStartEvent,
  TextDeltaEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  MessageStopEvent,
  ToolCallEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
} from "@deepractice-ai/agentx-event";
import type {
  AssistantMessage,
  ToolUseMessage,
  ToolCallPart,
  ToolResultPart,
} from "@deepractice-ai/agentx-types";

// ===== State Types =====

/**
 * Pending content accumulator
 */
export interface PendingContent {
  type: "text" | "tool_use";
  index: number;
  // For text content
  textDeltas?: string[];
  // For tool use
  toolId?: string;
  toolName?: string;
  toolInputJson?: string;
}

/**
 * MessageAssemblerState
 *
 * Tracks the state of message assembly from stream events.
 */
export interface MessageAssemblerState {
  /**
   * Current message ID being assembled
   */
  currentMessageId: string | null;

  /**
   * Timestamp when the current message started
   */
  messageStartTime: number | null;

  /**
   * Pending content blocks being accumulated
   * Key is the content block index
   */
  pendingContents: Record<number, PendingContent>;
}

/**
 * Initial state factory for MessageAssembler
 */
export function createInitialMessageAssemblerState(): MessageAssemblerState {
  return {
    currentMessageId: null,
    messageStartTime: null,
    pendingContents: {},
  };
}

// ===== Processor Implementation =====

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Output event types from MessageAssembler
 */
export type MessageAssemblerOutput = ToolCallEvent | AssistantMessageEvent | ToolUseMessageEvent;

/**
 * Input event types for MessageAssembler (subset of StreamEventType)
 */
export type MessageAssemblerInput = StreamEventType;

/**
 * messageAssemblerProcessor
 *
 * Pure Mealy transition function for message assembly.
 * Pattern: (state, input) => [newState, outputs]
 */
export const messageAssemblerProcessor: Processor<
  MessageAssemblerState,
  MessageAssemblerInput,
  MessageAssemblerOutput
> = (state, input): [MessageAssemblerState, MessageAssemblerOutput[]] => {
  switch (input.type) {
    case "message_start":
      return handleMessageStart(state, input);

    case "text_delta":
      return handleTextDelta(state, input);

    case "tool_use_content_block_start":
      return handleToolUseContentBlockStart(state, input);

    case "input_json_delta":
      return handleInputJsonDelta(state, input);

    case "tool_use_content_block_stop":
      return handleToolUseContentBlockStop(state, input);

    case "message_stop":
      return handleMessageStop(state, input);

    default:
      // Pass through unhandled events (no state change, no output)
      return [state, []];
  }
};

/**
 * Handle message_start event
 */
function handleMessageStart(
  state: Readonly<MessageAssemblerState>,
  event: MessageStartEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  return [
    {
      ...state,
      currentMessageId: generateId(),
      messageStartTime: event.timestamp,
      pendingContents: {},
    },
    [],
  ];
}

/**
 * Handle text_delta event
 */
function handleTextDelta(
  state: Readonly<MessageAssemblerState>,
  event: TextDeltaEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const index = 0; // Text content uses index 0
  const existingContent = state.pendingContents[index];

  const pendingContent: PendingContent =
    existingContent?.type === "text"
      ? {
          ...existingContent,
          textDeltas: [...(existingContent.textDeltas || []), event.data.text],
        }
      : {
          type: "text",
          index,
          textDeltas: [event.data.text],
        };

  return [
    {
      ...state,
      pendingContents: {
        ...state.pendingContents,
        [index]: pendingContent,
      },
    },
    [],
  ];
}

/**
 * Handle tool_use_content_block_start event
 */
function handleToolUseContentBlockStart(
  state: Readonly<MessageAssemblerState>,
  event: ToolUseContentBlockStartEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const index = 1; // Tool use uses index 1

  const pendingContent: PendingContent = {
    type: "tool_use",
    index,
    toolId: event.data.id,
    toolName: event.data.name,
    toolInputJson: "",
  };

  return [
    {
      ...state,
      pendingContents: {
        ...state.pendingContents,
        [index]: pendingContent,
      },
    },
    [],
  ];
}

/**
 * Handle input_json_delta event
 */
function handleInputJsonDelta(
  state: Readonly<MessageAssemblerState>,
  event: InputJsonDeltaEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const index = 1; // Tool use uses index 1
  const existingContent = state.pendingContents[index];

  if (!existingContent || existingContent.type !== "tool_use") {
    // No pending tool_use content, ignore
    return [state, []];
  }

  const pendingContent: PendingContent = {
    ...existingContent,
    toolInputJson: (existingContent.toolInputJson || "") + event.data.partialJson,
  };

  return [
    {
      ...state,
      pendingContents: {
        ...state.pendingContents,
        [index]: pendingContent,
      },
    },
    [],
  ];
}

/**
 * Handle tool_use_content_block_stop event
 */
function handleToolUseContentBlockStop(
  state: Readonly<MessageAssemblerState>,
  event: ToolUseContentBlockStopEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const index = 1;
  const pendingContent = state.pendingContents[index];

  if (!pendingContent || pendingContent.type !== "tool_use") {
    return [state, []];
  }

  // Parse tool input JSON
  let toolInput: Record<string, unknown> = {};
  try {
    toolInput = pendingContent.toolInputJson ? JSON.parse(pendingContent.toolInputJson) : {};
  } catch {
    // Failed to parse, use empty object
    toolInput = {};
  }

  // Create output events
  const outputs: MessageAssemblerOutput[] = [];

  // 1. Emit tool_call event
  const toolCallEvent: ToolCallEvent = {
    type: "tool_call",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: Date.now(),
    data: {
      id: pendingContent.toolId!,
      name: pendingContent.toolName!,
      input: toolInput,
    },
  };
  outputs.push(toolCallEvent);

  // 2. Emit tool_use_message event
  const toolCall: ToolCallPart = {
    type: "tool-call",
    id: pendingContent.toolId!,
    name: pendingContent.toolName!,
    input: toolInput,
  };

  const toolResult: ToolResultPart = {
    type: "tool-result",
    id: pendingContent.toolId!,
    name: pendingContent.toolName!,
    output: {
      type: "text",
      value: "", // Will be filled by tool execution
    },
  };

  const toolUseMessage: ToolUseMessage = {
    id: generateId(),
    role: "tool-use",
    toolCall,
    toolResult,
    timestamp: Date.now(),
  };

  const toolUseEvent: ToolUseMessageEvent = {
    type: "tool_use_message",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: Date.now(),
    data: toolUseMessage,
  };
  outputs.push(toolUseEvent);

  // Remove from pending
  const { [index]: _, ...remainingContents } = state.pendingContents;

  return [
    {
      ...state,
      pendingContents: remainingContents,
    },
    outputs,
  ];
}

/**
 * Handle message_stop event
 */
function handleMessageStop(
  state: Readonly<MessageAssemblerState>,
  event: MessageStopEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  if (!state.currentMessageId) {
    return [state, []];
  }

  // Assemble all text content
  const textParts: string[] = [];
  const sortedContents = Object.values(state.pendingContents).sort((a, b) => a.index - b.index);

  for (const pending of sortedContents) {
    if (pending.type === "text" && pending.textDeltas) {
      textParts.push(pending.textDeltas.join(""));
    }
  }

  const content = textParts.join("");

  // Skip empty messages
  if (!content || content.trim().length === 0) {
    return [createInitialMessageAssemblerState(), []];
  }

  // Create AssistantMessage
  const assistantMessage: AssistantMessage = {
    id: state.currentMessageId,
    role: "assistant",
    content,
    timestamp: state.messageStartTime || Date.now(),
    usage: event.data.usage,
  };

  // Emit AssistantMessageEvent
  const assistantEvent: AssistantMessageEvent = {
    type: "assistant_message",
    uuid: generateId(),
    agentId: event.agentId,
    timestamp: Date.now(),
    data: assistantMessage,
  };

  // Reset state, OUTPUT is the goal!
  return [createInitialMessageAssemblerState(), [assistantEvent]];
}

/**
 * MessageAssembler Processor Definition
 */
export const messageAssemblerProcessorDef: ProcessorDefinition<
  MessageAssemblerState,
  MessageAssemblerInput,
  MessageAssemblerOutput
> = {
  name: "MessageAssembler",
  description: "Assembles complete messages from stream events",
  initialState: createInitialMessageAssemblerState,
  processor: messageAssemblerProcessor,
};
