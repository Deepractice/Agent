/**
 * useAgent - React hook for Agent event binding
 *
 * Image-First model:
 * - Use imageId to interact with conversations
 * - Agent is auto-activated when sending messages
 * - agentId is internal, used for event filtering
 *
 * @example
 * ```tsx
 * import { useAgent } from "@agentxjs/ui";
 *
 * function ChatPage({ agentx, imageId }) {
 *   const {
 *     messages,
 *     streaming,
 *     status,
 *     errors,
 *     send,
 *     isLoading,
 *   } = useAgent(agentx, imageId);
 *
 *   return (
 *     <div>
 *       {messages.map(m => <Message key={m.id} {...m} />)}
 *       {streaming && <StreamingText text={streaming} />}
 *       <Input onSend={send} disabled={isLoading} />
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type { AgentX, Message } from "agentxjs";
import { createLogger } from "@agentxjs/common";
import type {
  AgentStatus,
  MessageStatus,
  UIMessage,
  UIError,
  UseAgentResult,
  UseAgentOptions,
} from "./types";
import { useMessageHistory } from "./useMessageHistory";
import { useAgentEvents } from "./useAgentEvents";

const logger = createLogger("ui/useAgent");

/**
 * React hook for binding to Agent events via AgentX
 *
 * @param agentx - The AgentX instance
 * @param imageId - The image ID for the conversation
 * @param options - Optional configuration
 * @returns Reactive state and control functions
 */
