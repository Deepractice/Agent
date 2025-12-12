import type { Meta, StoryObj } from "@storybook/react";
import { UserEntry } from "./UserEntry";
import type { UserConversationData } from "./types";

const meta: Meta<typeof UserEntry> = {
  title: "Entry/UserEntry",
  component: UserEntry,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof UserEntry>;

const pendingEntry: UserConversationData = {
  type: "user",
  id: "msg_001",
  content: "Hello, can you help me with a coding question?",
  timestamp: Date.now(),
  status: "pending",
};

const successEntry: UserConversationData = {
  type: "user",
  id: "msg_002",
  content: "What is the best way to handle async errors in TypeScript?",
  timestamp: Date.now(),
  status: "success",
};

const errorEntry: UserConversationData = {
  type: "user",
  id: "msg_003",
  content: "This message failed to send",
  timestamp: Date.now(),
  status: "error",
  errorCode: "NETWORK_ERROR",
};

const interruptedEntry: UserConversationData = {
  type: "user",
  id: "msg_004",
  content: "I interrupted this request",
  timestamp: Date.now(),
  status: "interrupted",
};

const longMessageEntry: UserConversationData = {
  type: "user",
  id: "msg_005",
  content: `I have a complex question about TypeScript generics.

Here's my code:
\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}
\`\`\`

Can you explain how this works and when I should use it?`,
  timestamp: Date.now(),
  status: "success",
};

export const Pending: Story = {
  args: {
    entry: pendingEntry,
  },
};

export const Success: Story = {
  args: {
    entry: successEntry,
  },
};

export const Error: Story = {
  args: {
    entry: errorEntry,
  },
};

export const Interrupted: Story = {
  args: {
    entry: interruptedEntry,
  },
};

export const LongMessage: Story = {
  args: {
    entry: longMessageEntry,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-4">
      <UserEntry entry={pendingEntry} />
      <UserEntry entry={successEntry} />
      <UserEntry entry={errorEntry} />
      <UserEntry entry={interruptedEntry} />
    </div>
  ),
};
