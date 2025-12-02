/**
 * ContainerView Component Stories
 *
 * Demonstrates the pure UI layout component with mock data.
 * For real backend integration, use Studio stories.
 */

import type { Meta, StoryObj } from "@storybook/react";
import type { Message } from "@agentxjs/types";

import { ContainerView } from "./ContainerView";
import type { AgentDefinitionItem, SessionItem } from "./types";

const meta: Meta<typeof ContainerView> = {
  title: "Container/ContainerView",
  component: ContainerView,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof ContainerView>;

// Mock data
const mockDefinitions: AgentDefinitionItem[] = [
  {
    name: "Claude",
    description: "General purpose assistant",
    icon: "C",
    color: "bg-blue-500",
    isOnline: true,
    activeSessionCount: 2,
  },
  {
    name: "GPT-4",
    description: "Code expert",
    icon: "G",
    color: "bg-green-500",
    isOnline: true,
    activeSessionCount: 0,
  },
  {
    name: "Gemini",
    description: "Multimodal assistant",
    icon: "G",
    color: "bg-purple-500",
    isOnline: false,
    activeSessionCount: 1,
  },
];

// Mock user ID
const MOCK_USER_ID = "user_default";

// Mock image IDs
const MOCK_IMAGE_IDS = {
  claude: "image_claude_abc123",
  gpt4: "image_gpt4_def456",
  gemini: "image_gemini_ghi789",
};

const mockSessions: SessionItem[] = [
  {
    sessionId: "session_1",
    userId: MOCK_USER_ID,
    imageId: MOCK_IMAGE_IDS.claude,
    title: "Code Refactoring",
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 1800000,
    preview: "Help me refactor this function...",
    unreadCount: 2,
  },
  {
    sessionId: "session_2",
    userId: MOCK_USER_ID,
    imageId: MOCK_IMAGE_IDS.claude,
    title: "API Design",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 43200000,
    preview: "What's the best approach for...",
  },
  {
    sessionId: "session_3",
    userId: MOCK_USER_ID,
    imageId: MOCK_IMAGE_IDS.claude,
    title: "Weekly Report",
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 86400000,
    preview: "Summary of this week's progress",
  },
];

const mockMessages: Message[] = [
  {
    id: "msg_1",
    role: "user",
    subtype: "user",
    content: "Hello, can you help me with code refactoring?",
    timestamp: Date.now() - 60000,
  },
  {
    id: "msg_2",
    role: "assistant",
    subtype: "assistant",
    content:
      "Of course! I'd be happy to help you with code refactoring. Please share the code you'd like to refactor, and let me know what specific improvements you're looking for.",
    timestamp: Date.now() - 50000,
  },
];

/**
 * Complete studio with all panes and mock data
 */
export const CompleteStudio: Story = {
  render: () => (
    <div className="h-screen bg-background">
      <ContainerView
        definitions={mockDefinitions}
        sessions={mockSessions}
        currentDefinition={mockDefinitions[0]}
        currentSession={mockSessions[0]}
        messages={mockMessages}
        isLoading={false}
        onSelectDefinition={(def) => console.log("Select definition:", def.name)}
        onSelectSession={(session) => console.log("Select session:", session.sessionId)}
        onCreateSession={() => console.log("Create session")}
        onDeleteSession={(id) => console.log("Delete session:", id)}
        onAddDefinition={() => console.log("Add definition")}
        onSend={(text) => console.log("Send:", text)}
      />
    </div>
  ),
};

/**
 * With streaming text
 */
export const WithStreaming: Story = {
  render: () => (
    <div className="h-screen bg-background">
      <ContainerView
        definitions={mockDefinitions}
        sessions={mockSessions}
        currentDefinition={mockDefinitions[0]}
        currentSession={mockSessions[0]}
        messages={mockMessages}
        streaming="I'm currently typing a response that will appear character by character..."
        isLoading={true}
        onSelectDefinition={(def) => console.log("Select definition:", def.name)}
        onSelectSession={(session) => console.log("Select session:", session.sessionId)}
        onCreateSession={() => console.log("Create session")}
        onDeleteSession={(id) => console.log("Delete session:", id)}
        onAddDefinition={() => console.log("Add definition")}
        onSend={(text) => console.log("Send:", text)}
      />
    </div>
  ),
};

/**
 * Empty state - no sessions
 */
export const NoSessions: Story = {
  render: () => (
    <div className="h-screen bg-background">
      <ContainerView
        definitions={mockDefinitions}
        sessions={[]}
        currentDefinition={mockDefinitions[0]}
        currentSession={null}
        messages={[]}
        isLoading={false}
        onSelectDefinition={(def) => console.log("Select definition:", def.name)}
        onSelectSession={(session) => console.log("Select session:", session.sessionId)}
        onCreateSession={() => console.log("Create session")}
        onDeleteSession={(id) => console.log("Delete session:", id)}
        onAddDefinition={() => console.log("Add definition")}
        onSend={(text) => console.log("Send:", text)}
      />
    </div>
  ),
};

/**
 * Empty state - no definitions
 */
export const NoDefinitions: Story = {
  render: () => (
    <div className="h-screen bg-background">
      <ContainerView
        definitions={[]}
        sessions={[]}
        currentDefinition={null}
        currentSession={null}
        messages={[]}
        isLoading={false}
        onSelectDefinition={(def) => console.log("Select definition:", def.name)}
        onSelectSession={(session) => console.log("Select session:", session.sessionId)}
        onCreateSession={() => console.log("Create session")}
        onDeleteSession={(id) => console.log("Delete session:", id)}
        onAddDefinition={() => console.log("Add definition")}
        onSend={(text) => console.log("Send:", text)}
      />
    </div>
  ),
};
