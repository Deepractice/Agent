/**
 * messageAssemblerProcessor
 *
 * Pure Mealy transition function that assembles complete Message Layer events
 * from Stream Layer events.
 *
 * Input Events (Stream Layer):
 * - message_start
 * - text_delta
 * - tool_use_start
 * - input_json_delta
 * - tool_use_stop
 * - tool_result
 * - message_stop
 *
 * Output Events (Message Layer):
 * - tool_call_message (Message - AI's request to call a tool)
 * - tool_result_message (Message - tool execution result)
 * - assistant_message (Message - complete assistant response)
 */

import type { Processor, ProcessorDefinition } from "~/engine/mealy";
import type {
  // Input: StreamEvent (from agent layer)
  StreamEvent,
  MessageStartEvent,
  TextDeltaEvent,
  ToolUseStartEvent,
  InputJsonDeltaEvent,
  ToolResultEvent,
  MessageStopEvent,
  // Output: Message events
  AssistantMessageEvent,
  ToolCallMessageEvent,
  ToolResultMessageEvent,
  ErrorMessageEvent,
  // Message types
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  ErrorMessage,
  // Content parts
  TextPart,
  ToolCallPart,
  ToolResultPart,
} from "@agentxjs/types/agent";

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
 * Pending tool call info (for matching with tool_result)
 */
export interface PendingToolCall {
  id: string;
  name: string;
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

  /**
   * Pending tool calls waiting for results
   * Key is the tool call ID
   */
  pendingToolCalls: Record<string, PendingToolCall>;
}

/**
 * Initial state factory for MessageAssembler
 */
