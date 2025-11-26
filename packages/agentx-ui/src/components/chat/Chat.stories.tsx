import type { Meta, StoryObj } from "@storybook/react";
import { useState, useEffect, type ReactNode } from "react";
import { Chat } from "./Chat";
import { SSEAgent } from "@deepractice-ai/agentx/browser";
import type { AgentInstance } from "@deepractice-ai/agentx";

const SERVER_URL = "http://localhost:5200";

/**
 * Create a session on the server
 * Returns { sessionId, sseUrl }
 */
async function createSession(): Promise<{ sessionId: string; sseUrl: string }> {
  const response = await fetch(`${SERVER_URL}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }

  return response.json();
}

/**
 * Wrapper component to handle session creation and agent initialization
 *
 * Flow:
 * 1. POST /api/session -> get sessionId
 * 2. Create SSEAgent with sessionId
 * 3. agent.initialize() -> GET /api/sse/{sessionId}
 * 4. Ready for chat
 */
function ChatStory({ children }: { children: (agent: AgentInstance) => ReactNode }) {
  const [agent, setAgent] = useState<AgentInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let currentAgent: AgentInstance | null = null;

    async function setup() {
      try {
        // Step 1: Create session on server
        console.log("[Story] Creating session...");
        const { sessionId } = await createSession();
        console.log("[Story] Session created:", sessionId);

        // Step 2: Create SSEAgent with the session ID
        currentAgent = SSEAgent.create({
          serverUrl: SERVER_URL,
          sessionId,
        } as any);

        // Step 3: Initialize agent (establishes SSE connection)
        await currentAgent.initialize();
        console.log("[Story] Agent initialized successfully");

        setAgent(currentAgent);
      } catch (err) {
        console.error("[Story] Setup failed:", err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    setup();

    return () => {
      if (currentAgent) {
        currentAgent.destroy().catch((err: Error) => {
          console.error("[Story] Failed to destroy agent:", err);
        });
      }
    };
  }, []);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-500">
          <div className="text-lg mb-2">Failed to connect</div>
          <div className="text-sm">{error}</div>
          <div className="text-xs mt-2 text-gray-500">
            Make sure the server is running: pnpm dev:server
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-2">Initializing agent...</div>
          <div className="text-sm text-gray-500">Connecting to {SERVER_URL}</div>
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
 * 2. Server runs on http://localhost:5200
 * 3. Type a message and get real AI responses!
 */
export const LiveChat: Story = {
  render: () => (
    <ChatStory>
      {(agent) => (
        <div className="h-screen">
          <Chat agent={agent} />
        </div>
      )}
    </ChatStory>
  ),
};

/**
 * Live chat with logging enabled
 *
 * Check browser console to see:
 * - SSE connection events
 * - Message events
 * - Streaming events
 * - Error events
 */
export const WithLogging: Story = {
  render: () => (
    <ChatStory>
      {(agent) => (
        <div className="h-screen">
          <Chat agent={agent} />
        </div>
      )}
    </ChatStory>
  ),
};

/**
 * Chat with initial messages
 *
 * Start with some conversation history
 */
export const WithInitialMessages: Story = {
  render: () => (
    <ChatStory>
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
  ),
};

/**
 * Chat with send callback
 *
 * Log messages when user sends them
 */
export const WithSendCallback: Story = {
  render: () => {
    const handleMessageSend = (message: string) => {
      console.log("User sent:", message);
      console.log("Timestamp:", new Date().toISOString());
    };

    return (
      <ChatStory>
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
  render: () => (
    <ChatStory>
      {(agent) => (
        <div className="h-[600px] border rounded-lg">
          <Chat agent={agent} />
        </div>
      )}
    </ChatStory>
  ),
};

/**
 * Side-by-side chats (multiple agents)
 */
export const SideBySide: Story = {
  render: () => (
    <div className="h-screen flex gap-4 p-4">
      <ChatStory>
        {(agent) => (
          <div className="flex-1 border rounded-lg overflow-hidden">
            <Chat agent={agent} />
          </div>
        )}
      </ChatStory>
      <ChatStory>
        {(agent) => (
          <div className="flex-1 border rounded-lg overflow-hidden">
            <Chat agent={agent} />
          </div>
        )}
      </ChatStory>
    </div>
  ),
};

/**
 * Embedded in layout
 */
export const InLayout: Story = {
  render: () => (
    <ChatStory>
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
  ),
};
