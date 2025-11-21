import type { Meta, StoryObj } from "@storybook/react";
// import { useState, useEffect, type ReactNode } from "react";
import { Chat } from "./Chat";
// TODO: Update when agentx-sdk-browser package is implemented
// import { WebSocketBrowserAgent } from "@deepractice-ai/agentx-sdk-browser";
// import type { AgentService } from "@deepractice-ai/agentx-framework";

/**
 * Placeholder for disabled stories (waiting for agentx-sdk-browser)
 */
function DisabledStoryPlaceholder() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Story Disabled</h2>
        <p className="text-gray-600">Waiting for agentx-sdk-browser package implementation</p>
      </div>
    </div>
  );
}

/**
 * Wrapper component to handle agent initialization
 * TODO: Re-enable when agentx-sdk-browser is implemented
 */
// function ChatStory({
//   children,
//   agent,
// }: {
//   children: (agent: AgentService) => ReactNode;
//   agent: AgentService;
// }) {
//   const [isInitialized, setIsInitialized] = useState(false);
//
//   useEffect(() => {
//     agent
//       .initialize()
//       .then(() => {
//         console.log("[Story] Agent initialized successfully");
//         setIsInitialized(true);
//       })
//       .catch((error) => {
//         console.error("[Story] Failed to initialize agent:", error);
//       });
//
//     return () => {
//       agent.destroy().catch((error) => {
//         console.error("[Story] Failed to destroy agent:", error);
//       });
//     };
//   }, [agent]);
//
//   if (!isInitialized) {
//     return (
//       <div className="h-full flex items-center justify-center">
//         <div className="text-center">
//           <div className="text-lg mb-2">Initializing agent...</div>
//           <div className="text-sm text-gray-500">Connecting to ws://localhost:5200/ws</div>
//         </div>
//       </div>
//     );
//   }
//
//   return <>{children(agent)}</>;
// }

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
 *
 * TODO: Re-enable when agentx-sdk-browser is implemented
 */
export const LiveChat: Story = {
  render: () => <DisabledStoryPlaceholder />,
};

/**
 * Live chat with logging enabled
 *
 * Check browser console to see:
 * - WebSocket connection events
 * - Message events
 * - Streaming events
 * - Error events
 *
 * TODO: Re-enable when agentx-sdk-browser is implemented
 */
export const WithLogging: Story = {
  render: () => <DisabledStoryPlaceholder />,
};

/**
 * Chat with initial messages
 *
 * Start with some conversation history
 *
 * TODO: Re-enable when agentx-sdk-browser is implemented
 */
export const WithInitialMessages: Story = {
  render: () => <DisabledStoryPlaceholder />,
};

/**
 * Chat with send callback
 *
 * Log messages when user sends them
 *
 * TODO: Re-enable when agentx-sdk-browser is implemented
 */
export const WithSendCallback: Story = {
  render: () => <DisabledStoryPlaceholder />,
};

/**
 * Compact chat (smaller viewport)
 *
 * TODO: Re-enable when agentx-sdk-browser is implemented
 */
export const CompactView: Story = {
  render: () => <DisabledStoryPlaceholder />,
};

/**
 * Side-by-side chats (multiple agents)
 *
 * TODO: Re-enable when agentx-sdk-browser is implemented
 */
export const SideBySide: Story = {
  render: () => <DisabledStoryPlaceholder />,
};

/**
 * Embedded in layout
 *
 * TODO: Re-enable when agentx-sdk-browser is implemented
 */
export const InLayout: Story = {
  render: () => <DisabledStoryPlaceholder />,
};
