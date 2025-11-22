/**
 * Chat - Complete chat interface with real Agent integration
 *
 * Features:
 * - Real-time streaming from Claude API
 * - Message history
 * - Auto-scroll
 * - Agent status indicator
 * - Image attachment support
 * - Full event handling using new Framework API
 *
 * @example
 * ```tsx
 * import { SSEAgent } from '@deepractice-ai/agentx-framework/browser';
 *
 * const agent = SSEAgent.create({
 *   serverUrl: 'http://localhost:5200',
 *   sessionId: 'my-session',
 * });
 *
 * await agent.initialize();
 * <Chat agent={agent} />
 * ```
 */

import { useState, useEffect } from "react";
import type { AgentService } from "@deepractice-ai/agentx-framework";
import type { Message } from "@deepractice-ai/agentx-framework";
import type { ErrorMessage as ErrorMessageType } from "@deepractice-ai/agentx-framework";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ErrorMessage } from "./messages/ErrorMessage";
import { AgentStatusIndicator } from "../agent/AgentStatusIndicator";
import { UIReactor } from "../agent/UIReactor";
import { LoggerFactory } from "../../../dev-tools/WebSocketLogger";

const logger = LoggerFactory.getLogger("Chat");

export interface ChatProps {
  /**
   * Agent instance from agentx-framework
   */
  agent: AgentService;

  /**
   * Initial messages to display
   */
  initialMessages?: Message[];

  /**
   * Callback when message is sent
   */
  onMessageSend?: (message: string) => void;

  /**
   * Custom className
   */
  className?: string;
}

export function Chat({ agent, initialMessages = [], onMessageSend, className = "" }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState("");
  const [errors, setErrors] = useState<ErrorMessageType[]>([]);

  useEffect(() => {
    logger.info("Setting up event listeners using agent.registerReactor()");

    let unsubscribe: (() => void) | null = null;

    // Register UIReactor for data accumulation (messages, streaming, errors)
    agent
      .registerReactor(
        UIReactor.create({
          setStreaming,
          setMessages,
          setErrors,
          logger,
        })
      )
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch((error) => {
        logger.error("Failed to register UIReactor", { error });
      });

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          logger.error("Failed to unsubscribe UIReactor", { error });
        }
      }
    };
  }, [agent]);

  const handleSend = async (text: string) => {
    logger.info("handleSend called", { text });

    // Clear errors on new message
    setErrors([]);
    onMessageSend?.(text);

    // Add user message to local state immediately (for instant UI feedback)
    // Server will NOT echo it back - user_message is client-to-server only
    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      await agent.queue(text);
      logger.info("Queue completed");
    } catch (error) {
      logger.error("Queue failed", { error });
    }
  };

  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* Messages area */}
      <ChatMessageList messages={messages} streamingText={streaming} />

      {/* Agent status indicator (shows when agent is working) */}
      <div className="px-2 sm:px-4 md:px-4">
        <AgentStatusIndicator agent={agent} />
      </div>

      {/* Error messages (above input) */}
      {errors.length > 0 && (
        <div className="px-2 sm:px-4 md:px-4 pb-2 max-w-4xl mx-auto w-full space-y-2">
          {errors.map((error) => (
            <ErrorMessage key={error.id} error={error} showDetails={true} />
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-2 sm:p-4 md:p-4 flex-shrink-0 pb-2 sm:pb-4 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSend} disabled={false} />
        </div>
      </div>
    </div>
  );
}