export function useAgent(
  agentx: AgentX | null,
  imageId: string | null,
  options: UseAgentOptions = {}
): UseAgentResult {
  const { onSend, onError, onStatusChange } = options;

  // State
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [errors, setErrors] = useState<UIError[]>([]);

  // Track current agentId - use ref so event handlers always see latest value
  const agentIdRef = useRef<string | null>(null);
  const [agentIdState, setAgentIdState] = useState<string | null>(null);

  // Derive isLoading from status
  const isLoading =
    status === "thinking" ||
    status === "responding" ||
    status === "planning_tool" ||
    status === "awaiting_tool_result";

  // Message status update utility (stable function)
  const updateLastUserMessageStatus = useCallback(
    (messages: UIMessage[], newStatus: MessageStatus, errorCode?: string): UIMessage[] => {
      return messages.map((m, idx) => {
        // Update last user message with pending status
        if (idx === messages.length - 1 && m.role === "user" && m.metadata?.status === "pending") {
          return {
            ...m,
            metadata: {
              ...m.metadata,
              status: newStatus,
              errorCode,
              statusChangedAt: Date.now(),
            },
          };
        }
        return m;
      });
    },
    []
  );

  // Update last assistant message status
  const updateLastAssistantMessageStatus = useCallback(
    (messages: UIMessage[], newStatus: MessageStatus): UIMessage[] => {
      // Find last assistant message (iterate backwards)
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant") {
          return messages.map((m, idx) => {
            if (idx === i) {
              return {
                ...m,
                metadata: {
                  ...m.metadata,
                  status: newStatus,
                  statusChangedAt: Date.now(),
                },
              };
            }
            return m;
          });
        }
      }
      return messages;
    },
    []
  );

  // Reset state when imageId changes
  useEffect(() => {
    // When imageId changes, clear messages
    // useMessageHistory will load the actual history for this image
    setMessages([]);
    setStreaming("");
    setErrors([]);
    setStatus("idle");
    agentIdRef.current = null;
    setAgentIdState(null);
  }, [imageId]);

  // Load message history
  useMessageHistory({
    agentx,
    imageId,
    onMessagesLoaded: useCallback((loadedMessages: UIMessage[]) => {
      setMessages(loadedMessages);
    }, []),
  });

  // Event handlers for useAgentEvents
  const eventHandlers = useMemo(
    () => ({
      onTextDelta: (text: string) => {
        setStreaming((prev) => prev + text);
      },
      onStatusChange: (newStatus: AgentStatus) => {
        setStatus(newStatus);
      },
      onMessageReceived: (message: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      },
      onAssistantMessage: (message: Message) => {
        setMessages((prev) => {
          // Remove queued placeholder and add real assistant message with success status
          const filtered = prev.filter(
            (m) => !(m.role === "assistant" && m.metadata?.status !== "success")
          );
          return [
            ...filtered,
            {
              ...message,
              metadata: {
                status: "success",
                statusChangedAt: Date.now(),
              },
            } as UIMessage,
          ];
        });
      },
      onErrorMessage: (message: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      },
      onError: (error: UIError) => {
        setErrors((prev) => [...prev, error]);
      },
      updateLastUserMessageStatus: (status: MessageStatus, errorCode?: string) => {
        setMessages((prev) => updateLastUserMessageStatus(prev, status, errorCode));
      },
      updateLastAssistantMessageStatus: (status: MessageStatus) => {
        setMessages((prev) => updateLastAssistantMessageStatus(prev, status));
      },
      clearStreaming: () => {
        setStreaming("");
      },
    }),
    [updateLastUserMessageStatus, updateLastAssistantMessageStatus]
  );

  // Subscribe to agent events
  useAgentEvents({
    agentx,
    imageId,
    handlers: eventHandlers,
    onStatusChangeCallback: onStatusChange,
    onErrorCallback: onError,
  });

  // Send message
  const send = useCallback(
    async (text: string) => {
      if (!agentx || !imageId) return;

      // Clear errors on new message
      setErrors([]);
      onSend?.(text);

      // Add user message to local state immediately with pending status
      const userMessage: UIMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: "user",
        subtype: "user",
        content: text,
        timestamp: Date.now(),
        metadata: {
          status: "pending",
          statusChangedAt: Date.now(),
        },
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        // Send to agent via request - use imageId, agent auto-activates
        const response = await agentx.request("message_send_request", {
          imageId,
          content: text,
        });

        // Update agentId from response (for event filtering)
        // IMPORTANT: Set ref immediately so event handlers can use it
        if (response.data.agentId) {
          agentIdRef.current = response.data.agentId;
          setAgentIdState(response.data.agentId);
          logger.debug("Agent activated", { imageId, agentId: response.data.agentId });
        }

        // Mark as success immediately - message delivered to server
        setMessages((prev) => updateLastUserMessageStatus(prev, "success"));

        // Add queued assistant message placeholder
        const queuedAssistant: UIMessage = {
          id: `msg_assistant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          role: "assistant",
          subtype: "assistant",
          content: "",
          timestamp: Date.now(),
          metadata: {
            status: "queued",
            statusChangedAt: Date.now(),
          },
        };
        setMessages((prev) => [...prev, queuedAssistant]);
      } catch (error) {
        logger.error("Failed to send message", { imageId, error });
        // Mark as error - failed to send
        setMessages((prev) => updateLastUserMessageStatus(prev, "error", "SEND_FAILED"));
        setStatus("error");
        onStatusChange?.("error");
      }
    },
    [agentx, imageId, onSend, onStatusChange]
  );

  // Interrupt
  const interrupt = useCallback(() => {
    if (!agentx || !imageId) return;

    // Update last pending user message to interrupted status
    setMessages((prev) => updateLastUserMessageStatus(prev, "interrupted"));

    agentx.request("agent_interrupt_request", { imageId }).catch((error) => {
      logger.error("Failed to interrupt agent", { imageId, error });
    });
  }, [agentx, imageId, updateLastUserMessageStatus]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreaming("");
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  return {
    messages,
    streaming,
    status,
    errors,
    send,
    interrupt,
    isLoading,
    clearMessages,
    clearErrors,
    agentId: agentIdState,
  };
}

// Re-export types
export type {
  AgentStatus,
  MessageStatus,
  UIMessage,
  UIMessageMetadata,
  UIError,
  UseAgentResult,
  UseAgentOptions,
  AgentIdentifier,
} from "./types";
