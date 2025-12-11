/**
 * useAgent - React hook for Agent event binding
 *
 * Entry-first design: directly produces EntryData[] for UI rendering.
 * All events flow through a single reducer for consistent state.
 *
 * @example
 * ```tsx
 * function ChatPage({ agentx, imageId }) {
 *   const {
 *     entries,
 *     streamingText,
 *     status,
 *     send,
 *   } = useAgent(agentx, imageId);
 *
 *   return (
 *     <div>
 *       {entries.map(entry => {
 *         switch (entry.type) {
 *           case 'user':
 *             return <UserEntry key={entry.id} entry={entry} />;
 *           case 'assistant':
 *             return (
 *               <AssistantEntry
 *                 key={entry.id}
 *                 entry={entry}
 *                 streamingText={entry.status === 'streaming' ? streamingText : undefined}
 *               />
 *             );
 *           case 'error':
 *             return <ErrorEntry key={entry.id} entry={entry} />;
 *         }
 *       })}
 *     </div>
 *   );
 * }
 * ```
 */

import { useReducer, useCallback, useRef, useEffect } from "react";
import type { AgentX, Message } from "agentxjs";
import { createLogger } from "@agentxjs/common";
import type { UserEntryData, UseAgentResult, UseAgentOptions, UIError } from "./types";
import { entryReducer, initialEntryState } from "./entryReducer";

const logger = createLogger("ui/useAgent");

/**
 * Generate unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * React hook for binding to Agent events via AgentX
 */
