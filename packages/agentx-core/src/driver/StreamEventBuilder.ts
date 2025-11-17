/**
 * StreamEventBuilder
 *
 * Helper class for building Stream events with correct structure.
 * Ensures all required fields (uuid, agentId, timestamp) are filled automatically.
 *
 * Usage:
 * ```typescript
 * const builder = new StreamEventBuilder("agent_123", "session_456");
 * const event = builder.messageStart("msg_1", "claude-3-5-sonnet");
 * ```
 */

import type {
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
  StopReason,
} from "@deepractice-ai/agentx-event";

export class StreamEventBuilder {
  constructor(private readonly agentId: string) {}

  /**
   * Create MessageStartEvent
   *
   * MUST be the first event in stream.
   *
   * @param messageId - Unique message identifier
   * @param model - Model name (e.g., "claude-3-5-sonnet-20241022")
   */
  messageStart(messageId: string, model: string): MessageStartEvent {
    return {
      type: "message_start",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      data: {
        message: {
          id: messageId,
          model,
        },
      },
    };
  }

  /**
   * Create MessageDeltaEvent
   *
   * Optional event for message-level metadata updates.
   *
   * @param stopReason - Stop reason if message is ending
   * @param stopSequence - Stop sequence that triggered the stop
   */
  messageDelta(stopReason?: StopReason, stopSequence?: string): MessageDeltaEvent {
    return {
      type: "message_delta",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      data: {
        delta: {
          stopReason,
          stopSequence,
        },
      },
    };
  }

  /**
   * Create MessageStopEvent
   *
   * MUST be the last event in stream.
   */
  messageStop(): MessageStopEvent {
    return {
      type: "message_stop",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      data: {},
    };
  }

  /**
   * Create TextContentBlockStartEvent
   *
   * Marks the beginning of a text content block.
   *
   * @param index - Content block index (usually 0)
   */
  textContentBlockStart(index: number = 0): TextContentBlockStartEvent {
    return {
      type: "text_content_block_start",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      index,
      data: {},
    };
  }

  /**
   * Create TextDeltaEvent
   *
   * Incremental text chunk. Can be called multiple times.
   *
   * @param text - Text chunk to append
   * @param index - Content block index
   */
  textDelta(text: string, index: number = 0): TextDeltaEvent {
    return {
      type: "text_delta",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      index,
      data: { text },
    };
  }

  /**
   * Create TextContentBlockStopEvent
   *
   * Marks the end of a text content block.
   *
   * @param index - Content block index
   */
  textContentBlockStop(index: number = 0): TextContentBlockStopEvent {
    return {
      type: "text_content_block_stop",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      index,
      data: {},
    };
  }

  /**
   * Create ToolUseContentBlockStartEvent
   *
   * Marks the beginning of a tool use content block.
   *
   * @param toolId - Unique tool use identifier
   * @param toolName - Name of the tool being called
   * @param index - Content block index
   */
  toolUseContentBlockStart(
    toolId: string,
    toolName: string,
    index: number = 0
  ): ToolUseContentBlockStartEvent {
    return {
      type: "tool_use_content_block_start",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      index,
      data: {
        id: toolId,
        name: toolName,
      },
    };
  }

  /**
   * Create InputJsonDeltaEvent
   *
   * Incremental JSON input for tool. Can be called multiple times.
   *
   * @param partialJson - Partial JSON string chunk
   * @param index - Content block index
   */
  inputJsonDelta(partialJson: string, index: number = 0): InputJsonDeltaEvent {
    return {
      type: "input_json_delta",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      index,
      data: { partialJson },
    };
  }

  /**
   * Create ToolUseContentBlockStopEvent
   *
   * Marks the end of a tool use content block.
   *
   * @param toolId - Tool use identifier
   * @param index - Content block index
   */
  toolUseContentBlockStop(toolId: string, index: number = 0): ToolUseContentBlockStopEvent {
    return {
      type: "tool_use_content_block_stop",
      uuid: this.generateId(),
      agentId: this.agentId,
      timestamp: Date.now(),
      index,
      data: { id: toolId },
    };
  }

  /**
   * Generate unique event ID
   */
  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