export function createInitialMessageAssemblerState(): MessageAssemblerState {
  return {
    currentMessageId: null,
    messageStartTime: null,
    pendingContents: {},
    pendingToolCalls: {},
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
export type MessageAssemblerOutput =
  | AssistantMessageEvent
  | ToolCallMessageEvent
  | ToolResultMessageEvent
  | ErrorMessageEvent;

/**
 * Input event types for MessageAssembler
 */
export type MessageAssemblerInput = StreamEvent;

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

    case "tool_use_start":
      return handleToolUseStart(state, input);

    case "input_json_delta":
      return handleInputJsonDelta(state, input);

    case "tool_use_stop":
      return handleToolUseStop(state, input);

    case "tool_result":
      return handleToolResult(state, input);

    case "message_stop":
      return handleMessageStop(state, input);

    case "error_received":
      return handleErrorReceived(state, input);

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
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const data = event.data as MessageStartEvent["data"];
  return [
    {
      ...state,
      currentMessageId: data.messageId,
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
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const data = event.data as TextDeltaEvent["data"];
  const index = 0; // Text content uses index 0
  const existingContent = state.pendingContents[index];

  const pendingContent: PendingContent =
    existingContent?.type === "text"
      ? {
          ...existingContent,
          textDeltas: [...(existingContent.textDeltas || []), data.text],
        }
      : {
          type: "text",
          index,
          textDeltas: [data.text],
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
 * Handle tool_use_start event
 */
function handleToolUseStart(
  state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const data = event.data as ToolUseStartEvent["data"];
  const index = 1; // Tool use uses index 1

  const pendingContent: PendingContent = {
    type: "tool_use",
    index,
    toolId: data.toolCallId,
    toolName: data.toolName,
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
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const data = event.data as InputJsonDeltaEvent["data"];
  const index = 1; // Tool use uses index 1
  const existingContent = state.pendingContents[index];

  if (!existingContent || existingContent.type !== "tool_use") {
    // No pending tool_use content, ignore
    return [state, []];
  }

  const pendingContent: PendingContent = {
    ...existingContent,
    toolInputJson: (existingContent.toolInputJson || "") + data.partialJson,
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
 * Handle tool_use_stop event
 *
 * Emits:
 * - tool_call_message (Message Event) - for UI display and tool execution
 */
function handleToolUseStop(
  state: Readonly<MessageAssemblerState>,
  _event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const index = 1;
  const pendingContent = state.pendingContents[index];

  if (!pendingContent || pendingContent.type !== "tool_use") {
    return [state, []];
  }

  // Get tool info from pendingContent (saved during tool_use_start)
  const toolId = pendingContent.toolId || "";
  const toolName = pendingContent.toolName || "";

  // Parse tool input JSON (accumulated during input_json_delta)
  let toolInput: Record<string, unknown> = {};
  try {
    toolInput = pendingContent.toolInputJson ? JSON.parse(pendingContent.toolInputJson) : {};
  } catch {
    // Failed to parse, use empty object
    toolInput = {};
  }

  // Create ToolCallPart
  const toolCall: ToolCallPart = {
    type: "tool-call",
    id: toolId,
    name: toolName,
    input: toolInput,
  };

  // Create ToolCallMessage (complete Message object)
  // parentId links this tool call to its parent assistant message
  const messageId = generateId();
  const timestamp = Date.now();
  const toolCallMessage: ToolCallMessage = {
    id: messageId,
    role: "assistant",
    subtype: "tool-call",
    toolCall,
    timestamp,
    parentId: state.currentMessageId || undefined,
  };

  // Emit tool_call_message event - data is complete Message object
  const toolCallMessageEvent: ToolCallMessageEvent = {
    type: "tool_call_message",
    timestamp,
    data: toolCallMessage,
  };

  // Remove from pending contents, add to pending tool calls
  const { [index]: _, ...remainingContents } = state.pendingContents;

  return [
    {
      ...state,
      pendingContents: remainingContents,
      pendingToolCalls: {
        ...state.pendingToolCalls,
        [toolId]: { id: toolId, name: toolName },
      },
    },
    [toolCallMessageEvent],
  ];
}

/**
 * Handle tool_result event
 *
 * Emits:
 * - tool_result_message (Message Event) - for UI display
 */
function handleToolResult(
  state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const data = event.data as ToolResultEvent["data"];
  const { toolCallId, result, isError } = data;

  // Find pending tool call
  const pendingToolCall = state.pendingToolCalls[toolCallId];
  const toolName = pendingToolCall?.name || "unknown";

  // Create tool result part
  const toolResult: ToolResultPart = {
    type: "tool-result",
    id: toolCallId,
    name: toolName,
    output: {
      type: isError ? "error-text" : "text",
      value: typeof result === "string" ? result : JSON.stringify(result),
    },
  };

  // Create ToolResultMessage (complete Message object)
  const messageId = generateId();
  const timestamp = Date.now();
  const toolResultMessage: ToolResultMessage = {
    id: messageId,
    role: "tool",
    subtype: "tool-result",
    toolCallId,
    toolResult,
    timestamp,
  };

  // Emit tool_result_message event - data is complete Message object
  const toolResultMessageEvent: ToolResultMessageEvent = {
    type: "tool_result_message",
    timestamp,
    data: toolResultMessage,
  };

  // Remove from pending tool calls
  const { [toolCallId]: _, ...remainingToolCalls } = state.pendingToolCalls;

  return [
    {
      ...state,
      pendingToolCalls: remainingToolCalls,
    },
    [toolResultMessageEvent],
  ];
}

/**
 * Handle message_stop event
 */
function handleMessageStop(
  state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const data = event.data as MessageStopEvent["data"];

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

  const textContent = textParts.join("");

  // Skip empty messages (but preserve pendingToolCalls if stopReason is "tool_use")
  const stopReason = data.stopReason;
  if (!textContent || textContent.trim().length === 0) {
    const shouldPreserveToolCalls = stopReason === "tool_use";
    return [
      {
        ...createInitialMessageAssemblerState(),
        pendingToolCalls: shouldPreserveToolCalls ? state.pendingToolCalls : {},
      },
      [],
    ];
  }

  // Create content parts (new structure uses ContentPart[])
  const contentParts: TextPart[] = [
    {
      type: "text",
      text: textContent,
    },
  ];

  // Create AssistantMessage (complete Message object)
  const timestamp = state.messageStartTime || Date.now();
  const assistantMessage: AssistantMessage = {
    id: state.currentMessageId,
    role: "assistant",
    subtype: "assistant",
    content: contentParts,
    timestamp,
  };

  // Emit AssistantMessageEvent - data is complete Message object
  const assistantEvent: AssistantMessageEvent = {
    type: "assistant_message",
    timestamp,
    data: assistantMessage,
  };

  // Reset state, but preserve pendingToolCalls if stopReason is "tool_use"
  // (tool_result events arrive after message_stop in tool call scenarios)
  const shouldPreserveToolCalls = stopReason === "tool_use";

  return [
    {
      ...createInitialMessageAssemblerState(),
      pendingToolCalls: shouldPreserveToolCalls ? state.pendingToolCalls : {},
    },
    [assistantEvent],
  ];
}

/**
 * Handle error_received event
 *
 * Emits: error_message (Message Event) - for UI display
 */
function handleErrorReceived(
  _state: Readonly<MessageAssemblerState>,
  event: StreamEvent
): [MessageAssemblerState, MessageAssemblerOutput[]] {
  const data = event.data as { message: string; errorCode?: string };

  // Create ErrorMessage (complete Message object)
  const messageId = generateId();
  const timestamp = Date.now();
  const errorMessage: ErrorMessage = {
    id: messageId,
    role: "error",
    subtype: "error",
    content: data.message,
    errorCode: data.errorCode,
    timestamp,
  };

  // Emit error_message event - data is complete Message object
  const errorMessageEvent: ErrorMessageEvent = {
    type: "error_message",
    timestamp,
    data: errorMessage,
  };

  // Reset state on error
  return [createInitialMessageAssemblerState(), [errorMessageEvent]];
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
