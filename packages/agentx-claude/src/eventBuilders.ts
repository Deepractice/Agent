/**
 * Event Builders
 *
 * Utility functions for building AgentX StreamEvent objects.
 */

import type {
  MessageStartEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextContentBlockStopEvent,
  TextDeltaEvent,
  ToolUseContentBlockStartEvent,
  ToolUseContentBlockStopEvent,
  InputJsonDeltaEvent,
  ToolResultEvent,
} from "@deepractice-ai/agentx-types";

function generateUUID(): string {
  return crypto.randomUUID();
}

function createEventBase(agentId: string) {
  return {
    uuid: generateUUID(),
    agentId,
    timestamp: Date.now(),
  };
}

export function messageStart(agentId: string, id: string, model: string): MessageStartEvent {
  return {
    ...createEventBase(agentId),
    type: "message_start",
    data: { message: { id, model } },
  };
}

export function messageStop(
  agentId: string,
  stopReason?: string,
  stopSequence?: string
): MessageStopEvent {
  return {
    ...createEventBase(agentId),
    type: "message_stop",
    data: {
      stopReason: stopReason as any,
      stopSequence,
    },
  };
}

export function textContentBlockStart(agentId: string): TextContentBlockStartEvent {
  return {
    ...createEventBase(agentId),
    type: "text_content_block_start",
    data: {},
  };
}

export function textContentBlockStop(agentId: string): TextContentBlockStopEvent {
  return {
    ...createEventBase(agentId),
    type: "text_content_block_stop",
    data: {},
  };
}

export function toolUseContentBlockStop(agentId: string, id: string): ToolUseContentBlockStopEvent {
  return {
    ...createEventBase(agentId),
    type: "tool_use_content_block_stop",
    data: { id },
  };
}

export function textDelta(agentId: string, text: string): TextDeltaEvent {
  return {
    ...createEventBase(agentId),
    type: "text_delta",
    data: { text },
  };
}

export function toolUseContentBlockStart(
  agentId: string,
  toolId: string,
  toolName: string
): ToolUseContentBlockStartEvent {
  return {
    ...createEventBase(agentId),
    type: "tool_use_content_block_start",
    data: { id: toolId, name: toolName },
  };
}

export function inputJsonDelta(agentId: string, partialJson: string): InputJsonDeltaEvent {
  return {
    ...createEventBase(agentId),
    type: "input_json_delta",
    data: { partialJson },
  };
}

export function toolResult(
  agentId: string,
  toolId: string,
  content: string | any[],
  isError: boolean
): ToolResultEvent {
  return {
    ...createEventBase(agentId),
    type: "tool_result",
    data: { toolId, content, isError },
  };
}
