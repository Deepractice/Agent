# Message Type Redesign - Plan A

## Current Problems

### Problem 1: Single Content Type per Message

```typescript
// Current design - can only have ONE content type
{
  role: "user",
  content: TextContent  // Can't have both text AND image
}
```

### Problem 2: Not Type-Safe by Role

```typescript
// Current design - all roles use same Message interface
interface Message {
  role: MessageRole;
  content: MessageContent; // Same for all roles
}
```

### Problem 3: Limited Content Support

- Missing: FilePart (PDF, documents)
- ToolResult too simple (no error types, no multi-format output)

## New Design (Plan A)

### Core Principle

**Split Message by Role → Each role has different content structure**

Based on:

- Vercel AI SDK best practices
- Anthropic Claude SDK compatibility
- Industry standard pattern

### Message Structure

```typescript
// Message is a union type based on role
type Message = UserMessage | AssistantMessage | SystemMessage | ToolMessage;

interface UserMessage {
  id: string;
  role: "user";
  content: string | ContentPart[]; // Simple string OR complex parts
  timestamp: Date;
  parentId?: string;
}

interface AssistantMessage {
  id: string;
  role: "assistant";
  content: string | ContentPart[];
  timestamp: Date;
  parentId?: string;
  usage?: TokenUsage;
}

interface SystemMessage {
  id: string;
  role: "system";
  content: string;
  timestamp: Date;
}

interface ToolMessage {
  id: string;
  role: "tool";
  content: ToolResultPart[];
  timestamp: Date;
  parentId?: string;
}
```

### Content Structure

```typescript
// Content can be simple string or array of parts
type UserContent = string | Array<TextPart | ImagePart | FilePart>;

type AssistantContent = string | Array<TextPart | ThinkingPart | ToolCallPart | FilePart>;

type ToolContent = ToolResultPart[];
```

### ContentPart Types

```typescript
interface TextPart {
  type: "text";
  text: string;
}

interface ThinkingPart {
  type: "thinking";
  reasoning: string;
  tokenCount?: number;
}

interface ImagePart {
  type: "image";
  data: string; // base64 or URL
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  name?: string;
}

interface FilePart {
  type: "file";
  data: string; // base64 or URL
  mediaType: string;
  filename?: string;
}

interface ToolCallPart {
  type: "tool-call";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultPart {
  type: "tool-result";
  id: string;
  name: string;
  output: ToolResultOutput;
}
```

### ToolResultOutput (Enhanced)

```typescript
type ToolResultOutput =
  | { type: "text"; value: string }
  | { type: "json"; value: unknown }
  | { type: "error-text"; value: string }
  | { type: "error-json"; value: unknown }
  | { type: "execution-denied"; reason?: string }
  | { type: "content"; value: Array<TextPart | ImagePart | FilePart> };
```

## Migration Strategy

### Phase 1: Create New Types

1. Create `ContentPart.ts` with all part types
2. Create `UserMessage.ts`, `AssistantMessage.ts`, etc.
3. Keep old types for compatibility

### Phase 2: Update Exports

1. Export both old and new types
2. Mark old types as `@deprecated`

### Phase 3: Gradual Migration

1. Update agent-sdk to use new types
2. Update agent-ui to use new types
3. Remove old types in next major version

## Benefits

### ✅ Type Safety

```typescript
function handleMessage(msg: Message) {
  if (msg.role === "user") {
    // TypeScript knows msg is UserMessage
    const content = msg.content; // string | ContentPart[]
  }
}
```

### ✅ Flexible Content

```typescript
// Simple text
{ role: "user", content: "Hello" }

// Rich content
{
  role: "user",
  content: [
    { type: "text", text: "Check this image:" },
    { type: "image", data: "base64...", mediaType: "image/png" }
  ]
}
```

### ✅ Industry Standard

- Matches Vercel AI SDK pattern
- Compatible with Anthropic Claude SDK
- Easy to adapt for other LLM providers

## File Organization

```
message/
├── README.md
├── REDESIGN.md (this file)
├── Message.ts (union type)
├── UserMessage.ts
├── AssistantMessage.ts
├── SystemMessage.ts
├── ToolMessage.ts
├── MessageRole.ts (kept for compatibility)
├── TokenUsage.ts (unchanged)
├── parts/
│   ├── ContentPart.ts (union type)
│   ├── TextPart.ts
│   ├── ThinkingPart.ts
│   ├── ImagePart.ts
│   ├── FilePart.ts
│   ├── ToolCallPart.ts
│   ├── ToolResultPart.ts
│   ├── ToolResultOutput.ts
│   └── index.ts
└── index.ts
```

## Backward Compatibility

Keep old types with deprecation warnings:

```typescript
/**
 * @deprecated Use role-specific message types instead:
 * - UserMessage
 * - AssistantMessage
 * - SystemMessage
 * - ToolMessage
 */
export interface LegacyMessage {
  id: string;
  role: MessageRole;
  content: MessageContent;
  timestamp: Date;
  parentId?: string;
  usage?: TokenUsage;
}
```

## Next Steps

1. Get approval on this design
2. Implement new ContentPart types
3. Implement role-based Message types
4. Update README with migration guide
5. Build and verify
