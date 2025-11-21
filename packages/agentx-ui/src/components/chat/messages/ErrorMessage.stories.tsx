import type { Meta, StoryObj } from "@storybook/react";
import { ErrorMessage } from "./ErrorMessage";
import type { ErrorMessage as ErrorMessageType } from "@deepractice-ai/agentx-types";

const meta = {
  title: "Chat/ErrorMessage",
  component: ErrorMessage,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

// Base error template
const createError = (
  subtype: ErrorMessageType["subtype"],
  severity: ErrorMessageType["severity"],
  message: string,
  code?: string,
  recoverable = true,
  details?: unknown
): ErrorMessageType => ({
  id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  role: "error",
  subtype,
  severity,
  message,
  code,
  recoverable,
  details,
  timestamp: Date.now(),
});

/**
 * System errors - WebSocket, network, infrastructure
 */
export const SystemError: Story = {
  args: {
    error: createError("system", "error", "WebSocket connection failed", "WS_ERROR", true),
  },
};

export const SystemErrorWithDetails: Story = {
  args: {
    error: createError("system", "error", "WebSocket connection failed", "WS_ERROR", true, {
      url: "ws://localhost:5200/ws",
      reason: "Connection refused",
      stack: "Error: Connection refused\n  at WebSocket.connect (...)",
    }),
    showDetails: true,
  },
};

export const FatalSystemError: Story = {
  args: {
    error: createError(
      "system",
      "fatal",
      "Failed to reconnect after 5 attempts",
      "WS_RECONNECT_FAILED",
      false
    ),
  },
};

/**
 * LLM errors - Claude SDK errors
 */
export const LLMError: Story = {
  args: {
    error: createError("llm", "error", "Rate limit exceeded", "RATE_LIMIT", true, {
      retryAfter: 60,
      limit: 50,
      used: 51,
    }),
    showDetails: true,
  },
};

export const LLMMaxTurnsError: Story = {
  args: {
    error: createError("llm", "error", "Maximum turns (25) exceeded", "MAX_TURNS", false, {
      durationMs: 15234,
      numTurns: 25,
      totalCostUsd: 0.15,
    }),
    showDetails: true,
  },
};

/**
 * Agent errors - Agent logic errors
 */
export const AgentError: Story = {
  args: {
    error: createError("agent", "error", "Invalid message format", "INVALID_MESSAGE", true),
  },
};

/**
 * Validation errors
 */
export const ValidationError: Story = {
  args: {
    error: createError("validation", "error", "API key is required", "MISSING_API_KEY", false),
  },
};

/**
 * Warnings
 */
export const Warning: Story = {
  args: {
    error: createError(
      "system",
      "warning",
      "Connection unstable, retrying...",
      "WS_UNSTABLE",
      true
    ),
  },
};

/**
 * Unknown error
 */
export const UnknownError: Story = {
  args: {
    error: createError("unknown", "error", "An unexpected error occurred", undefined, true, {
      originalError: "TypeError: Cannot read property 'x' of undefined",
    }),
    showDetails: true,
  },
};
