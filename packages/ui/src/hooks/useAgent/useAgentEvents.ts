/**
 * useAgentEvents - Subscribe to AgentX events
 */

import { useEffect, useRef } from "react";
import type { AgentX, SystemEvent, Message } from "agentxjs";
import { createLogger } from "@agentxjs/common";
import type { AgentStatus, UIError, MessageStatus } from "./types";

const logger = createLogger("ui/useAgentEvents");

export interface AgentEventHandlers {
  /**
   * Handle streaming text delta
   */
  onTextDelta: (text: string) => void;

  /**
   * Handle agent status change
   */
  onStatusChange: (status: AgentStatus) => void;

  /**
   * Handle message received (assistant, tool_call, tool_result)
   */
  onMessageReceived: (message: Message) => void;

  /**
   * Handle assistant message (with user message status update)
   */
  onAssistantMessage: (message: Message) => void;

  /**
   * Handle error message
   */
  onErrorMessage: (message: Message) => void;

  /**
   * Handle error occurred
   */
  onError: (error: UIError) => void;

  /**
   * Update last user message status
   */
  updateLastUserMessageStatus: (status: MessageStatus, errorCode?: string) => void;

  /**
   * Update last assistant message status
   */
  updateLastAssistantMessageStatus: (status: MessageStatus) => void;

  /**
   * Clear streaming text
   */
  clearStreaming: () => void;
}

export interface UseAgentEventsOptions {
  agentx: AgentX | null;
  imageId: string | null;
  handlers: AgentEventHandlers;
  onStatusChangeCallback?: (status: AgentStatus) => void;
  onErrorCallback?: (error: UIError) => void;
}

/**
 * Subscribe to AgentX events
 */
export function useAgentEvents({
  agentx,
  imageId,
  handlers,
  onStatusChangeCallback,
  onErrorCallback,
}: UseAgentEventsOptions) {
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!agentx || !imageId) return;

    mountedRef.current = true;
    const unsubscribes: Array<() => void> = [];

    // Helper to check if event is for this image
    const isForThisImage = (event: SystemEvent): boolean => {
      const eventImageId = event.context?.imageId;
      return eventImageId === imageId;
    };

    // Stream events - text_delta
    unsubscribes.push(
      agentx.on("text_delta", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const data = event.data as { text: string };
        handlers.onTextDelta(data.text);
      })
    );

    // State events - conversation lifecycle
    unsubscribes.push(
      agentx.on("conversation_start", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        handlers.onStatusChange("thinking");
        handlers.updateLastAssistantMessageStatus("thinking");
        onStatusChangeCallback?.("thinking");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_thinking", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        handlers.onStatusChange("thinking");
        handlers.updateLastAssistantMessageStatus("thinking");
        onStatusChangeCallback?.("thinking");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_responding", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        handlers.onStatusChange("responding");
        handlers.updateLastAssistantMessageStatus("responding");
        onStatusChangeCallback?.("responding");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_end", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        handlers.onStatusChange("idle");
        onStatusChangeCallback?.("idle");
      })
    );

    unsubscribes.push(
      agentx.on("tool_executing", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        handlers.onStatusChange("planning_tool");
        onStatusChangeCallback?.("planning_tool");
      })
    );

    // Message events - data is complete Message object
    unsubscribes.push(
      agentx.on("assistant_message", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const message = event.data as Message;
        handlers.clearStreaming();
        handlers.onAssistantMessage(message);
      })
    );

    unsubscribes.push(
      agentx.on("tool_call_message", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const message = event.data as Message;
        handlers.onMessageReceived(message);
      })
    );

    unsubscribes.push(
      agentx.on("tool_result_message", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const message = event.data as Message;
        handlers.onMessageReceived(message);
      })
    );

    // Error message - displayed in chat
    unsubscribes.push(
      agentx.on("error_message", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const message = event.data as Message;
        handlers.clearStreaming();
        handlers.onErrorMessage(message);
      })
    );

    // Error events
    unsubscribes.push(
      agentx.on("error_occurred", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const data = event.data as UIError;
        handlers.onError(data);
        handlers.clearStreaming();
        handlers.onStatusChange("error");
        handlers.updateLastUserMessageStatus("error", data.code);
        onErrorCallback?.(data);
        onStatusChangeCallback?.("error");
      })
    );

    logger.debug("Subscribed to agent events", { imageId });

    return () => {
      mountedRef.current = false;
      unsubscribes.forEach((unsub) => unsub());
      logger.debug("Unsubscribed from agent events", { imageId });
    };
  }, [agentx, imageId, handlers, onStatusChangeCallback, onErrorCallback]);
}
