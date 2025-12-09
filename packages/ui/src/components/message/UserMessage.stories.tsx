/**
 * UserMessage Stories
 *
 * Demonstrates user message component with different status states
 */

import type { Meta, StoryObj } from "@storybook/react";
import { UserMessage } from "./UserMessage";
import type { UIMessage } from "~/hooks/useAgent";

const meta: Meta<typeof UserMessage> = {
  title: "Message/UserMessage",
  component: UserMessage,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof UserMessage>;

// ============================================================================
// Mock Data
// ============================================================================

const baseMessage: UIMessage = {
  id: "msg-user-1",
  role: "user",
  subtype: "user",
  content: "Hello, can you help me with TypeScript?",
  timestamp: Date.now(),
};

// ============================================================================
// Stories - Different Status States
// ============================================================================

/**
 * Default user message without status
 */
export const Default: Story = {
  args: {
    message: baseMessage,
  },
};

/**
 * User message with pending status (loading spinner)
 */
export const Pending: Story = {
  args: {
    message: {
      ...baseMessage,
      metadata: {
        status: "pending",
        statusChangedAt: Date.now(),
      },
    },
  },
};

/**
 * User message with success status (green checkmark)
 */
export const Success: Story = {
  args: {
    message: {
      ...baseMessage,
      metadata: {
        status: "success",
        statusChangedAt: Date.now(),
      },
    },
  },
};

/**
 * User message with error status (red alert icon)
 */
export const Error: Story = {
  args: {
    message: {
      ...baseMessage,
      metadata: {
        status: "error",
        errorCode: "API_ERROR",
        statusChangedAt: Date.now(),
      },
    },
  },
};

/**
 * User message with interrupted status (pause icon)
 */
export const Interrupted: Story = {
  args: {
    message: {
      ...baseMessage,
      content: "Can you explain how to...",
      metadata: {
        status: "interrupted",
        statusChangedAt: Date.now(),
      },
    },
  },
};

// ============================================================================
// Stories - Different Content
// ============================================================================

/**
 * Short message with pending status
 */
export const ShortPending: Story = {
  args: {
    message: {
      ...baseMessage,
      content: "Hi!",
      metadata: {
        status: "pending",
        statusChangedAt: Date.now(),
      },
    },
  },
};

/**
 * Long message with success status
 */
export const LongSuccess: Story = {
  args: {
    message: {
      ...baseMessage,
      content:
        "I need help understanding how to implement a complex feature in TypeScript. Can you explain the best practices for structuring a large application with multiple modules and proper type safety?",
      metadata: {
        status: "success",
        statusChangedAt: Date.now(),
      },
    },
  },
};

/**
 * Message with code and pending status
 */
export const CodePending: Story = {
  args: {
    message: {
      ...baseMessage,
      content: "Can you review this code?\n\n```typescript\nconst add = (a, b) => a + b;\n```",
      metadata: {
        status: "pending",
        statusChangedAt: Date.now(),
      },
    },
  },
};

// ============================================================================
// Stories - Status Progression
// ============================================================================

/**
 * Status progression - Pending → Success
 */
export const StatusProgression: Story = {
  render: () => (
    <div className="space-y-4 w-[600px]">
      <div className="text-sm font-medium text-muted-foreground mb-2">Status Progression:</div>
      <UserMessage
        message={{
          ...baseMessage,
          id: "msg-1",
          content: "1. Sending... (Pending)",
          metadata: {
            status: "pending",
            statusChangedAt: Date.now(),
          },
        }}
      />
      <UserMessage
        message={{
          ...baseMessage,
          id: "msg-2",
          content: "2. Received response (Success)",
          metadata: {
            status: "success",
            statusChangedAt: Date.now(),
          },
        }}
      />
      <UserMessage
        message={{
          ...baseMessage,
          id: "msg-3",
          content: "3. Request failed (Error)",
          metadata: {
            status: "error",
            errorCode: "TIMEOUT",
            statusChangedAt: Date.now(),
          },
        }}
      />
      <UserMessage
        message={{
          ...baseMessage,
          id: "msg-4",
          content: "4. User stopped request (Interrupted)",
          metadata: {
            status: "interrupted",
            statusChangedAt: Date.now(),
          },
        }}
      />
    </div>
  ),
};

/**
 * Conversation with mixed statuses
 */
export const ConversationWithStatuses: Story = {
  render: () => (
    <div className="space-y-4 w-[600px]">
      <UserMessage
        message={{
          ...baseMessage,
          id: "msg-1",
          content: "What is TypeScript?",
          metadata: {
            status: "success",
            statusChangedAt: Date.now() - 5000,
          },
        }}
      />
      <UserMessage
        message={{
          ...baseMessage,
          id: "msg-2",
          content: "Can you give me an example?",
          metadata: {
            status: "success",
            statusChangedAt: Date.now() - 3000,
          },
        }}
      />
      <UserMessage
        message={{
          ...baseMessage,
          id: "msg-3",
          content: "How about async/await?",
          metadata: {
            status: "pending",
            statusChangedAt: Date.now(),
          },
        }}
      />
    </div>
  ),
};
