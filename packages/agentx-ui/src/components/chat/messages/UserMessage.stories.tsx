import type { Meta, StoryObj } from "@storybook/react";
import { UserMessage } from "./UserMessage";

const meta: Meta<typeof UserMessage> = {
  title: "Chat/UserMessage",
  component: UserMessage,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Display a user message with avatar and text content. Supports text content and image parts.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof UserMessage>;

/**
 * Default user message with simple text
 */
export const Default: Story = {
  args: {
    message: {
      id: "1",
      role: "user",
      subtype: "user",
      content: "How do I use React hooks?",
      timestamp: Date.now(),
    },
  },
};

/**
 * Long message demonstrating text wrapping
 */
export const LongMessage: Story = {
  args: {
    message: {
      id: "2",
      role: "user",
      subtype: "user",
      content:
        "I'm working on a complex React application and I need to understand how to properly use useEffect, useState, and useCallback hooks together. Can you explain the best practices for managing side effects and state in functional components? Also, how do I prevent unnecessary re-renders and optimize performance in a large component tree?",
      timestamp: Date.now(),
    },
  },
};

/**
 * Message with code block
 */
export const WithCodeBlock: Story = {
  args: {
    message: {
      id: "3",
      role: "user",
      subtype: "user",
      content: `Here is my React component:

\`\`\`tsx
function MyComponent() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
\`\`\`

Can you help me optimize this?`,
      timestamp: Date.now(),
    },
  },
};

/**
 * Multiple user messages in sequence
 */
export const MultipleMessages: Story = {
  render: () => (
    <div className="space-y-4">
      <UserMessage
        message={{
          id: "1",
          role: "user",
          subtype: "user",
          content: "What is TypeScript?",
          timestamp: Date.now() - 60000,
        }}
      />
      <UserMessage
        message={{
          id: "2",
          role: "user",
          subtype: "user",
          content: "How do I set up a TypeScript project?",
          timestamp: Date.now() - 30000,
        }}
      />
      <UserMessage
        message={{
          id: "3",
          role: "user",
          subtype: "user",
          content: "Can you show me an example?",
          timestamp: Date.now(),
        }}
      />
    </div>
  ),
};

/**
 * Message with special characters and formatting
 */
export const WithSpecialCharacters: Story = {
  args: {
    message: {
      id: "4",
      role: "user",
      subtype: "user",
      content: "How do I use *markdown*, **bold**, and `code` in my messages?",
      timestamp: Date.now(),
    },
  },
};

/**
 * Question with multiple lines
 */
export const MultilineQuestion: Story = {
  args: {
    message: {
      id: "5",
      role: "user",
      subtype: "user",
      content: `I have several questions:

1. How do I deploy a React app?
2. What are the best hosting options?
3. How do I set up CI/CD?

Please help!`,
      timestamp: Date.now(),
    },
  },
};

/**
 * Message with array content (text parts)
 */
export const WithArrayContent: Story = {
  args: {
    message: {
      id: "6",
      role: "user",
      subtype: "user",
      content: [
        {
          type: "text",
          text: "Can you analyze this code and suggest improvements?",
        },
      ],
      timestamp: Date.now(),
    },
  },
};

/**
 * Short message
 */
export const ShortMessage: Story = {
  args: {
    message: {
      id: "7",
      role: "user",
      subtype: "user",
      content: "Thanks!",
      timestamp: Date.now(),
    },
  },
};
