/**
 * Chat - Complete chat interface with Agent integration
 *
 * Features:
 * - Real-time streaming from AI API
 * - Message history
 * - Auto-scroll
 * - Agent status indicator
 * - Image attachment support
 * - Full event handling using new Agent API
 *
 * @example
 * ```tsx
 * import { Chat } from "@deepractice-ai/agentx-ui";
 * import { createRemoteAgent } from "@deepractice-ai/agentx/client";
 *
 * const agent = createRemoteAgent({
 *   serverUrl: "http://localhost:5200/agentx",
 *   agentId: "my-agent",
 * });
 *
 * <Chat agent={agent} />
 * ```
 */

import type { Agent, Message } from "@deepractice-ai/agentx-types";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ErrorMessage } from "./messages/ErrorMessage";
import { AgentStatusIndicator } from "../agent/AgentStatusIndicator";
import { useAgent } from "../../hooks";

export interface ChatProps {
  /**
   * Agent instance from agentx
   */
  agent: Agent;

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
  const { messages, streaming, errors, send, isLoading } = useAgent(agent, {
    initialMessages,
    onSend: onMessageSend,
  });

  const handleSend = (text: string) => {
    send(text);
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
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
