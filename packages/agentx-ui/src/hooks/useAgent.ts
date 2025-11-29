/**
 * useAgent - React hook for Agent event binding
 *
 * Binds to an existing Agent instance and provides reactive state
 * for messages, streaming text, errors, and agent status.
 *
 * @example
 * ```tsx
 * import { useAgent } from "@deepractice-ai/agentx-ui";
 *
 * function ChatPage({ agent }) {
 *   const {
 *     messages,
 *     streaming,
 *     status,
 *     errors,
 *     send,
 *     isLoading,
 *   } = useAgent(agent);
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
import type {
  Agent,
  AgentState,
  Message,
  ErrorMessage,
  UserMessage,
} from "@deepractice-ai/agentx-types";

/**
 * Return type of useAgent hook
 */
export interface UseAgentResult {
  /**
   * All messages in the conversation (user, assistant, tool-use, error)
   */
  messages: Message[];

  /**
   * Current streaming text (accumulates during response)
   */
  streaming: string;

  /**
   * Current agent state
   */
  status: AgentState;

  /**
   * Error messages received
   */
  errors: ErrorMessage[];

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
}

/**
 * Options for useAgent hook
 */
export interface UseAgentOptions {
  /**
   * Initial messages to display
   */
  initialMessages?: Message[];

  /**
   * Callback when a message is sent
   */
  onSend?: (text: string) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: ErrorMessage) => void;

  /**
   * Callback when status changes
   */
  onStatusChange?: (status: AgentState) => void;
}

/**
 * React hook for binding to an Agent instance
 *
 * @param agent - The Agent instance to bind to
 * @param options - Optional configuration
 * @returns Reactive state and control functions
 */
export function useAgent(agent: Agent | null, options: UseAgentOptions = {}): UseAgentResult {
  const { initialMessages = [], onSend, onError, onStatusChange } = options;

  // State
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState("");
  const [status, setStatus] = useState<AgentState>(agent?.state ?? "idle");
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  // Track if component is mounted
  const mountedRef = useRef(true);

  // Derive isLoading from status
  const isLoading =
    status === "responding" ||
    status === "thinking" ||
    status === "planning_tool" ||
    status === "awaiting_tool_result" ||
    status === "conversation_active";

  // Subscribe to agent events
  useEffect(() => {
    if (!agent) return;

    mountedRef.current = true;

    // Subscribe to events using the new react() API
    const unsubEvents = agent.react({
      // Stream layer - text deltas
      onTextDelta: (event) => {
        if (!mountedRef.current) return;
        setStreaming((prev) => prev + event.data.text);
      },

      // Message layer - complete messages
      onAssistantMessage: (event) => {
        if (!mountedRef.current) return;
        const msg = event.data;
        setStreaming(""); // Clear streaming
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      },

      onToolCallMessage: (event) => {
        if (!mountedRef.current) return;
        const msg = event.data;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      },

      onToolResultMessage: (event) => {
        if (!mountedRef.current) return;
        const msg = event.data;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      },

      // Error handling
      onError: (event) => {
        if (!mountedRef.current) return;
        const errorMsg = event.data;
        setErrors((prev) => [...prev, errorMsg]);
        setStreaming(""); // Clear streaming on error
        onError?.(errorMsg);
      },
    });

    // Subscribe to state changes
    const unsubState = agent.onStateChange((change) => {
      if (!mountedRef.current) return;
      setStatus(change.current);
      onStatusChange?.(change.current);
    });

    // Sync initial state
    setStatus(agent.state);

    return () => {
      mountedRef.current = false;
      unsubEvents();
      unsubState();
    };
  }, [agent, onError, onStatusChange]);

  // Send message
  const send = useCallback(
    (text: string) => {
      if (!agent) return;

      // Clear errors on new message
      setErrors([]);
      onSend?.(text);

      // Add user message to local state immediately
      const userMessage: UserMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: "user",
        subtype: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to agent (fire-and-forget, errors come via events)
      agent.receive(text).catch(() => {
        // Error already emitted via error_message event
        // Swallow to prevent unhandled rejection
      });
    },
    [agent, onSend]
  );

  // Interrupt
  const interrupt = useCallback(() => {
    agent?.interrupt();
  }, [agent]);

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
  };
}
