import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { MessagePane, type MessagePaneItem } from "./MessagePane";
import { InputPane } from "./InputPane";
import { Bot, User, Wrench, MessageSquare } from "lucide-react";

const meta: Meta<typeof MessagePane> = {
  title: "Pane/MessagePane",
  component: MessagePane,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Message display area for chat interfaces. Supports user/assistant messages, streaming text, and custom rendering.",
      },
    },
  },
  argTypes: {
    isLoading: {
      control: "boolean",
      description: "Show thinking indicator",
    },
    streamingText: {
      control: "text",
      description: "Current streaming text",
    },
  },
};

export default meta;
type Story = StoryObj<typeof MessagePane>;

// Sample messages
const sampleMessages: MessagePaneItem[] = [
  {
    id: "1",
    role: "user",
    content: "Hello! Can you help me with a coding question?",
    timestamp: Date.now() - 60000,
  },
  {
    id: "2",
    role: "assistant",
    content:
      "Of course! I'd be happy to help you with your coding question. What would you like to know?",
    timestamp: Date.now() - 55000,
  },
  {
    id: "3",
    role: "user",
    content: "How do I create a React component with TypeScript?",
    timestamp: Date.now() - 50000,
  },
  {
    id: "4",
    role: "assistant",
    content: `Here's a simple example of a React component with TypeScript:

\`\`\`tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
\`\`\`

This creates a typed Button component with:
- A required \`label\` prop
- A required \`onClick\` callback
- An optional \`disabled\` prop with a default value`,
    timestamp: Date.now() - 45000,
  },
];

const messagesWithTool: MessagePaneItem[] = [
  {
    id: "1",
    role: "user",
    content: "What's the weather like today?",
    timestamp: Date.now() - 60000,
  },
  {
    id: "2",
    role: "tool",
    content: { temperature: "72°F", conditions: "Sunny", humidity: "45%" },
    timestamp: Date.now() - 55000,
    metadata: { toolName: "get_weather" },
  },
  {
    id: "3",
    role: "assistant",
    content:
      "Based on the weather data, it's a beautiful day! The temperature is 72°F with sunny conditions and 45% humidity. Perfect weather to be outside!",
    timestamp: Date.now() - 50000,
  },
];

const messagesWithSystem: MessagePaneItem[] = [
  {
    id: "1",
    role: "system",
    content: "Conversation started",
    timestamp: Date.now() - 70000,
  },
  ...sampleMessages.slice(0, 2),
  {
    id: "sys-2",
    role: "system",
    content: "Assistant is using a new model",
    timestamp: Date.now() - 52000,
  },
  ...sampleMessages.slice(2),
];

export const Default: Story = {
  render: () => (
    <div className="h-96 w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <MessagePane items={sampleMessages} />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="h-96 w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <MessagePane
        items={[]}
        emptyState={{
          icon: <MessageSquare className="w-6 h-6" />,
          title: "Start a conversation",
          description: "Send a message to begin chatting with the assistant",
        }}
      />
    </div>
  ),
};

export const WithStreaming: Story = {
  render: () => (
    <div className="h-96 w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <MessagePane
        items={sampleMessages.slice(0, 3)}
        streamingText="Here's an example of how you can create a React component with TypeScript. First, you'll want to define your props interface..."
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows streaming text with a typing cursor indicator",
      },
    },
  },
};

export const Loading: Story = {
  render: () => (
    <div className="h-96 w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <MessagePane items={sampleMessages.slice(0, 3)} isLoading />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows thinking indicator when waiting for response",
      },
    },
  },
};

export const WithToolMessages: Story = {
  render: () => (
    <div className="h-96 w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <MessagePane items={messagesWithTool} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Displays tool call results with special styling",
      },
    },
  },
};

export const WithSystemMessages: Story = {
  render: () => (
    <div className="h-96 w-full max-w-2xl border border-border rounded-lg overflow-hidden">
      <MessagePane items={messagesWithSystem} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "System messages are displayed centered with subtle styling",
      },
    },
  },
};

