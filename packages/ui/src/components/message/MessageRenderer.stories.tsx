/**
 * MessageRenderer Stories
 *
 * Demonstrates the Chain of Responsibility pattern for message rendering.
 */

import type { Meta, StoryObj } from "@storybook/react";
import type {
  Message,
  UserMessage,
  AssistantMessage,
  ToolCallMessage,
  ToolResultMessage,
  ErrorMessage,
} from "agentxjs";
import { MessageRenderer } from "./MessageRenderer";

const meta: Meta<typeof MessageRenderer> = {
  title: "Message/MessageRenderer",
  component: MessageRenderer,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    message: {
      description: "Message to render (uses Chain of Responsibility pattern)",
    },
  },
};

export default meta;
type Story = StoryObj<typeof MessageRenderer>;

// ============================================================================
// Mock Data
// ============================================================================

const userMessage: UserMessage = {
  id: "msg-1",
  role: "user",
  subtype: "user",
  content: "Hello, can you help me with TypeScript?",
  timestamp: Date.now(),
};

const assistantMessage: AssistantMessage = {
  id: "msg-2",
  role: "assistant",
  subtype: "assistant",
  content:
    "Of course! I'd be happy to help you with TypeScript. What specific question do you have?",
  timestamp: Date.now(),
};

const assistantWithCodeMessage: AssistantMessage = {
  id: "msg-3",
  role: "assistant",
  subtype: "assistant",
  content: `Here's a simple TypeScript example:

\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}
\`\`\`

This shows how to define an interface and use it for type checking.`,
  timestamp: Date.now(),
};

const toolCallMessage: ToolCallMessage = {
  id: "msg-4",
  role: "assistant",
  subtype: "tool-call",
  toolCall: {
    type: "tool-call",
    id: "tool-1",
    name: "Read",
    input: {
      file_path: "/Users/sean/example.ts",
    },
  },
  timestamp: Date.now(),
};

const toolResultMessage: ToolResultMessage = {
  id: "msg-5",
  role: "tool",
  subtype: "tool-result",
  toolCallId: "tool-1",
  toolResult: {
    type: "tool-result",
    id: "tool-1",
    name: "Read",
    output: {
      type: "text",
      value: "export function hello() { return 'Hello World'; }",
    },
  },
  timestamp: Date.now() + 500,
};

const errorMessage: ErrorMessage = {
  id: "msg-6",
  role: "error",
  subtype: "error",
  content: "Failed to process your request. Please try again.",
  errorCode: "API_ERROR",
  timestamp: Date.now(),
};

const unknownMessage = {
  id: "msg-7",
  role: "custom" as any,
  subtype: "custom-type" as any,
  content: "This is a custom message type that has no handler",
  timestamp: Date.now(),
} as Message;

// ============================================================================
// Stories
// ============================================================================

/**
 * User message - right-aligned with primary color
 */
export const User: Story = {
  args: {
    message: userMessage,
  },
};

/**
 * Assistant message - left-aligned with muted background
 */
export const Assistant: Story = {
  args: {
    message: assistantMessage,
  },
};

/**
 * Assistant message with code block
 */
export const AssistantWithCode: Story = {
  args: {
    message: assistantWithCodeMessage,
  },
};

/**
 * Tool call message - shows tool execution with ToolCard
 */
export const ToolCall: Story = {
  args: {
    message: toolCallMessage,
  },
};

/**
 * Tool call with result - shows completed tool execution
 */
export const ToolCallWithResult: Story = {
  args: {
    message: {
      ...toolCallMessage,
      metadata: {
        toolResult: toolResultMessage,
      },
    } as Message,
  },
};

/**
 * Error message - red styling with error code
 */
export const Error: Story = {
  args: {
    message: errorMessage,
  },
};

/**
 * Unknown message type - falls back to UnknownMessage component
 */
export const Unknown: Story = {
  args: {
    message: unknownMessage,
  },
};

/**
 * Conversation - Multiple messages in sequence
 */
export const Conversation: Story = {
  render: () => (
    <div className="space-y-4 w-[600px]">
      <MessageRenderer message={userMessage} />
      <MessageRenderer message={assistantMessage} />
      <MessageRenderer message={userMessage} />
      <MessageRenderer message={assistantWithCodeMessage} />
    </div>
  ),
};

/**
 * All message types - Demonstrates all handlers in the chain
 */
export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4 w-[600px]">
      <MessageRenderer message={userMessage} />
      <MessageRenderer message={assistantMessage} />
      <MessageRenderer message={toolCallMessage} />
      <MessageRenderer message={errorMessage} />
      <MessageRenderer message={unknownMessage} />
    </div>
  ),
};
