import type { Meta, StoryObj } from "@storybook/react";
import { AssistantMessage } from "./AssistantMessage";

const meta: Meta<typeof AssistantMessage> = {
  title: "Chat/AssistantMessage",
  component: AssistantMessage,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Display an AI assistant message with avatar and rich content. Supports text, thinking process, tool calls, file attachments, and streaming mode.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AssistantMessage>;

/**
 * Default assistant message with simple text
 */
export const Default: Story = {
  args: {
    message: {
      id: "1",
      role: "assistant",
      subtype: "assistant",
      content:
        "React hooks are functions that let you use state and other React features in functional components. The most common hooks are useState, useEffect, and useContext.",
      timestamp: Date.now(),
    },
  },
};

/**
 * Message with code example
 */
export const WithCodeExample: Story = {
  args: {
    message: {
      id: "2",
      role: "assistant",
      subtype: "assistant",
      content: `Here's how to use the useState hook:

\`\`\`tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
\`\`\`

This component maintains a count state and updates it when the button is clicked.`,
      timestamp: Date.now(),
    },
  },
};

/**
 * Streaming message (with cursor animation)
 */
export const Streaming: Story = {
  args: {
    message: {
      id: "3",
      role: "assistant",
      subtype: "assistant",
      content: "I'm analyzing your code right now. Let me break down the issues I see...",
      timestamp: Date.now(),
    },
    isStreaming: true,
  },
};

/**
 * Message with markdown formatting
 */
export const WithMarkdown: Story = {
  args: {
    message: {
      id: "4",
      role: "assistant",
      subtype: "assistant",
      content: `Here are the **key benefits** of TypeScript:

1. **Type Safety** - Catch errors at compile time
2. **Better IDE Support** - IntelliSense and autocomplete
3. **Improved Refactoring** - Rename symbols with confidence
4. **Self-Documenting** - Types serve as documentation

You can also use *inline code* like \`const x: number = 5\` in your explanations.`,
      timestamp: Date.now(),
    },
  },
};

/**
 * Long response with multiple paragraphs
 */
export const LongResponse: Story = {
  args: {
    message: {
      id: "5",
      role: "assistant",
      subtype: "assistant",
      content: `To deploy a React application, you have several excellent options. Let me walk you through the most popular ones:

**Vercel** is one of the easiest platforms for deploying React apps. It's free for personal projects and offers excellent performance with automatic HTTPS and global CDN. Simply connect your GitHub repository and Vercel will automatically deploy on every push.

**Netlify** is another fantastic option that's similar to Vercel. It also offers a generous free tier, automatic deployments from Git, and built-in CI/CD. Both platforms support environment variables and custom domains.

**AWS S3 + CloudFront** is a more traditional approach that gives you more control. You can host your static files on S3 and use CloudFront as a CDN. This option is great if you're already using AWS services.

For setting up CI/CD, I recommend using GitHub Actions. You can create a workflow that builds your app, runs tests, and deploys to your chosen platform automatically whenever you push to your main branch.`,
      timestamp: Date.now(),
    },
  },
};

/**
 * Message with array content including thinking
 */
export const WithThinking: Story = {
  args: {
    message: {
      id: "6",
      role: "assistant",
      subtype: "assistant",
      content: [
        {
          type: "thinking",
          reasoning:
            "The user wants to understand how to optimize their React component. I should analyze the code for common performance issues like unnecessary re-renders and suggest using useMemo or useCallback.",
        },
        {
          type: "text",
          text: "I can see a potential performance issue in your code. The component will re-render on every count change, which is expected, but if this were a more complex component, you might want to use useMemo or useCallback to optimize expensive calculations.",
        },
      ],
      timestamp: Date.now(),
    },
  },
};

/**
 * Message with tool call
 */
export const WithToolCall: Story = {
  args: {
    message: {
      id: "7",
      role: "assistant",
      subtype: "assistant",
      content: [
        {
          type: "text",
          text: "Let me check your project structure to understand the setup better.",
        },
        {
          type: "tool-call",
          id: "call_123",
          name: "list_directory",
          input: { path: "/src" },
        },
      ],
      timestamp: Date.now(),
    },
  },
};

/**
 * Message with file attachment
 */
export const WithFile: Story = {
  args: {
    message: {
      id: "8",
      role: "assistant",
      subtype: "assistant",
      content: [
        {
          type: "text",
          text: "I've created a new configuration file for your project:",
        },
        {
          type: "file",
          filename: "tsconfig.json",
          data: btoa('{\n  "compilerOptions": {\n    "target": "ES2020"\n  }\n}'),
          mediaType: "application/json",
        },
      ],
      timestamp: Date.now(),
    },
  },
};

/**
 * Multiple assistant messages in conversation
 */
export const ConversationFlow: Story = {
  render: () => (
    <div className="space-y-4">
      <AssistantMessage
        message={{
          id: "1",
          role: "assistant",
          subtype: "assistant",
          content: "Hello! I'm your AI assistant. How can I help you today?",
          timestamp: Date.now() - 120000,
        }}
      />
      <AssistantMessage
        message={{
          id: "2",
          role: "assistant",
          subtype: "assistant",
          content:
            "TypeScript is a strongly typed programming language that builds on JavaScript. It adds optional static typing to the language, which helps catch errors early and improves code quality.",
          timestamp: Date.now() - 60000,
        }}
      />
      <AssistantMessage
        message={{
          id: "3",
          role: "assistant",
          subtype: "assistant",
          content: "I'm currently analyzing your code...",
          timestamp: Date.now(),
        }}
        isStreaming
      />
    </div>
  ),
};

/**
 * Short acknowledgment message
 */
export const ShortResponse: Story = {
  args: {
    message: {
      id: "9",
      role: "assistant",
      subtype: "assistant",
      content: "You're welcome! Feel free to ask if you have more questions.",
      timestamp: Date.now(),
    },
  },
};

/**
 * Error explanation message
 */
export const ErrorExplanation: Story = {
  args: {
    message: {
      id: "10",
      role: "assistant",
      subtype: "assistant",
      content: `I see the error in your code. The issue is that you're trying to access a property on an undefined object. Here's how to fix it:

\`\`\`tsx
// Before (causes error)
const value = obj.property;

// After (safe access)
const value = obj?.property;
\`\`\`

The optional chaining operator \`?.\` will return undefined if obj is null or undefined, preventing the error.`,
      timestamp: Date.now(),
    },
  },
};