export const CustomAvatars: Story = {
  render: () => {
    const customRenderAvatar = (role: MessagePaneItem["role"]) => {
      const baseClasses = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0";

      switch (role) {
        case "user":
          return (
            <div className={`${baseClasses} bg-blue-500 text-white`}>
              <User className="w-4 h-4" />
            </div>
          );
        case "assistant":
          return (
            <div className={`${baseClasses} bg-purple-500 text-white`}>
              <Bot className="w-4 h-4" />
            </div>
          );
        case "tool":
          return (
            <div className={`${baseClasses} bg-orange-500 text-white`}>
              <Wrench className="w-4 h-4" />
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="h-96 w-full max-w-2xl border border-border rounded-lg overflow-hidden">
        <MessagePane items={messagesWithTool} renderAvatar={customRenderAvatar} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Custom avatar rendering with icons instead of letters",
      },
    },
  },
};

export const FullChatInterface: Story = {
  render: () => {
    const [messages, setMessages] = React.useState<MessagePaneItem[]>(sampleMessages.slice(0, 2));
    const [isLoading, setIsLoading] = React.useState(false);
    const [streamingText, setStreamingText] = React.useState("");

    const handleSend = (text: string) => {
      // Add user message
      const userMessage: MessagePaneItem = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Simulate streaming response
      const responseText =
        "This is a simulated response to demonstrate the streaming text feature. The text appears character by character to show real-time generation.";
      let index = 0;

      setTimeout(() => {
        setIsLoading(false);
        const interval = setInterval(() => {
          if (index < responseText.length) {
            setStreamingText(responseText.slice(0, index + 1));
            index++;
          } else {
            clearInterval(interval);
            // Add complete message
            const assistantMessage: MessagePaneItem = {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: responseText,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setStreamingText("");
          }
        }, 30);
      }, 1000);
    };

    const handleStop = () => {
      setIsLoading(false);
      setStreamingText("");
    };

    return (
      <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0">
          <MessagePane items={messages} streamingText={streamingText} isLoading={isLoading} />
        </div>
        <InputPane
          onSend={handleSend}
          onStop={handleStop}
          isLoading={isLoading || !!streamingText}
          placeholder="Type a message..."
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Complete chat interface combining MessagePane with InputPane",
      },
    },
  },
};

export const ManyMessages: Story = {
  render: () => {
    const manyMessages: MessagePaneItem[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      role: i % 2 === 0 ? "user" : "assistant",
      content:
        i % 2 === 0
          ? `User message ${Math.floor(i / 2) + 1}: This is a sample user message.`
          : `Assistant response ${Math.floor(i / 2) + 1}: This is a sample assistant response with some additional text to make it longer.`,
      timestamp: Date.now() - (20 - i) * 60000,
    })) as MessagePaneItem[];

    return (
      <div className="h-96 w-full max-w-2xl border border-border rounded-lg overflow-hidden">
        <MessagePane items={manyMessages} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Scrollable message list with many messages",
      },
    },
  },
};

export const LongCodeBlock: Story = {
  render: () => {
    const messagesWithCode: MessagePaneItem[] = [
      {
        id: "1",
        role: "user",
        content: "Show me a complex TypeScript example",
        timestamp: Date.now() - 60000,
      },
      {
        id: "2",
        role: "assistant",
        content: `Here's a more complex TypeScript example with generics and utility types:

\`\`\`typescript
// Generic repository interface
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Implementation for User entity
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

class UserRepository implements Repository<User> {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async create(entity: Omit<User, 'id'>): Promise<User> {
    const id = crypto.randomUUID();
    const user: User = { ...entity, id };
    this.users.set(id, user);
    return user;
  }

  async update(id: string, entity: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error('User not found');
    const updated = { ...existing, ...entity };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}
\`\`\`

This example demonstrates:
- Generic interfaces with constraints
- Utility types like \`Omit\` and \`Partial\`
- Async/await patterns
- Map-based in-memory storage`,
        timestamp: Date.now() - 55000,
      },
    ];

    return (
      <div className="h-[500px] w-full max-w-2xl border border-border rounded-lg overflow-hidden">
        <MessagePane items={messagesWithCode} />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Messages with long code blocks are properly formatted",
      },
    },
  },
};
