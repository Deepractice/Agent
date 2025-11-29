import type { Meta, StoryObj } from "@storybook/react";
import { ErrorMessage } from "./ErrorMessage";
import type { ErrorMessage as ErrorMessageType, AgentError } from "@deepractice-ai/agentx-types";

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

// Helper to create error messages with the new structure
const createError = (
  category: AgentError["category"],
  code: string,
  message: string,
  severity: AgentError["severity"] = "error",
  recoverable = true,
  cause?: Error
): ErrorMessageType => ({
  id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  role: "system",
  subtype: "error",
  error: {
    category,
    code,
    message,
    severity,
    recoverable,
    cause,
  } as AgentError,
  timestamp: Date.now(),
});

/**
 * System errors - infrastructure, internal errors
 */
export const SystemError: Story = {
  args: {
    error: createError("system", "INTERNAL_ERROR", "An internal error occurred"),
  },
};

export const SystemErrorWithDetails: Story = {
  args: {
    error: createError(
      "system",
      "INTERNAL_ERROR",
      "An internal error occurred",
      "error",
      true,
      new Error("Connection refused")
    ),
    showDetails: true,
  },
};

export const FatalSystemError: Story = {
  args: {
    error: createError("system", "FATAL_ERROR", "Failed to initialize agent", "fatal", false),
  },
};

/**
 * Network errors - connection, timeout
 */
export const NetworkError: Story = {
  args: {
    error: createError("network", "CONNECTION_FAILED", "Failed to connect to server"),
  },
};

export const NetworkTimeoutError: Story = {
  args: {
    error: createError("network", "TIMEOUT", "Request timed out after 30 seconds", "error", true),
  },
};

/**
 * LLM errors - Claude SDK errors
 */
export const LLMError: Story = {
  args: {
    error: createError("llm", "RATE_LIMITED", "Rate limit exceeded, please try again later"),
  },
};

export const LLMContextTooLongError: Story = {
  args: {
    error: createError(
      "llm",
      "CONTEXT_TOO_LONG",
      "Message exceeds maximum context length",
      "error",
      true
    ),
  },
};

export const LLMInvalidApiKeyError: Story = {
  args: {
    error: createError("llm", "INVALID_API_KEY", "Invalid API key provided", "fatal", false),
  },
};

/**
 * Driver errors - agent driver issues
 */
export const DriverError: Story = {
  args: {
    error: createError("driver", "RECEIVE_FAILED", "Failed to process message"),
  },
};

/**
 * Validation errors
 */
export const ValidationError: Story = {
  args: {
    error: createError(
      "validation",
      "INVALID_MESSAGE",
      "Message content cannot be empty",
      "error",
      true
    ),
  },
};

export const ValidationConfigError: Story = {
  args: {
    error: createError("validation", "INVALID_CONFIG", "API key is required", "fatal", false),
  },
};

/**
 * Warnings
 */
export const Warning: Story = {
  args: {
    error: createError(
      "network",
      "CONNECTION_UNSTABLE",
      "Connection unstable, retrying...",
      "warning",
      true
    ),
  },
};
