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

import { useState, useEffect, useCallback, useRef } from "react";
import type { AgentX, SystemEvent } from "agentxjs";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("ui/useAgent");

/**
 * Agent state for UI
 */
export type AgentStatus =
  | "idle"
  | "queued"
  | "thinking"
  | "responding"
  | "tool_executing"
  | "error";

/**
 * Message for UI display
 */
export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "tool_call" | "tool_result" | "error";
  content: string | unknown;
  timestamp: number;
  /** Optional metadata (e.g., errorCode for error messages) */
  metadata?: Record<string, unknown>;
}

/**
 * Error info for UI
 */
export interface UIError {
  code: string;
  message: string;
  recoverable: boolean;
}

/**
 * Return type of useAgent hook
 */
export interface UseAgentResult {
  /**
   * All messages in the conversation
   */
  messages: UIMessage[];

  /**
   * Current streaming text (accumulates during response)
   */
  streaming: string;

  /**
   * Current agent status
   */
  status: AgentStatus;

  /**
   * Errors received
   */
  errors: UIError[];

  /**
   * Send a message to the agent
   */
  send: (text: string) => void;

  /**
   * Interrupt the current response
   */
  interrupt: () => void;

  /**
   * Whether the agent is currently processing
   */
  isLoading: boolean;

  /**
   * Clear all messages
   */
  clearMessages: () => void;

  /**
   * Clear all errors
   */
  clearErrors: () => void;

  /**
   * Current agent ID (if running)
   */
  agentId: string | null;
}

/**
 * Options for useAgent hook
 */
export interface UseAgentOptions {
  /**
   * Initial messages to display
   */
  initialMessages?: UIMessage[];

