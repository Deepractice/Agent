import { useState, useEffect } from "react";
import type { AgentService } from "@deepractice-ai/agentx-framework";
import type { Message } from "@deepractice-ai/agentx-framework";
import type {
  ErrorMessage as ErrorMessageType,
} from "@deepractice-ai/agentx-framework";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ErrorMessage } from "./messages/ErrorMessage";
import { LoggerFactory } from "../../../dev-tools/WebSocketLogger";
import { ChatReactor } from "./ChatReactor";

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

/**
 * Chat - Complete chat interface with real Agent integration
 *
 * Features:
 * - Real-time streaming from Claude API
 * - Message history
 * - Auto-scroll
 * - Loading states
 * - Image attachment support
 * - Full event handling using new Framework API
 *
 * @example
 * ```tsx
 * import { WebSocketBrowserAgent } from '@deepractice-ai/agentx-framework/browser';
 *
 * const agent = WebSocketBrowserAgent.create({
 *   url: 'ws://localhost:5200/ws',
 *   sessionId: 'my-session',
 * });
 *
 * await agent.initialize();
 * <Chat agent={agent} />
 * ```
 */
export function Chat({ agent, initialMessages = [], onMessageSend, className = "" }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ErrorMessageType[]>([]);

  useEffect(() => {
    logger.info("Setting up event listeners using agent.registerReactor()");

    let unsubscribe: (() => void) | null = null;

    // Register ChatReactor
    agent
      .registerReactor(
        ChatReactor.create({
          setStreaming,
          setMessages,
          setIsLoading,
          setErrors,
          logger,
        })
      )
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch((error) => {
        logger.error("Failed to register ChatReactor", { error });
      });

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          logger.error("Failed to unsubscribe ChatReactor", { error });
        }
      }
    };
  }, [agent]);

  const handleSend = async (text: string) => {
    logger.info("handleSend called", { text });
    // console.trace("[Chat.handleSend] Stack trace");

    setIsLoading(true);
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
      await agent.send(text);
      logger.info("Send completed");
    } catch (error) {
      logger.error("Send failed", { error });
    }
  };

  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* Messages area */}
      <ChatMessageList messages={messages} streamingText={streaming} isLoading={isLoading} />

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
