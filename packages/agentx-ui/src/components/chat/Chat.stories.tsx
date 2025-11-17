import type { Meta, StoryObj } from "@storybook/react";
import { useState, useEffect, type ReactNode } from "react";
import { Chat } from "./Chat";
import { WebSocketBrowserAgent } from "@deepractice-ai/agentx-framework/browser";
import type { AgentService } from "@deepractice-ai/agentx-framework/browser";

/**
 * Wrapper component to handle agent initialization
 */
function ChatStory({ children, agent }: { children: (agent: AgentService) => ReactNode; agent: AgentService }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    agent
      .initialize()
      .then(() => {
        console.log("[Story] Agent initialized successfully");
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error("[Story] Failed to initialize agent:", error);
      });

    return () => {
      agent.destroy().catch((error) => {
        console.error("[Story] Failed to destroy agent:", error);
      });
    };
  }, [agent]);

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-2">Initializing agent...</div>
          <div className="text-sm text-gray-500">Connecting to ws://localhost:5200/ws</div>
        </div>
      </div>
    );
  }

  return <>{children(agent)}</>;
}

const meta: Meta<typeof Chat> = {
  title: "Chat/Chat",
  component: Chat,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Complete chat interface with real Agent integration. Connects to WebSocket server and streams responses from Claude API in real-time.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Chat>;

/**
 * Live chat with real Agent
 *
 * Prerequisites:
 * 1. Start dev server: `pnpm dev:server`
 * 2. Server runs on ws://localhost:5200/ws
 * 3. Type a message and get real AI responses!
 */
export const LiveChat: Story = {
  render: () => {
    const [agent] = useState(() =>
      WebSocketBrowserAgent.create({
        url: "ws://localhost:5200/ws",
        sessionId: `story-chat-${Date.now()}`,
      } as any)
    );

    return (
      <ChatStory agent={agent}>
        {(agent) => (
          <div className="h-screen">
            <Chat agent={agent} />
          </div>
        )}
      </ChatStory>
    );
  },
};

/**
 * Live chat with logging enabled
 *
 * Check browser console to see:
 * - WebSocket connection events
 * - Message events
 * - Streaming events
 * - Error events
 */
export const WithLogging: Story = {
  render: () => {
    const [agent] = useState(() =>
      WebSocketBrowserAgent.create({
        url: "ws://localhost:5200/ws",
        sessionId: `story-debug-${Date.now()}`,
      } as any)
    );

    return (
      <ChatStory agent={agent}>
        {(agent) => (
          <div className="h-screen">
            <Chat agent={agent} />
          </div>
        )}
      </ChatStory>
    );
  },
};

/**
 * Chat with initial messages
 *
 * Start with some conversation history
 */
export const WithInitialMessages: Story = {
  render: () => {
    const [agent] = useState(() =>
      WebSocketBrowserAgent.create({
        url: "ws://localhost:5200/ws",
        sessionId: `story-history-${Date.now()}`,
      } as any)
    );

    return (
      <ChatStory agent={agent}>
        {(agent) => (
          <div className="h-screen">
            <Chat
              agent={agent}
              initialMessages={[
                {
                  id: "1",
                  role: "user",
                  content: "Hello! What can you help me with?",
                  timestamp: Date.now() - 60000,
                },
                {
                  id: "2",
                  role: "assistant",
                  content:
                    "Hello! I can help you with a variety of tasks including coding, answering questions, and providing explanations. What would you like to know?",
                  timestamp: Date.now() - 30000,
                },
              ]}
            />
          </div>
        )}
      </ChatStory>
    );
  },
};

/**
 * Chat with send callback
 *
 * Log messages when user sends them
 */
export const WithSendCallback: Story = {
  render: () => {
    const [agent] = useState(() =>
      WebSocketBrowserAgent.create({
        url: "ws://localhost:5200/ws",
        sessionId: `story-callback-${Date.now()}`,
      } as any)
    );

    const handleMessageSend = (message: string) => {
      console.log("User sent:", message);
      console.log("Timestamp:", new Date().toISOString());
    };

    return (
      <ChatStory agent={agent}>
        {(agent) => (
          <div className="h-screen">
            <Chat agent={agent} onMessageSend={handleMessageSend} />
          </div>
        )}
      </ChatStory>
    );
  },
};

/**
 * Compact chat (smaller viewport)
 */
export const CompactView: Story = {
  render: () => {
    const [agent] = useState(() =>
      WebSocketBrowserAgent.create({
        url: "ws://localhost:5200/ws",
        sessionId: `story-compact-${Date.now()}`,
      } as any)
    );

    return (
      <ChatStory agent={agent}>
        {(agent) => (
          <div className="h-[600px] border rounded-lg">
            <Chat agent={agent} />
          </div>
        )}
      </ChatStory>
    );
  },
};

/**
 * Side-by-side chats (multiple agents)
 */
export const SideBySide: Story = {
  render: () => {
    const [agent1] = useState(() =>
      WebSocketBrowserAgent.create({
        url: "ws://localhost:5200/ws",
        sessionId: `story-left-${Date.now()}`,
      } as any)
    );

    const [agent2] = useState(() =>
      WebSocketBrowserAgent.create({
        url: "ws://localhost:5200/ws",
        sessionId: `story-right-${Date.now()}`,
      } as any)
    );

    return (
      <div className="h-screen flex gap-4 p-4">
        <ChatStory agent={agent1}>
          {(agent) => (
            <div className="flex-1 border rounded-lg overflow-hidden">
              <Chat agent={agent} />
            </div>
          )}
        </ChatStory>
        <ChatStory agent={agent2}>
          {(agent) => (
            <div className="flex-1 border rounded-lg overflow-hidden">
              <Chat agent={agent} />
            </div>
          )}
        </ChatStory>
      </div>
    );
  },
};

/**
 * Embedded in layout
 */
export const InLayout: Story = {
  render: () => {
    const [agent] = useState(() =>
      WebSocketBrowserAgent.create({
        url: "ws://localhost:5200/ws",
        sessionId: `story-layout-${Date.now()}`,
      } as any)
    );

    return (
      <ChatStory agent={agent}>
        {(agent) => (
          <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="h-14 border-b flex items-center px-4 bg-white dark:bg-gray-800">
              <h1 className="font-semibold text-lg">Deepractice Agent</h1>
            </div>

            {/* Chat area */}
            <div className="flex-1">
              <Chat agent={agent} />
            </div>
          </div>
        )}
      </ChatStory>
    );
  },
};
