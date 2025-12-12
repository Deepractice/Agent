import type { Meta, StoryObj } from "@storybook/react";
import { AssistantEntry } from "./AssistantEntry";
import type { AssistantConversationData, TextBlockData, ToolBlockData } from "./types";

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

// Text blocks
const streamingTextBlock: TextBlockData = {
  type: "text",
  id: "text_001",
  content: "",
  timestamp: Date.now(),
  status: "streaming",
};

const completedTextBlock: TextBlockData = {
  type: "text",
  id: "text_002",
  content:
    "I'd be happy to help you with that! Here's what you need to know about TypeScript generics...",
  timestamp: Date.now(),
  status: "completed",
};

// Tool blocks
const executingToolBlock: ToolBlockData = {
  type: "tool",
  id: "tool_001",
  toolCallId: "toolu_01ABC",
  name: "Bash",
  input: { command: "ls -la" },
  timestamp: Date.now(),
  status: "executing",
};

const successToolBlock: ToolBlockData = {
  type: "tool",
  id: "tool_002",
  toolCallId: "toolu_02DEF",
  name: "Bash",
  input: { command: "echo 'done'" },
  timestamp: Date.now(),
  status: "success",
  output: "done",
  duration: 0.15,
};

const errorToolBlock: ToolBlockData = {
  type: "tool",
  id: "tool_003",
  toolCallId: "toolu_03GHI",
  name: "Bash",
  input: { command: "cat /missing" },
  timestamp: Date.now(),
  status: "error",
  output: "No such file",
  duration: 0.02,
};

// Conversation entries
const streamingEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_001",
  messageIds: [],
  timestamp: Date.now(),
  status: "streaming",
  blocks: [streamingTextBlock],
};

const completedEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_002",
  messageIds: ["msg_002"],
  timestamp: Date.now(),
  status: "completed",
  blocks: [completedTextBlock],
};

const withToolsEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_003",
  messageIds: ["msg_003"],
  timestamp: Date.now(),
  status: "completed",
  blocks: [
    {
      type: "text",
      id: "text_003",
      content: "Let me check that for you.",
      timestamp: Date.now(),
      status: "completed",
    },
    successToolBlock,
  ],
};

const withMultipleToolsEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_004",
  messageIds: ["msg_004"],
  timestamp: Date.now(),
  status: "completed",
  blocks: [
    {
      type: "text",
      id: "text_004",
      content: "I'll run a few commands to help you.",
      timestamp: Date.now(),
      status: "completed",
    },
    successToolBlock,
    errorToolBlock,
  ],
};

const streamingWithToolEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_005",
  messageIds: [],
  timestamp: Date.now(),
  status: "streaming",
  blocks: [executingToolBlock],
};

const toolOnlyEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_006",
  messageIds: ["msg_006"],
  timestamp: Date.now(),
  status: "completed",
  blocks: [successToolBlock, { ...successToolBlock, id: "tool_004", toolCallId: "toolu_04JKL" }],
};

const longContentEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_007",
  messageIds: ["msg_007"],
  timestamp: Date.now(),
  status: "completed",
  blocks: [
    {
      type: "text",
      id: "text_007",
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
    },
  ],
};

// Text then Tool then Text (the key use case)
const textToolTextEntry: AssistantConversationData = {
  type: "assistant",
  id: "msg_008",
  messageIds: ["msg_008a", "msg_008b"],
  timestamp: Date.now(),
  status: "completed",
  blocks: [
    {
      type: "text",
      id: "text_008a",
      content: "Let me check the files first...",
      timestamp: Date.now(),
      status: "completed",
    },
    successToolBlock,
    {
      type: "text",
      id: "text_008b",
      content: "Great! Here are the results. The command completed successfully.",
      timestamp: Date.now(),
      status: "completed",
    },
  ],
};

export const Streaming: Story = {
  args: {
    entry: streamingEntry,
    streamingText: "",
    currentTextBlockId: "text_001",
  },
};

export const StreamingWithText: Story = {
  args: {
    entry: streamingEntry,
    streamingText: "I'm thinking about your question...",
    currentTextBlockId: "text_001",
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

export const TextToolText: Story = {
  args: {
    entry: textToolTextEntry,
  },
};

export const ConversationFlow: Story = {
  render: () => (
    <div className="space-y-4">
      <AssistantEntry entry={completedEntry} />
      <AssistantEntry entry={withToolsEntry} />
      <AssistantEntry entry={textToolTextEntry} />
      <AssistantEntry
        entry={streamingEntry}
        streamingText="Processing..."
        currentTextBlockId="text_001"
      />
    </div>
  ),
};
