import type { Meta, StoryObj } from "@storybook/react";
import { ChatMessageList } from "./ChatMessageList";

const meta: Meta<typeof ChatMessageList> = {
  title: "Chat/ChatMessageList",
  component: ChatMessageList,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Scrollable list of chat messages with auto-scroll, empty state, and loading indicator.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ChatMessageList>;

/**
 * Empty state - shows welcome message
 */
export const Empty: Story = {
  args: {
    messages: [],
  },
};

/**
 * Single user message
 */
export const SingleMessage: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "user",
        subtype: "user",
        content: "Hello, how are you?",
        timestamp: Date.now(),
      },
    ],
  },
};

/**
 * Simple conversation
 */
export const SimpleConversation: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "user",
        subtype: "user",
        content: "What is React?",
        timestamp: Date.now() - 180000,
      },
      {
        id: "2",
        role: "assistant",
        subtype: "assistant",
        content:
          "React is a JavaScript library for building user interfaces. It was created by Facebook and is now maintained by Meta.",
        timestamp: Date.now() - 120000,
      },
      {
        id: "3",
        role: "user",
        subtype: "user",
        content: "Can you show me an example?",
        timestamp: Date.now() - 60000,
      },
      {
        id: "4",
        role: "assistant",
        subtype: "assistant",
        content: `Sure! Here's a simple component:

\`\`\`tsx
function Welcome() {
  return <h1>Hello, World!</h1>;
}
\`\`\``,
        timestamp: Date.now(),
      },
    ],
  },
};

/**
 * Conversation with streaming message
 */
export const WithStreaming: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "user",
        subtype: "user",
        content: "Explain useState hook",
        timestamp: Date.now() - 120000,
      },
      {
        id: "2",
        role: "assistant",
        subtype: "assistant",
        content:
          "The useState hook is a fundamental React hook that allows you to add state to function components.",
        timestamp: Date.now() - 60000,
      },
      {
        id: "3",
        role: "user",
        subtype: "user",
        content: "Show me an example",
        timestamp: Date.now() - 30000,
      },
    ],
    streamingText: "Here's how to use useState:\n\n```tsx\nfunction Counter() {\n  const [count",
  },
};

/**
 * Long conversation that requires scrolling
 */
export const LongConversation: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "user",
        subtype: "user",
        content: "I want to learn React. Where should I start?",
        timestamp: Date.now() - 540000,
      },
      {
        id: "2",
        role: "assistant",
        subtype: "assistant",
        content:
          "Great choice! Start with understanding components, JSX, and props. These are the foundations of React.",
        timestamp: Date.now() - 480000,
      },
      {
        id: "3",
        role: "user",
        subtype: "user",
        content: "What are components?",
        timestamp: Date.now() - 420000,
      },
      {
        id: "4",
        role: "assistant",
        subtype: "assistant",
        content: `Components are the building blocks of React applications. They are reusable pieces of UI.

There are two types:
1. Function components (modern approach)
2. Class components (legacy)

Here's a simple function component:

\`\`\`tsx
function Greeting() {
  return <h1>Hello!</h1>;
}
\`\`\``,
        timestamp: Date.now() - 360000,
      },
      {
        id: "5",
        role: "user",
        subtype: "user",
        content: "What about props?",
        timestamp: Date.now() - 300000,
      },
      {
        id: "6",
        role: "assistant",
        subtype: "assistant",
        content: `Props (short for "properties") are how you pass data to components.

\`\`\`tsx
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}

// Usage
<Greeting name="Alice" />
\`\`\``,
        timestamp: Date.now() - 240000,
      },
      {
        id: "7",
        role: "user",
        subtype: "user",
        content: "How do I manage state?",
        timestamp: Date.now() - 180000,
      },
      {
        id: "8",
        role: "assistant",
        subtype: "assistant",
        content: `Use the \`useState\` hook for state management:

\`\`\`tsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
\`\`\`

The \`useState\` hook returns:
- Current state value
- Function to update state`,
        timestamp: Date.now() - 120000,
      },
      {
        id: "9",
        role: "user",
        subtype: "user",
        content: "What about side effects?",
        timestamp: Date.now() - 60000,
      },
      {
        id: "10",
        role: "assistant",
        subtype: "assistant",
        content: `For side effects, use the \`useEffect\` hook:

\`\`\`tsx
function Example() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // This runs after render
    fetchData().then(setData);
  }, []); // Empty array means "run once"

  return <div>{data}</div>;
}
\`\`\``,
        timestamp: Date.now(),
      },
    ],
  },
};

/**
 * Conversation with code examples
 */
export const WithCodeExamples: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "user",
        subtype: "user",
        content: "Show me different React patterns",
        timestamp: Date.now() - 60000,
      },
      {
        id: "2",
        role: "assistant",
        subtype: "assistant",
        content: `Here are some common React patterns:

**1. Conditional Rendering**
\`\`\`tsx
{isLoggedIn ? <Dashboard /> : <Login />}
\`\`\`

**2. List Rendering**
\`\`\`tsx
{items.map(item => (
  <Item key={item.id} {...item} />
))}
\`\`\`

**3. Event Handling**
\`\`\`tsx
<button onClick={() => handleClick()}>
  Click me
</button>
\`\`\``,
        timestamp: Date.now(),
      },
    ],
  },
};

/**
 * Waiting for response
 */
export const WaitingForResponse: Story = {
  args: {
    messages: [
      {
        id: "1",
        role: "user",
        subtype: "user",
        content: "Explain React hooks in detail",
        timestamp: Date.now() - 5000,
      },
    ],
  },
};

/**
 * Interactive demo with fixed height
 */
export const FixedHeight: Story = {
  render: () => (
    <div className="h-[600px] border rounded-lg flex flex-col">
      <ChatMessageList
        messages={[
          {
            id: "1",
            role: "user",
            subtype: "user",
            content: "Hello!",
            timestamp: Date.now() - 180000,
          },
          {
            id: "2",
            role: "assistant",
            subtype: "assistant",
            content: "Hi! How can I help you today?",
            timestamp: Date.now() - 120000,
          },
          {
            id: "3",
            role: "user",
            subtype: "user",
            content: "I want to learn React",
            timestamp: Date.now() - 60000,
          },
          {
            id: "4",
            role: "assistant",
            subtype: "assistant",
            content: "Great! React is a powerful library for building user interfaces.",
            timestamp: Date.now(),
          },
        ]}
      />
    </div>
  ),
};
