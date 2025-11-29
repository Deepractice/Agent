# MCP (Model Context Protocol) Context

**MCP** is a standardized protocol for connecting AI applications with external tools, resources, and prompt templates. It enables LLMs to access capabilities beyond their training data through a well-defined interface.

## Design Principles

### 1. Complete Protocol Types

MCP types in `agentx-types` define the **full protocol specification**:

- Tools - Functions the LLM can call
- Resources - Static data sources the LLM can read
- Prompts - Reusable message templates
- Transport - Connection methods (stdio, SSE, HTTP, SDK)
- Server Capabilities - Feature negotiation

### 2. Provider Agnostic

MCP is a **standard protocol**, independent of any specific LLM provider:

- Works with Claude, GPT, or any LLM
- Servers and clients can be implemented in any language
- Protocol versioning ensures compatibility

### 3. Separation from Implementation

These types define **what MCP is**, not **how to implement it**:

- Type definitions → `agentx-types/mcp` (here)
- Client implementation → `agentx-core/mcp`
- Server implementation → Application-specific

## Protocol Overview

```
┌─────────────┐                    ┌──────────────┐
│             │   MCP Protocol     │              │
│  AI Agent   │ ◄───────────────► │  MCP Server  │
│  (Client)   │                    │              │
└─────────────┘                    └──────────────┘
      │                                    │
      │  1. Initialize                    │
      │  2. List Tools/Resources/Prompts  │
      │  3. Call Tool / Read Resource     │
      │  4. Return Results                │
```

## Core Concepts

### Tools

**Tools** are functions the LLM can invoke:

```typescript
const weatherTool: McpTool = {
  name: "get_weather",
  description: "Get current weather for a location",
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City name",
      },
    },
    required: ["location"],
  },
};
```

### Resources

**Resources** are static data sources:

```typescript
const fileResource: McpResource = {
  uri: "file:///docs/readme.md",
  name: "Project README",
  description: "Main project documentation",
  mimeType: "text/markdown",
};
```

### Prompts

**Prompts** are reusable message templates:

```typescript
const reviewPrompt: McpPrompt = {
  name: "code_review",
  description: "Review code for quality and security",
  arguments: [
    { name: "code", required: true },
    { name: "language", required: false },
  ],
};
```

## Type Hierarchy

```
MCP Context
├── Protocol
│   ├── McpProtocolVersion
│   └── SUPPORTED_PROTOCOL_VERSIONS
│
├── Tools
│   ├── McpTool
│   ├── McpToolResult
│   └── ListToolsResult
│
├── Resources
│   ├── McpResource
│   ├── McpResourceTemplate
│   ├── ReadResourceResult
│   └── ListResourcesResult
│
├── Prompts
│   ├── McpPrompt
│   ├── McpPromptMessage
│   ├── GetPromptResult
│   └── ListPromptsResult
│
├── Server
│   ├── McpServerCapabilities
│   ├── McpServerInfo
│   └── McpInitializeResult
│
├── Transport
│   ├── McpStdioTransport
│   ├── McpSseTransport
│   ├── McpHttpTransport
│   └── McpSdkTransport
│
└── Request
    ├── McpRequest
    ├── McpRequestOptions
    └── McpPaginatedParams
```

## Usage Examples

### Defining a Tool

```typescript
import { McpTool, JsonSchema } from "@deepractice-ai/agentx-types";

const calculateTool: McpTool = {
  name: "calculate",
  description: "Perform mathematical calculations",
  inputSchema: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "Mathematical expression to evaluate",
      },
    },
    required: ["expression"],
  },
  annotations: {
    title: "Calculator",
    category: "math",
  },
};
```

### Tool Result

```typescript
import { McpToolResult } from "@deepractice-ai/agentx-types";

const successResult: McpToolResult = {
  content: [
    {
      type: "text",
      text: "Result: 42",
    },
  ],
  isError: false,
};

const errorResult: McpToolResult = {
  content: [
    {
      type: "text",
      text: "Error: Division by zero",
    },
  ],
  isError: true,
};
```

### Configuring Transport

```typescript
import { McpTransportConfig } from "@deepractice-ai/agentx-types";

// Stdio transport (local server)
const stdioConfig: McpTransportConfig = {
  type: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/docs"],
  env: { DEBUG: "mcp:*" },
};

// SSE transport (remote server with streaming)
const sseConfig: McpTransportConfig = {
  type: "sse",
  url: "https://api.example.com/mcp",
  headers: { Authorization: "Bearer token123" },
};

// HTTP transport (remote server, stateless)
const httpConfig: McpTransportConfig = {
  type: "http",
  url: "https://api.example.com/mcp",
  headers: { "X-API-Key": "key123" },
  timeout: 30000,
};

// SDK transport (in-process server)
const sdkConfig: McpTransportConfig = {
  type: "sdk",
  name: "embedded-server",
  instance: mcpServerInstance, // From agentx-core
};
```

### Server Capabilities

```typescript
import { McpServerCapabilities } from "@deepractice-ai/agentx-types";

const capabilities: McpServerCapabilities = {
  tools: {
    listChanged: true, // Server can notify when tool list changes
  },
  resources: {
    subscribe: true, // Server supports resource subscriptions
    listChanged: true,
  },
  prompts: {
    listChanged: false, // Server does not support prompt list changes
  },
  logging: {}, // Server supports logging
};
```

