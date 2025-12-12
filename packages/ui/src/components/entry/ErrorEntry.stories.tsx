import type { Meta, StoryObj } from "@storybook/react";
import { ErrorEntry } from "./ErrorEntry";
import type { ErrorConversationData } from "./types";

const meta: Meta<typeof ErrorEntry> = {
  title: "Entry/ErrorEntry",
  component: ErrorEntry,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ErrorEntry>;

const basicError: ErrorConversationData = {
  type: "error",
  id: "err_001",
  content: "Something went wrong. Please try again.",
  timestamp: Date.now(),
};

const errorWithCode: ErrorConversationData = {
  type: "error",
  id: "err_002",
  content: "Failed to connect to the server. Please check your network connection.",
  timestamp: Date.now(),
  errorCode: "CONNECTION_ERROR",
};

const rateLimitError: ErrorConversationData = {
  type: "error",
  id: "err_003",
  content: "You have exceeded the rate limit. Please wait a moment before trying again.",
  timestamp: Date.now(),
  errorCode: "RATE_LIMIT_EXCEEDED",
};

const authError: ErrorConversationData = {
  type: "error",
  id: "err_004",
  content: "Your session has expired. Please log in again to continue.",
  timestamp: Date.now(),
  errorCode: "AUTH_EXPIRED",
};

const longError: ErrorConversationData = {
  type: "error",
  id: "err_005",
  content: `An unexpected error occurred while processing your request.

Error details:
- Request ID: req_abc123
- Timestamp: 2025-01-15T10:30:00Z
- Service: agent-runtime

Please contact support if this issue persists.`,
  timestamp: Date.now(),
  errorCode: "INTERNAL_ERROR",
};

export const Basic: Story = {
  args: {
    entry: basicError,
  },
};

export const WithErrorCode: Story = {
  args: {
    entry: errorWithCode,
  },
};

export const RateLimit: Story = {
  args: {
    entry: rateLimitError,
  },
};

export const AuthExpired: Story = {
  args: {
    entry: authError,
  },
};

export const LongMessage: Story = {
  args: {
    entry: longError,
  },
};

export const AllErrors: Story = {
  render: () => (
    <div className="space-y-4">
      <ErrorEntry entry={basicError} />
      <ErrorEntry entry={errorWithCode} />
      <ErrorEntry entry={rateLimitError} />
      <ErrorEntry entry={authError} />
    </div>
  ),
};