export function useAgent(
  agentx: AgentX | null,
  imageId: string | null,
  options: UseAgentOptions = {}
): UseAgentResult {
  const { onSend, onError, onStatusChange } = options;

  // Single reducer for all entry state
  const [state, dispatch] = useReducer(entryReducer, initialEntryState);

  // Track agent ID
  const agentIdRef = useRef<string | null>(null);

  // Derive isLoading from agent status
  const isLoading =
    state.agentStatus === "thinking" ||
    state.agentStatus === "responding" ||
    state.agentStatus === "planning_tool" ||
    state.agentStatus === "awaiting_tool_result";

  // Reset state when imageId changes
  useEffect(() => {
    dispatch({ type: "RESET" });
    agentIdRef.current = null;
  }, [imageId]);

  // Load message history
  useEffect(() => {
    if (!agentx || !imageId) return;

    let mounted = true;

    agentx
      .request("image_messages_request", { imageId })
      .then((response) => {
        if (!mounted) return;
        const data = response.data as unknown as { messages: Message[] };
        if (data.messages && data.messages.length > 0) {
          dispatch({ type: "LOAD_HISTORY", messages: data.messages });
          logger.debug("Loaded messages from storage", { imageId, count: data.messages.length });
        }
      })
      .catch((err) => {
        logger.error("Failed to load messages", { imageId, error: err });
      });

    return () => {
      mounted = false;
    };
  }, [agentx, imageId]);

  // Subscribe to agent events
  useEffect(() => {
    if (!agentx || !imageId) return;

    const unsubscribes: Array<() => void> = [];

    // Helper to check if event is for this image
    const isForThisImage = (event: { context?: { imageId?: string } }): boolean => {
      return event.context?.imageId === imageId;
    };

    // Stream events - message_start (creates new assistant entry)
    unsubscribes.push(
      agentx.on("message_start", (event) => {
        if (!isForThisImage(event)) return;
        const data = event.data as { messageId: string };
        // Create new assistant entry for each backend message
        const entryId = `assistant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        dispatch({ type: "ASSISTANT_ENTRY_START", id: entryId });
        dispatch({ type: "ASSISTANT_ENTRY_MESSAGE_START", messageId: data.messageId });
      })
    );

    // Stream events - text_delta
    unsubscribes.push(
      agentx.on("text_delta", (event) => {
        if (!isForThisImage(event)) return;
        const data = event.data as { text: string };
        dispatch({ type: "ASSISTANT_ENTRY_TEXT_DELTA", text: data.text });
      })
    );

    // State events - conversation lifecycle
    unsubscribes.push(
      agentx.on("conversation_start", (event) => {
        if (!isForThisImage(event)) return;
        dispatch({ type: "AGENT_STATUS", status: "thinking" });
        dispatch({ type: "ASSISTANT_ENTRY_STATUS", status: "thinking" });
        onStatusChange?.("thinking");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_thinking", (event) => {
        if (!isForThisImage(event)) return;
        dispatch({ type: "AGENT_STATUS", status: "thinking" });
        dispatch({ type: "ASSISTANT_ENTRY_STATUS", status: "thinking" });
        onStatusChange?.("thinking");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_responding", (event) => {
        if (!isForThisImage(event)) return;
        dispatch({ type: "AGENT_STATUS", status: "responding" });
        dispatch({ type: "ASSISTANT_ENTRY_STATUS", status: "streaming" });
        onStatusChange?.("responding");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_end", (event) => {
        if (!isForThisImage(event)) return;
        dispatch({ type: "AGENT_STATUS", status: "idle" });
        onStatusChange?.("idle");
      })
    );

    unsubscribes.push(
      agentx.on("tool_executing", (event) => {
        if (!isForThisImage(event)) return;
        dispatch({ type: "AGENT_STATUS", status: "planning_tool" });
        onStatusChange?.("planning_tool");
      })
    );

    // Message events
    unsubscribes.push(
      agentx.on("assistant_message", (event) => {
        if (!isForThisImage(event)) return;
        const message = event.data as Message;
        dispatch({ type: "ASSISTANT_ENTRY_COMPLETE", message });
      })
    );

    unsubscribes.push(
      agentx.on("tool_call_message", (event) => {
        if (!isForThisImage(event)) return;
        const message = event.data as Message;
        dispatch({
          type: "TOOL_BLOCK_ADD",
          message: message as import("agentxjs").ToolCallMessage,
        });
      })
    );

    unsubscribes.push(
      agentx.on("tool_result_message", (event) => {
        if (!isForThisImage(event)) return;
        const message = event.data as Message;
        dispatch({
          type: "TOOL_BLOCK_RESULT",
          message: message as import("agentxjs").ToolResultMessage,
        });
      })
    );

    unsubscribes.push(
      agentx.on("error_message", (event) => {
        if (!isForThisImage(event)) return;
        const message = event.data as Message;
        dispatch({ type: "ERROR_ENTRY_ADD", message });
      })
    );

    // Error events
    unsubscribes.push(
      agentx.on("error_occurred", (event) => {
        if (!isForThisImage(event)) return;
        const error = event.data as UIError;
        dispatch({ type: "ERROR_ADD", error });
        dispatch({ type: "AGENT_STATUS", status: "error" });
        dispatch({ type: "USER_ENTRY_STATUS", status: "error", errorCode: error.code });
        onError?.(error);
        onStatusChange?.("error");
      })
    );

    logger.debug("Subscribed to agent events", { imageId });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
      logger.debug("Unsubscribed from agent events", { imageId });
    };
  }, [agentx, imageId, onStatusChange, onError]);

  // Send message
  const send = useCallback(
    async (text: string) => {
      if (!agentx || !imageId) return;

      // Clear errors
      dispatch({ type: "ERRORS_CLEAR" });
      onSend?.(text);

      // Add user entry immediately
      const userEntry: UserEntryData = {
        type: "user",
        id: generateId("user"),
        content: text,
        timestamp: Date.now(),
        status: "pending",
      };
      dispatch({ type: "USER_ENTRY_ADD", entry: userEntry });

      try {
        // Send to agent
        const response = await agentx.request("message_send_request", {
          imageId,
          content: text,
        });

        // Update agent ID
        if (response.data.agentId) {
          agentIdRef.current = response.data.agentId;
          logger.debug("Agent activated", { imageId, agentId: response.data.agentId });
        }

        // Mark user entry as success
        dispatch({ type: "USER_ENTRY_STATUS", status: "success" });

        // Assistant entry will be created by message_start event
      } catch (error) {
        logger.error("Failed to send message", { imageId, error });
        dispatch({ type: "USER_ENTRY_STATUS", status: "error", errorCode: "SEND_FAILED" });
        dispatch({ type: "AGENT_STATUS", status: "error" });
        onStatusChange?.("error");
      }
    },
    [agentx, imageId, onSend, onStatusChange]
  );

  // Interrupt
  const interrupt = useCallback(() => {
    if (!agentx || !imageId) return;

    dispatch({ type: "USER_ENTRY_STATUS", status: "interrupted" });

    agentx.request("agent_interrupt_request", { imageId }).catch((error) => {
      logger.error("Failed to interrupt agent", { imageId, error });
    });
  }, [agentx, imageId]);

  // Clear entries
  const clearEntries = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    dispatch({ type: "ERRORS_CLEAR" });
  }, []);

  return {
    entries: state.entries,
    streamingText: state.streamingText,
    status: state.agentStatus,
    errors: state.errors,
    send,
    interrupt,
    isLoading,
    clearEntries,
    clearErrors,
    agentId: agentIdRef.current,
  };
}

// Re-export types
export type {
  AgentStatus,
  EntryData,
  UserEntryData,
  AssistantEntryData,
  ErrorEntryData,
  ToolBlockData,
  UserEntryStatus,
  AssistantEntryStatus,
  UIError,
  UseAgentResult,
  UseAgentOptions,
} from "./types";
