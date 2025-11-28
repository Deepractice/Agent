import type { Meta, StoryObj } from "@storybook/react";
import { useState, useEffect, type ReactNode } from "react";
import { Chat } from "./Chat";
import { createRemoteAgent } from "@deepractice-ai/agentx/client";
import type { Agent } from "@deepractice-ai/agentx-types";

const SERVER_URL = "http://localhost:5200/agentx";

/**
 * Create an agent on the server
 * Returns { agentId }
 */
async function createServerAgent(): Promise<{ agentId: string }> {
  const response = await fetch(`${SERVER_URL}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ definition: "ClaudeAgent" }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to create agent: ${response.status} - ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Wrapper component to handle agent creation and initialization
 *
 * Flow:
 * 1. POST /agents -> get agentId
 * 2. createRemoteAgent with agentId
 * 3. Ready for chat
 */
function ChatStory({ children }: { children: (agent: Agent) => ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let currentAgent: Agent | null = null;

    async function setup() {
      try {
        // Step 1: Create agent on server
        console.log("[Story] Creating agent...");
        const { agentId } = await createServerAgent();
        console.log("[Story] Agent created:", agentId);

        // Step 2: Create remote agent
        currentAgent = createRemoteAgent({
          serverUrl: SERVER_URL,
          agentId,
        });

        // Test all console methods
        console.log("[Story] Testing console.log");
        console.info("[Story] Testing console.info");
        console.debug("[Story] Testing console.debug");
        console.warn("[Story] Testing console.warn");

        // Enable event debugging
        currentAgent.on((event) => {
          console.log("[Browser Agent Event]", {
            type: event.type,
            timestamp: new Date().toISOString(),
            data: event.data,
          });
        });

        console.log("[Story] Remote agent created successfully");
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
          "Complete chat interface with real Agent integration. Connects to server and streams responses from Claude API in real-time.",
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
 * - Connection events
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
                subtype: "user",
                content: "Hello! What can you help me with?",
                timestamp: Date.now() - 60000,
              },
              {
                id: "2",
                role: "assistant",
                subtype: "assistant",
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
