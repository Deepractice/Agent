import type { Meta, StoryObj } from "@storybook/react";
import { AssistantEntry } from "./AssistantEntry";
import type { AssistantConversationData, ToolBlockData } from "./types";

const meta: Meta<typeof AssistantEntry> = {
  title: "Entry/AssistantEntry",
  component: AssistantEntry,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AssistantEntry>;

const streamingEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_001",
  messageIds: [],
  content: "",
  timestamp: Date.now(),
  status: "streaming",
  blocks: [],
};

const completedEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_002",
  messageIds: ["msg_002"],
  content:
    "I'd be happy to help you with that! Here's what you need to know about TypeScript generics...",
  timestamp: Date.now(),
  status: "completed",
  blocks: [],
};

const executingToolBlock: ToolBlockData = {
  id: "tool_001",
  toolCallId: "toolu_01ABC",
  name: "Bash",
  input: { command: "ls -la" },
  status: "executing",
};

const successToolBlock: ToolBlockData = {
  id: "tool_002",
  toolCallId: "toolu_02DEF",
  name: "Bash",
  input: { command: "echo 'done'" },
  status: "success",
  output: "done",
  duration: 0.15,
};

const errorToolBlock: ToolBlockData = {
  id: "tool_003",
  toolCallId: "toolu_03GHI",
  name: "Bash",
  input: { command: "cat /missing" },
  status: "error",
  output: "No such file",
  duration: 0.02,
};

const withToolsEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_003",
  messageIds: ["msg_003"],
  content: "Let me check that for you.",
  timestamp: Date.now(),
  status: "completed",
  blocks: [successToolBlock],
};

const withMultipleToolsEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_004",
  messageIds: ["msg_004"],
  content: "I'll run a few commands to help you.",
  timestamp: Date.now(),
  status: "completed",
  blocks: [successToolBlock, errorToolBlock],
};

const streamingWithToolEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_005",
  messageIds: [],
  content: "",
  timestamp: Date.now(),
  status: "streaming",
  blocks: [executingToolBlock],
};

const toolOnlyEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_006",
  messageIds: ["msg_006"],
  content: "",
  timestamp: Date.now(),
  status: "completed",
  blocks: [successToolBlock, successToolBlock],
};

const longContentEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_007",
  messageIds: ["msg_007"],
  content: `Here's a detailed explanation of TypeScript generics:

## What are Generics?

Generics allow you to write flexible, reusable code that works with multiple types.

\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}

// Usage
const str = identity<string>("hello");
const num = identity<number>(42);
\`\`\`

## Benefits

1. **Type Safety**: Catch errors at compile time
2. **Reusability**: Write once, use with any type
3. **Documentation**: Self-documenting code`,
  timestamp: Date.now(),
  status: "completed",
  blocks: [],
};

export const Streaming: Story = {
  args: {
    entry: streamingEntry,
    streamingText: "",
  },
};

export const StreamingWithText: Story = {
  args: {
    entry: streamingEntry,
    streamingText: "I'm thinking about your question...",
  },
};

export const Completed: Story = {
  args: {
    entry: completedEntry,
  },
};

export const WithTool: Story = {
  args: {
    entry: withToolsEntry,
  },
};

export const WithMultipleTools: Story = {
  args: {
    entry: withMultipleToolsEntry,
  },
};

export const StreamingWithTool: Story = {
  args: {
    entry: streamingWithToolEntry,
    streamingText: "Running command...",
  },
};

export const ToolOnly: Story = {
  args: {
    entry: toolOnlyEntry,
  },
};

export const LongContent: Story = {
  args: {
    entry: longContentEntry,
  },
};

export const ConversationFlow: Story = {
  render: () => (
    <div className="space-y-4">
      <AssistantEntry entry={completedEntry} />
      <AssistantEntry entry={withToolsEntry} />
      <AssistantEntry entry={withMultipleToolsEntry} />
      <AssistantEntry entry={streamingEntry} streamingText="Processing..." />
    </div>
  ),
};
