/**
 * MCP Prompt Types
 *
 * Prompt templates for Model Context Protocol.
 * Prompts are reusable message templates that can be parameterized.
 */

/**
 * Prompt Argument
 *
 * Defines a parameter for a prompt template.
 */
export interface McpPromptArgument {
  /** Argument name */
  name: string;

  /** Optional description */
  description?: string;

  /** Whether this argument is required */
  required?: boolean;
}

/**
 * Prompt Definition
 *
 * Defines a reusable prompt template.
 */
export interface McpPrompt {
  /** Prompt name (unique identifier) */
  name: string;

  /** Optional display title */
  title?: string;

  /** Optional description */
  description?: string;

  /** Prompt arguments/parameters */
  arguments?: McpPromptArgument[];
}

/**
 * Prompt Message Content Types
 */

/** Text content in prompt message */
export interface PromptTextContent {
  type: "text";
  text: string;
}

/** Image content in prompt message */
export interface PromptImageContent {
  type: "image";
  /** Base64-encoded image data */
  data: string;
  /** MIME type */
  mimeType: string;
}

/** Resource reference in prompt message */
export interface PromptResourceContent {
  type: "resource";
  resource: {
    uri: string;
    name?: string;
    title?: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  };
}

/**
 * Prompt Message
 *
 * A message in the prompt template result.
 */
export interface McpPromptMessage {
  /** Message role */
  role: "user" | "assistant";

  /** Message content */
  content: PromptTextContent | PromptImageContent | PromptResourceContent;
}

/**
 * List Prompts Result
 *
 * Response from listing available prompts.
 */
export interface ListPromptsResult {
  /** Array of available prompts */
  prompts: McpPrompt[];

  /** Pagination cursor for next page */
  nextCursor?: string;

  /** Optional metadata */
  _meta?: Record<string, unknown>;
}

/**
 * Get Prompt Result
 *
 * Response from getting a specific prompt with arguments applied.
 */
export interface GetPromptResult {
  /** Optional description */
  description?: string;

  /** Rendered prompt messages */
  messages: McpPromptMessage[];

  /** Optional metadata */
  _meta?: Record<string, unknown>;
}
