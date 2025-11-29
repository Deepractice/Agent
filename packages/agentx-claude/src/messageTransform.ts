/**
 * SDK Message Transformation
 *
 * Transforms Claude SDK messages to AgentX StreamEvent format.
 */

import type { StreamEventType } from "@deepractice-ai/agentx-types";
import type { SDKMessage, SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { createLogger } from "@deepractice-ai/agentx-logger";
import {
  messageStart,
  messageStop,
  textContentBlockStart,
  textContentBlockStop,
  toolUseContentBlockStart,
  toolUseContentBlockStop,
  textDelta,
  inputJsonDelta,
  toolResult,
} from "./eventBuilders";

const logger = createLogger("claude/messageTransform");

/**
 * Track current content block type for proper stop event generation
 */
interface ContentBlockContext {
  currentBlockType: "text" | "tool_use" | null;
  currentBlockIndex: number;
  currentToolId: string | null;
  lastStopReason: string | null;
  lastStopSequence: string | null;
}

/**
 * Process a single stream_event from Claude SDK
 */
async function* processStreamEvent(
  agentId: string,
  sdkMsg: SDKPartialAssistantMessage,
  context: ContentBlockContext
): AsyncIterable<StreamEventType> {
  const event = sdkMsg.event;

  switch (event.type) {
    case "message_start":
      // Reset context on new message
      context.currentBlockType = null;
      context.currentBlockIndex = 0;
      context.currentToolId = null;
      context.lastStopReason = null;
      context.lastStopSequence = null;
      yield messageStart(agentId, event.message.id, event.message.model);
      break;

    case "content_block_start":
      context.currentBlockIndex = event.index;
      if (event.content_block.type === "text") {
        context.currentBlockType = "text";
        yield textContentBlockStart(agentId);
      } else if (event.content_block.type === "tool_use") {
        context.currentBlockType = "tool_use";
        context.currentToolId = event.content_block.id;
        yield toolUseContentBlockStart(agentId, event.content_block.id, event.content_block.name);
      }
      break;

    case "content_block_delta":
      if (event.delta.type === "text_delta") {
        yield textDelta(agentId, event.delta.text);
      } else if (event.delta.type === "input_json_delta") {
        yield inputJsonDelta(agentId, event.delta.partial_json);
      }
      break;

    case "content_block_stop":
      // Send appropriate stop event based on current block type
      if (context.currentBlockType === "tool_use" && context.currentToolId) {
        yield toolUseContentBlockStop(agentId, context.currentToolId);
      } else {
        yield textContentBlockStop(agentId);
      }
      // Reset current block type after stop
      context.currentBlockType = null;
      context.currentToolId = null;
      break;

    case "message_delta":
      if (event.delta.stop_reason) {
        // Track stopReason for message_stop event
        context.lastStopReason = event.delta.stop_reason;
        context.lastStopSequence = event.delta.stop_sequence || null;
      }
      break;

    case "message_stop":
      yield messageStop(
        agentId,
        context.lastStopReason || undefined,
        context.lastStopSequence || undefined
      );
      // Reset after emitting
      context.lastStopReason = null;
      context.lastStopSequence = null;
      break;
  }
}

/**
 * Transform Claude SDK messages to AgentX StreamEvents
 */
export async function* transformSDKMessages(
  agentId: string,
  sdkMessages: AsyncIterable<SDKMessage>,
  onSessionIdCaptured?: (sessionId: string) => void
): AsyncIterable<StreamEventType> {
  // Create context to track content block type across events
  const context: ContentBlockContext = {
    currentBlockType: null,
    currentBlockIndex: 0,
    currentToolId: null,
    lastStopReason: null,
    lastStopSequence: null,
  };

  for await (const sdkMsg of sdkMessages) {
    // Log raw SDK message for debugging
    logger.debug("[RAW SDK MESSAGE]", {
      type: sdkMsg.type,
      session_id: sdkMsg.session_id,
      message_id: (sdkMsg as any).message?.id,
      model: (sdkMsg as any).message?.model,
      event_type: (sdkMsg as any).event?.type,
    });

    if (sdkMsg.session_id && onSessionIdCaptured) {
      onSessionIdCaptured(sdkMsg.session_id);
    }

    switch (sdkMsg.type) {
      case "system":
        break;

      case "assistant":
        // Only check for synthetic error messages
        // All content processing is done via stream_event
        if (sdkMsg.message.model === "<synthetic>") {
          const errorText = sdkMsg.message.content
            .filter((block: any) => block.type === "text")
            .map((block: any) => block.text)
            .join(" ");
          throw new Error(`Claude SDK error: ${errorText}`);
        }
        // Ignore assistant messages - stream_event provides all necessary events
        // MessageAssembler will assemble complete messages from stream events
        break;

      case "stream_event":
        yield* processStreamEvent(agentId, sdkMsg, context);
        break;

      case "result":
        if (sdkMsg.subtype !== "success") {
          throw new Error(`Claude SDK error: ${sdkMsg.subtype}`);
        }
        break;

      case "user":
        if (sdkMsg.message && Array.isArray(sdkMsg.message.content)) {
          for (const block of sdkMsg.message.content) {
            if (block.type === "tool_result") {
              yield toolResult(agentId, block.tool_use_id, block.content, block.is_error || false);
            }
          }
        }
        break;
    }
  }
}
