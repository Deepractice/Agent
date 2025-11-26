# LLM Context (Large Language Model)

## Bounded Context Definition

**LLM Context** defines the type system for large language model inference engines.

### Core Concept

```text
LLM = Stateless Inference Engine

Responsibilities:
- Accept input (prompt + context messages)
- Execute inference (thinking)
- Generate output (text response)
- Request tools (returns tool_use when external tools are needed)
```

**Important**: LLM is just an inference engine, **does NOT include tool definition and execution**. Tools are external capabilities.

### Context Boundaries

#### ✅ Belongs to LLM Context

- **Inference config**: model, temperature, max_tokens, system_prompt, etc.
- **Inference input**: Historical message context (Message[])
- **Inference output**: Generated text content, thinking process
- **Tool requests**: Returns tool_use content block when tools are needed (but doesn't define tools)
- **Inference results**: Token usage, stop reason (end_turn/max_tokens/tool_use)
- **Streaming output**: Streaming chunks (text delta, thinking delta)

#### ❌ Does NOT Belong to LLM Context

- **Tool definition**: Tool schema, handler → `Tool Context` (independent context)
- **Tool execution**: Actual tool execution logic → `Tool Context`
- **Message storage**: Message persistence → `Session Context`
- **Session management**: Session creation/deletion → `Session Context`
- **API implementation**: HTTP requests, retry logic → `agentx-sdk` implementation layer
- **User interaction**: UI display, user input → `agentx-ui`
- **Event notifications**: Inference state change events → `agentx-events`

### Relationship with Other Contexts

```text
┌─────────────────────────────────┐
│ LLM Context (Inference Engine)  │
│ - Accepts Messages as input     │
│ - Generates Messages as output  │
│ - Returns tool_use requests     │
│ - Stateless, no history storage │
└─────────────────────────────────┘
     ↓ reads            ↑ requests tools
┌───────────────┐  ┌───────────────┐
│ Session       │  │ Tool Context  │
│ (State)       │  │ (Definitions) │
│ - Stores Msgs │  │ - Tool schema │
└───────────────┘  │ - Tool handler│
     ↓ uses         └───────────────┘
┌─────────────────────────────────┐
│ Message Context (Types)         │
│ - Defines message structure     │
│ - Includes tool-call/tool-result│
└─────────────────────────────────┘
```

### Design Principles

1. **Provider Agnostic** - Not tied to specific LLM providers (Claude/OpenAI/etc.)
2. **Stateless** - LLM itself is stateless, state managed by Session
3. **Streaming First** - Prioritize streaming output type definitions
4. **Type Safe** - Leverage TypeScript's type system for safety

## Core Types

### LLMProvider - Provider Abstraction

Defines LLM provider capabilities and metadata:

- Provider identification (anthropic, openai, custom)
- Model identifier
- Capability flags (streaming, tools, vision, caching)

### LLMConfig - Inference Configuration

Parameters that control model behavior:

- Model selection
- Generation parameters (temperature, maxTokens, topP, topK)
- Penalties (presence, frequency)
- Stop sequences

### LLMRequest - Inference Request

Complete input for a single LLM inference (stateless):

- Context messages (Message[])
- Inference configuration (LLMConfig)
- System prompt (optional)
- **Note**: Does NOT include tool definitions - tools are provided externally

### LLMResponse - Inference Response

Complete output from a single LLM inference (stateless):

- Generated content (MessageContent)
- Stop reason (why generation ended)
- Token usage statistics
- Finish timestamp

### StopReason - Stop Reason

Why the inference ended:

- `end_turn` - Natural completion
- `max_tokens` - Reached token limit
- `tool_use` - Tool usage requested
- `content_filter` - Content filter triggered
- `error` - Error occurred
- `other` - Other/unknown reason

### StreamChunk - Streaming Output

Real-time content fragments returned during streaming:

- TextChunk - Text delta
- ThinkingChunk - Thinking process delta
- ToolUseChunk - Tool usage request

## Usage Scenarios

### Scenario 1: Basic Inference

```typescript
import type { LLMRequest, LLMResponse } from "@deepractice-ai/agentx-types";

const request: LLMRequest = {
  messages: [...historyMessages],
  config: {
    model: "claude-3-5-sonnet-20241022",
    maxTokens: 4096,
    temperature: 1.0,
  },
};

// LLM executes inference
const response: LLMResponse = await llm.infer(request);
```

### Scenario 2: Streaming Output

```typescript
import type { StreamChunk } from "@deepractice-ai/agentx-types";

for await (const chunk of llm.stream(request)) {
  if (chunk.type === "text") {
    console.log(chunk.delta); // Real-time text display
  }
}
```

### Scenario 3: Provider Abstraction

```typescript
import type { LLMProvider } from "@deepractice-ai/agentx-types";

const provider: LLMProvider = {
  provider: "anthropic",
  modelId: "claude-3-5-sonnet-20241022",
  supportsStreaming: true,
  supportsTools: true,
  supportsVision: true,
  supportsCaching: true,
  supportsThinking: true,
};
```

## File Organization

```
llm/
├── README.md              # This file
├── LLMProvider.ts         # Provider abstraction
├── LLMConfig.ts           # Inference configuration
├── LLMRequest.ts          # Inference request
├── LLMResponse.ts         # Inference response
├── StopReason.ts          # Stop reasons
├── StreamChunk.ts         # Streaming output chunks
└── index.ts               # Unified exports
```

## Mapping to Provider SDKs

### Claude SDK

| AgentX Types            | Claude SDK              |
| ----------------------- | ----------------------- |
| LLMConfig               | MessageCreateParamsBase |
| LLMRequest.messages     | messages parameter      |
| LLMRequest.systemPrompt | system parameter        |
| LLMResponse.content     | Message.content         |
| StopReason              | stop_reason             |
| TokenUsage              | usage                   |

### Vercel AI SDK

| AgentX Types | Vercel AI SDK                     |
| ------------ | --------------------------------- |
| LLMProvider  | LanguageModelV3                   |
| LLMRequest   | LanguageModelV3CallOptions        |
| LLMResponse  | LanguageModelV3CallOptions result |
| StopReason   | FinishReason                      |
| StreamChunk  | LanguageModelV3StreamPart         |

## Important Notes

### What NOT to Do

❌ Don't include API keys or sensitive information in LLM types
❌ Don't define HTTP request/response implementation details
❌ Don't include session management logic
❌ Don't include message persistence logic
❌ Don't include tool definitions (tools belong to Tool Context)

### What TO Do

✅ Define clear input/output interfaces
✅ Use Discriminated Unions for multiple output types
✅ Provide complete TypeScript type hints
✅ Keep type definitions generic (not tied to specific providers)
✅ Ensure request/response are serializable and stateless

## Future Extensions

Features to consider supporting:

- Multi-modal input (images, audio)
- Prompt caching
- Vision capabilities
- Function calling
- Response format control (JSON mode)
- Batch inference
