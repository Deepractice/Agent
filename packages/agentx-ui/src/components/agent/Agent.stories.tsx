import type { Meta, StoryObj } from "@storybook/react";
import { useState, useEffect, type ReactNode } from "react";
import { Agent } from "./Agent";
import { Chat } from "../chat/Chat";
import { createAgentX, defineAgent } from "@deepractice-ai/agentx";
import { createSSERuntime } from "@deepractice-ai/agentx/client";
import type { Agent as AgentType } from "@deepractice-ai/agentx-types";

const SERVER_URL = "http://localhost:5200/agentx";

// Define agent for stories
const StoryAgent = defineAgent({
  name: "StoryAgent",
  description: "Agent for Storybook stories",
});

/**
 * Create an agent on the server
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
 * Hook to create and manage a remote agent
 * This demonstrates what users would do in their app
 */
function useRemoteAgentSetup() {
  const [agent, setAgent] = useState<AgentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let currentAgent: AgentType | null = null;

    async function setup() {
      try {
        console.log("[Story] Creating agent on server...");
        const { agentId } = await createServerAgent();
        console.log("[Story] Agent created:", agentId);

        // Create runtime that connects to existing agent
        const runtime = createSSERuntime({
          serverUrl: SERVER_URL,
          agentId, // Connect to the agent we just created on server
        });

        // Use unified API
        const agentx = createAgentX(runtime);
        currentAgent = agentx.agents.create(StoryAgent);

        // Debug logging
        currentAgent.on((event) => {
          console.log("[Agent Event]", {
            type: event.type,
            timestamp: new Date().toISOString(),
            data: event.data,
          });
        });

        setAgent(currentAgent);
      } catch (err) {
        console.error("[Story] Setup failed:", err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    setup();

    return () => {
      currentAgent?.destroy().catch(console.error);
    };
  }, []);

  return { agent, error };
}

/**
 * Wrapper for stories that need a real Agent connection
 */
function WithRemoteAgent({ children }: { children: (agent: AgentType) => ReactNode }) {
  const { agent, error } = useRemoteAgentSetup();

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

const meta: Meta<typeof Agent> = {
  title: "Agent/Agent",
  component: Agent,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
Integration component that binds Agent events to React state.

**Responsibilities:**
- Receive Agent instance (user manages creation/lifecycle)
- Bind events via useAgent hook
- Pass state to children via render props

**Does NOT:**
- Create Agent instances
- Manage serverUrl/agentId configuration
- Handle Agent lifecycle

**Usage:**
\`\`\`tsx
import { Agent, Chat } from "@deepractice-ai/agentx-ui";
import { createAgentX, defineAgent } from "@deepractice-ai/agentx";
import { createSSERuntime } from "@deepractice-ai/agentx/client";

// Define agent
const MyAgent = defineAgent({ name: "Assistant" });

// Create runtime and agent
const runtime = createSSERuntime({ serverUrl, agentId });
const agentx = createAgentX(runtime);
const agent = agentx.agents.create(MyAgent);

// Agent handles event binding, Chat is pure UI
<Agent agent={agent}>
  {({ messages, streaming, errors, status, isLoading, send, interrupt }) => (
    <Chat
      messages={messages}
      streaming={streaming}
      errors={errors}
      status={status}
      isLoading={isLoading}
      onSend={send}
      onAbort={interrupt}
    />
  )}
</Agent>
\`\`\`
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Agent>;

/**
 * Live chat with real AI
 *
 * Prerequisites:
 * 1. Start dev server: `pnpm dev:server`
 * 2. Server runs on http://localhost:5200
 * 3. Type a message and get real AI responses!
 */
export const LiveChat: Story = {
  render: () => (
    <WithRemoteAgent>
      {(agent) => (
        <div className="h-screen">
          <Agent agent={agent}>
            {({ messages, streaming, errors, status, isLoading, send, interrupt }) => (
              <Chat
                messages={messages}
                streaming={streaming}
                errors={errors}
                status={status}
                isLoading={isLoading}
                onSend={send}
                onAbort={interrupt}
              />
            )}
          </Agent>
        </div>
      )}
    </WithRemoteAgent>
  ),
};

/**
 * Custom render - Access all state
 *
 * Shows how to access all available state from the Agent component
 */
export const CustomRender: Story = {
  render: () => (
    <WithRemoteAgent>
      {(agent) => (
        <div className="h-screen flex flex-col">
          <Agent agent={agent}>
            {({
              messages,
              streaming,
              errors,
              status,
              isLoading,
              send,
              interrupt,
              clearMessages,
            }) => (
              <>
                {/* Custom header with controls */}
                <div className="h-14 border-b flex items-center justify-between px-4 bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-4">
                    <h1 className="font-semibold">Agent Demo</h1>
                    <span className="text-sm text-gray-500">Status: {status}</span>
                    <span className="text-sm text-gray-500">Messages: {messages.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={clearMessages}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      Clear
                    </button>
                    {isLoading && (
                      <button
                        onClick={interrupt}
                        className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat UI */}
                <div className="flex-1">
                  <Chat
                    messages={messages}
                    streaming={streaming}
                    errors={errors}
                    status={status}
                    isLoading={isLoading}
                    onSend={send}
                    onAbort={interrupt}
                  />
                </div>
              </>
            )}
          </Agent>
        </div>
      )}
    </WithRemoteAgent>
  ),
};

/**
 * Side-by-side - Multiple agents
 */
export const SideBySide: Story = {
  render: () => (
    <div className="h-screen flex gap-4 p-4">
      <WithRemoteAgent>
        {(agent) => (
          <div className="flex-1 border rounded-lg overflow-hidden">
            <Agent agent={agent}>
              {({ messages, streaming, errors, status, isLoading, send, interrupt }) => (
                <Chat
                  messages={messages}
                  streaming={streaming}
                  errors={errors}
                  status={status}
                  isLoading={isLoading}
                  onSend={send}
                  onAbort={interrupt}
                />
              )}
            </Agent>
          </div>
        )}
      </WithRemoteAgent>
      <WithRemoteAgent>
        {(agent) => (
          <div className="flex-1 border rounded-lg overflow-hidden">
            <Agent agent={agent}>
              {({ messages, streaming, errors, status, isLoading, send, interrupt }) => (
                <Chat
                  messages={messages}
                  streaming={streaming}
                  errors={errors}
                  status={status}
                  isLoading={isLoading}
                  onSend={send}
                  onAbort={interrupt}
                />
              )}
            </Agent>
          </div>
        )}
      </WithRemoteAgent>
    </div>
  ),
};

/**
 * Embedded in app layout
 */
export const InAppLayout: Story = {
  render: () => (
    <WithRemoteAgent>
      {(agent) => (
        <div className="h-screen flex flex-col">
          {/* App Header */}
          <div className="h-14 border-b flex items-center px-4 bg-white dark:bg-gray-800">
            <h1 className="font-semibold text-lg">Deepractice Agent</h1>
          </div>

          {/* Main content */}
          <div className="flex-1 flex">
            {/* Sidebar */}
            <div className="w-64 border-r p-4 bg-gray-50 dark:bg-gray-900">
              <div className="text-sm font-medium mb-2">Conversations</div>
              <div className="text-sm text-gray-500">New Chat</div>
            </div>

            {/* Chat area */}
            <div className="flex-1">
              <Agent agent={agent}>
                {({ messages, streaming, errors, status, isLoading, send, interrupt }) => (
                  <Chat
                    messages={messages}
                    streaming={streaming}
                    errors={errors}
                    status={status}
                    isLoading={isLoading}
                    onSend={send}
                    onAbort={interrupt}
                  />
                )}
              </Agent>
            </div>
          </div>
        </div>
      )}
    </WithRemoteAgent>
  ),
};
