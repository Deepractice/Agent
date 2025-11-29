import type { Meta, StoryObj } from "@storybook/react";
import { SystemMessage } from "./SystemMessage";

const meta: Meta<typeof SystemMessage> = {
  title: "Chat/SystemMessage",
  component: SystemMessage,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Display a system message or notification with neutral styling. Used for system prompts, configuration messages, and status updates.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SystemMessage>;

/**
 * Default system prompt
 */
export const SystemPrompt: Story = {
  args: {
    message: {
      id: "1",
      role: "system",
      subtype: "system",
      content:
        "You are a helpful AI assistant specialized in software development. You provide clear, accurate, and actionable advice to help developers solve problems.",
      timestamp: Date.now(),
    },
  },
};

/**
 * System notification about session start
 */
export const SessionStart: Story = {
  args: {
    message: {
      id: "2",
      role: "system",
      subtype: "system",
      content: "New conversation started. All previous context has been cleared.",
      timestamp: Date.now(),
    },
  },
};

/**
 * Configuration message
 */
export const Configuration: Story = {
  args: {
    message: {
      id: "3",
      role: "system",
      subtype: "system",
      content:
        "Configuration loaded: Model: claude-3-5-sonnet-20241022 | Temperature: 0.7 | Max tokens: 4096",
      timestamp: Date.now(),
    },
  },
};

/**
 * System warning message
 */
export const Warning: Story = {
  args: {
    message: {
      id: "4",
      role: "system",
      subtype: "system",
      content:
        "Warning: API rate limit approaching. Please reduce request frequency to avoid throttling.",
      timestamp: Date.now(),
    },
  },
};

/**
 * Feature announcement
 */
export const FeatureAnnouncement: Story = {
  args: {
    message: {
      id: "5",
      role: "system",
      subtype: "system",
      content:
        "New feature enabled: Image analysis is now available. You can attach images to your messages for AI analysis.",
      timestamp: Date.now(),
    },
  },
};

/**
 * System prompt with detailed instructions
 */
export const DetailedInstructions: Story = {
  args: {
    message: {
      id: "6",
      role: "system",
      subtype: "system",
      content: `You are an expert TypeScript developer. Follow these guidelines:

1. Always use proper TypeScript types
2. Prefer functional programming patterns
3. Write clean, readable code with comments
4. Follow the project's coding standards
5. Include error handling in all examples`,
      timestamp: Date.now(),
    },
  },
};

/**
 * Context update notification
 */
export const ContextUpdate: Story = {
  args: {
    message: {
      id: "7",
      role: "system",
      subtype: "system",
      content:
        "Context updated: Added 3 files to working memory (Button.tsx, Input.tsx, Modal.tsx)",
      timestamp: Date.now(),
    },
  },
};

/**
 * Token usage information
 */
export const TokenUsage: Story = {
  args: {
    message: {
      id: "8",
      role: "system",
      subtype: "system",
      content: "Token usage: 1,234 / 100,000 (1.2% of context window used)",
      timestamp: Date.now(),
    },
  },
};

/**
 * System initialization message
 */
export const SystemInitialized: Story = {
  args: {
    message: {
      id: "9",
      role: "system",
      subtype: "system",
      content: "System initialized with default settings. Ready to assist.",
      timestamp: Date.now(),
    },
  },
};

/**
 * Multiple system messages in sequence
 */
export const MultipleMessages: Story = {
  render: () => (
    <div className="space-y-4">
      <SystemMessage
        message={{
          id: "1",
          role: "system",
          subtype: "system",
          content: "Session started at 2:30 PM",
          timestamp: Date.now() - 120000,
        }}
      />
      <SystemMessage
        message={{
          id: "2",
          role: "system",
          subtype: "system",
          content: "Model switched to claude-3-5-sonnet-20241022",
          timestamp: Date.now() - 60000,
        }}
      />
      <SystemMessage
        message={{
          id: "3",
          role: "system",
          subtype: "system",
          content: "Project context loaded: /Users/dev/my-app",
          timestamp: Date.now(),
        }}
      />
    </div>
  ),
};

/**
 * Error notification
 */
export const ErrorNotification: Story = {
  args: {
    message: {
      id: "10",
      role: "system",
      subtype: "system",
      content: "Error: Failed to load configuration file. Using default settings.",
      timestamp: Date.now(),
    },
  },
};

/**
 * Connection status
 */
export const ConnectionStatus: Story = {
  args: {
    message: {
      id: "11",
      role: "system",
      subtype: "system",
      content: "Connected to Anthropic API (Status: Healthy | Latency: 42ms)",
      timestamp: Date.now(),
    },
  },
};

/**
 * Session end notification
 */
export const SessionEnd: Story = {
  args: {
    message: {
      id: "12",
      role: "system",
      subtype: "system",
      content: "Session ended. Total messages: 24 | Duration: 15 minutes | Tokens used: 12,456",
      timestamp: Date.now(),
    },
  },
};

/**
 * Update available message
 */
export const UpdateAvailable: Story = {
  args: {
    message: {
      id: "13",
      role: "system",
      subtype: "system",
      content: "Update available: Version 0.2.0 is now available. Current version: 0.1.5",
      timestamp: Date.now(),
    },
  },
};

/**
 * Short system notification
 */
export const ShortNotification: Story = {
  args: {
    message: {
      id: "14",
      role: "system",
      subtype: "system",
      content: "Ready.",
      timestamp: Date.now(),
    },
  },
};