### Initialize Result

```typescript
import { McpInitializeResult } from "@deepractice-ai/agentx-types";

const initResult: McpInitializeResult = {
  protocolVersion: "2025-06-18",
  serverInfo: {
    name: "filesystem-server",
    version: "1.0.0",
  },
  capabilities: {
    tools: { listChanged: false },
    resources: { subscribe: true, listChanged: true },
  },
  instructions: "Access local filesystem with read-only permissions",
};
```

### Resource with Contents

```typescript
import { McpResource, ReadResourceResult } from "@deepractice-ai/agentx-types";

const resource: McpResource = {
  uri: "file:///project/README.md",
  name: "README",
  title: "Project Documentation",
  mimeType: "text/markdown",
  size: 2048,
};

const resourceContents: ReadResourceResult = {
  contents: [
    {
      uri: "file:///project/README.md",
      name: "README",
      mimeType: "text/markdown",
      text: "# Project Title\n\nProject description...",
    },
  ],
};
```

### Prompt Template

```typescript
import { McpPrompt, GetPromptResult } from "@deepractice-ai/agentx-types";

const prompt: McpPrompt = {
  name: "git_commit",
  title: "Git Commit Message",
  description: "Generate a conventional commit message",
  arguments: [
    { name: "changes", description: "Description of changes", required: true },
    { name: "type", description: "Commit type (feat/fix/docs)", required: false },
  ],
};

// After rendering with arguments
const promptResult: GetPromptResult = {
  description: "Conventional commit for feature addition",
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "Generate a commit message for: Added user authentication",
      },
    },
  ],
};
```

## Transport Comparison

| Transport | Use Case          | Connection     | State      |
| --------- | ----------------- | -------------- | ---------- |
| **stdio** | Local servers     | Process spawn  | Persistent |
| **SSE**   | Remote servers    | HTTP streaming | Persistent |
| **HTTP**  | Stateless servers | HTTP request   | Stateless  |
| **SDK**   | Embedded servers  | In-process     | Varies     |

### When to Use Each

**Stdio**:

- Local development
- File system access
- System tools
- Example: `@modelcontextprotocol/server-filesystem`

**SSE**:

- Remote API services
- Real-time updates
- Long-running operations
- Example: Database query servers

**HTTP**:

- Serverless functions
- Load-balanced services
- Simple request/response
- Example: Weather API server

**SDK**:

- Same-process servers
- Custom implementations
- Testing/mocking
- Example: In-memory tool registry

## Protocol Flow

### 1. Initialization

```typescript
Client → Server: initialize
{
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "my-client", version: "1.0.0" }
}

Server → Client: InitializeResult
{
  protocolVersion: "2025-06-18",
  serverInfo: { name: "my-server", version: "1.0.0" },
  capabilities: { tools: { listChanged: true } }
}

Client → Server: notifications/initialized
```

### 2. List Tools

```typescript
Client → Server: tools/list

Server → Client: ListToolsResult
{
  tools: [
    { name: "tool1", description: "...", inputSchema: {...} }
  ]
}
```

### 3. Call Tool

```typescript
Client → Server: tools/call
{
  name: "tool1",
  arguments: { param1: "value1" }
}

Server → Client: McpToolResult
{
  content: [{ type: "text", text: "Result" }],
  isError: false
}
```

## Design Rationale

### Why Full Protocol Types?

**✅ Advantages**:

- Complete type safety across the stack
- Self-documenting protocol
- Easy to implement clients and servers
- Version compatibility checking
- No dependency on external MCP packages

**vs. Minimal Types**:

- Minimal: Only define config, depend on `@modelcontextprotocol/sdk`
- Full: Complete protocol, can implement independently

**Decision**: Full types provide better control and documentation.

### Why Discriminated Unions?

Transport configs use discriminated unions:

```typescript
type McpTransportConfig =
  | { type: "stdio"; command: string; ... }
  | { type: "sse"; url: string; ... }
  | { type: "http"; url: string; ... }
  | { type: "sdk"; name: string; ... }
```

This enables:

- TypeScript type narrowing
- Exhaustive pattern matching
- Clear intent (no ambiguous configs)

### JSON Schema Simplification

Full JSON Schema is complex. We define a simplified subset:

- Only features needed for tool parameters
- Focus on type safety over edge cases
- Can be extended later if needed

## Related Types

- **Message**: See `~/message/README.md` - LLM conversation messages
- **LLMRequest**: See `~/llm/README.md` - LLM inference requests
- **Session**: See `~/session/README.md` - Conversation containers

## Implementation (in agentx-core)

Types define the protocol; implementations are elsewhere:

```typescript
// agentx-core/mcp/McpClient.ts
class McpClient {
  async connect(transport: McpTransportConfig): Promise<void>;
  async listTools(): Promise<ListToolsResult>;
  async callTool(name: string, args: unknown): Promise<McpToolResult>;
  async listResources(): Promise<ListResourcesResult>;
  async readResource(uri: string): Promise<ReadResourceResult>;
  async listPrompts(): Promise<ListPromptsResult>;
  async getPrompt(name: string, args?: unknown): Promise<GetPromptResult>;
  async close(): Promise<void>;
}
```

See `agentx-core` package for implementation details.

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [Official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Vercel AI SDK MCP](https://sdk.vercel.ai/docs/ai-sdk-rsc/mcp)