  /**
   * Callback when a message is sent
   */
  onSend?: (text: string) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: UIError) => void;

  /**
   * Callback when status changes
   */
  onStatusChange?: (status: AgentStatus) => void;
}

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
  const { initialMessages = [], onSend, onError, onStatusChange } = options;

  // State
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState("");
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [errors, setErrors] = useState<UIError[]>([]);

  // Track current agentId - use ref so event handlers always see latest value
  const agentIdRef = useRef<string | null>(null);
  const [agentIdState, setAgentIdState] = useState<string | null>(null);

  // Track if component is mounted
  const mountedRef = useRef(true);

  // Derive isLoading from status
  const isLoading =
    status === "queued" ||
    status === "thinking" ||
    status === "responding" ||
    status === "tool_executing";

  // Reset state and load messages when imageId changes
  useEffect(() => {
    setMessages(initialMessages);
    setStreaming("");
    setErrors([]);
    setStatus("idle");
    agentIdRef.current = null;
    setAgentIdState(null);

    // Load existing messages for this image
    if (agentx && imageId) {
      agentx
        .request("image_messages_request", { imageId })
        .then((response) => {
          if (!mountedRef.current) return;
          const data = response.data as {
            messages: Array<{
              id: string;
              role: "user" | "assistant" | "tool_call" | "tool_result" | "error";
              content: unknown;
              timestamp: number;
              errorCode?: string;
            }>;
          };
          if (data.messages && data.messages.length > 0) {
            const mappedMessages = data.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content as string | unknown,
              timestamp: m.timestamp,
              metadata: m.role === "error" && m.errorCode ? { errorCode: m.errorCode } : undefined,
            }));
            setMessages(mappedMessages);
            logger.debug("Loaded messages from storage", { imageId, count: mappedMessages.length });
          }
        })
        .catch((err) => {
          logger.error("Failed to load messages", { imageId, error: err });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId, agentx]);

  // Subscribe to agent events
  useEffect(() => {
    if (!agentx || !imageId) return;

    mountedRef.current = true;
    const unsubscribes: Array<() => void> = [];

    // Helper to check if event is for this image
    // Uses imageId which is known from the start (no timing issues)
    const isForThisImage = (event: SystemEvent): boolean => {
      const eventImageId = event.context?.imageId;
      return eventImageId === imageId;
    };

    // Stream events - text_delta
    unsubscribes.push(
      agentx.on("text_delta", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const data = event.data as { text: string };
        setStreaming((prev) => prev + data.text);
      })
    );

    // State events - conversation lifecycle
    unsubscribes.push(
      agentx.on("conversation_start", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        setStatus("thinking");
        onStatusChange?.("thinking");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_thinking", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        setStatus("thinking");
        onStatusChange?.("thinking");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_responding", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        setStatus("responding");
        onStatusChange?.("responding");
      })
    );

    unsubscribes.push(
      agentx.on("conversation_end", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        setStatus("idle");
        onStatusChange?.("idle");
      })
    );

    unsubscribes.push(
      agentx.on("tool_executing", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        setStatus("tool_executing");
        onStatusChange?.("tool_executing");
      })
    );

    // Message events - complete messages (now in Message type format)
    unsubscribes.push(
      agentx.on("assistant_message", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const data = event.data as {
          id: string;
          role: string;
          subtype: string;
          content: unknown;
          timestamp: number;
        };
        setStreaming(""); // Clear streaming
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [
            ...prev,
            {
              id: data.id,
              role: "assistant",
              content: data.content,
              timestamp: data.timestamp,
            },
          ];
        });
      })
    );

    unsubscribes.push(
      agentx.on("tool_call_message", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const data = event.data as {
          id: string;
          role: string;
          subtype: string;
          toolCall: unknown;
          timestamp: number;
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [
            ...prev,
            {
              id: data.id,
              role: "tool_call",
              content: data.toolCall,
              timestamp: data.timestamp,
            },
          ];
        });
      })
    );

    unsubscribes.push(
      agentx.on("tool_result_message", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const data = event.data as {
          id: string;
          role: string;
          subtype: string;
          toolResult: unknown;
          timestamp: number;
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [
            ...prev,
            {
              id: data.id,
              role: "tool_result",
              content: data.toolResult,
              timestamp: data.timestamp,
            },
          ];
        });
      })
    );

    // Error message - displayed in chat
    unsubscribes.push(
      agentx.on("error_message", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const data = event.data as {
          messageId: string;
          content: string;
          errorCode?: string;
          timestamp: number;
        };
        setStreaming(""); // Clear streaming
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.messageId)) return prev;
          return [
            ...prev,
            {
              id: data.messageId,
              role: "error",
              content: data.content,
              timestamp: data.timestamp,
              metadata: { errorCode: data.errorCode },
            },
          ];
        });
      })
    );

    // Error events
    unsubscribes.push(
      agentx.on("error_occurred", (event) => {
        if (!mountedRef.current || !isForThisImage(event)) return;
        const data = event.data as UIError;
        setErrors((prev) => [...prev, data]);
        setStreaming(""); // Clear streaming on error
        setStatus("error");
        onError?.(data);
        onStatusChange?.("error");
      })
    );

    logger.debug("Subscribed to agent events", { imageId });

    return () => {
      mountedRef.current = false;
      unsubscribes.forEach((unsub) => unsub());
      logger.debug("Unsubscribed from agent events", { imageId });
    };
  }, [agentx, imageId, onError, onStatusChange]);

  // Send message
  const send = useCallback(
    async (text: string) => {
      if (!agentx || !imageId) return;

      // Clear errors on new message
      setErrors([]);
      onSend?.(text);

      // Add user message to local state immediately
      const userMessage: UIMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setStatus("queued");
      onStatusChange?.("queued");

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
      } catch (error) {
        logger.error("Failed to send message", { imageId, error });
        setStatus("error");
        onStatusChange?.("error");
      }
    },
    [agentx, imageId, onSend, onStatusChange]
  );

  // Interrupt
  const interrupt = useCallback(() => {
    if (!agentx || !imageId) return;

    agentx.request("agent_interrupt_request", { imageId }).catch((error) => {
      logger.error("Failed to interrupt agent", { imageId, error });
    });
  }, [agentx, imageId]);

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

// Legacy support - keep AgentIdentifier type for backwards compatibility
export type AgentIdentifier = {
  imageId?: string;
};
