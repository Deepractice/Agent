import type { Meta, StoryObj } from "@storybook/react";
import { ChatInput } from "./ChatInput";
import { useState } from "react";

const meta: Meta<typeof ChatInput> = {
  title: "Chat/ChatInput",
  component: ChatInput,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Auto-resizing chat input with send button. Supports Enter to send, Shift+Enter for new line, and optional image attachments.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ChatInput>;

/**
 * Default chat input with all features enabled
 */
export const Default: Story = {
  render: () => {
    const [messages, setMessages] = useState<string[]>([]);

    return (
      <div className="max-w-4xl">
        {/* Show sent messages */}
        {messages.length > 0 && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <div className="text-sm font-semibold mb-2">Sent messages:</div>
            {messages.map((msg, idx) => (
              <div key={idx} className="text-sm mb-1">
                {idx + 1}. {msg}
              </div>
            ))}
          </div>
        )}

        <ChatInput
          onSend={(text) => {
            console.log("Sent:", text);
            setMessages((prev) => [...prev, text]);
          }}
          onImageAttach={(files) => {
            console.log("Images attached:", files);
          }}
        />
      </div>
    );
  },
};

/**
 * Disabled state (e.g., while AI is responding)
 */
export const Disabled: Story = {
  render: () => (
    <div className="max-w-4xl">
      <ChatInput onSend={(text) => console.log("Sent:", text)} disabled />
    </div>
  ),
};

/**
 * Custom placeholder text
 */
export const CustomPlaceholder: Story = {
  render: () => (
    <div className="max-w-4xl">
      <ChatInput
        onSend={(text) => console.log("Sent:", text)}
        placeholder="Ask me anything about your codebase..."
      />
    </div>
  ),
};

/**
 * Without image button
 */
export const NoImageButton: Story = {
  render: () => (
    <div className="max-w-4xl">
      <ChatInput onSend={(text) => console.log("Sent:", text)} showImageButton={false} />
    </div>
  ),
};

/**
 * With default value
 */
export const WithDefaultValue: Story = {
  render: () => (
    <div className="max-w-4xl">
      <ChatInput
        onSend={(text) => console.log("Sent:", text)}
        defaultValue="How do I implement a React component?"
      />
    </div>
  ),
};

/**
 * Simulated chat interaction
 */
export const InteractiveDemo: Story = {
  render: () => {
    const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
      { role: "assistant", text: "Hello! How can I help you today?" },
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = (text: string) => {
      // Add user message
      setMessages((prev) => [...prev, { role: "user", text }]);
      setIsLoading(true);

      // Simulate AI response
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `You said: "${text}". This is a simulated response!`,
          },
        ]);
        setIsLoading(false);
      }, 1000);
    };

    return (
      <div className="max-w-4xl flex flex-col h-[600px]">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 border rounded-t-lg">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    );
  },
};

/**
 * Full-width layout
 */
export const FullWidth: Story = {
  render: () => (
    <div className="w-full">
      <ChatInput onSend={(text) => console.log("Sent:", text)} />
    </div>
  ),
  parameters: {
    layout: "fullscreen",
  },
};

/**
 * With image attachment handler
 */
export const WithImageAttachment: Story = {
  render: () => {
    const [attachedImages, setAttachedImages] = useState<File[]>([]);

    return (
      <div className="max-w-4xl">
        {/* Show attached images */}
        {attachedImages.length > 0 && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <div className="text-sm font-semibold mb-2">Attached images:</div>
            {attachedImages.map((file, idx) => (
              <div key={idx} className="text-sm mb-1 flex items-center gap-2">
                <span>📎</span>
                <span>{file.name}</span>
                <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ))}
          </div>
        )}

        <ChatInput
          onSend={(text) => {
            console.log("Sent:", text);
            console.log("With images:", attachedImages);
            setAttachedImages([]);
          }}
          onImageAttach={(files) => {
            console.log("Images attached:", files);
            setAttachedImages((prev) => [...prev, ...files]);
          }}
        />
      </div>
    );
  },
};
