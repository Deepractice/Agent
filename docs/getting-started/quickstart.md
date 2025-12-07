# Quick Start

Build your first AI agent in 5 minutes.

## Prerequisites

- Node.js installed
- `ANTHROPIC_API_KEY` environment variable set

If not set up yet, see [Installation](./installation.md).

## Step 1: Create Project

```bash
mkdir my-agent && cd my-agent
pnpm init -y
pnpm add agentxjs
```

## Step 2: Create Agent

Create `agent.ts`:

```typescript
import { createAgentX } from "agentxjs";

async function main() {
  // Create AgentX
  const agentx = await createAgentX({
    llm: {
      apiKey: "sk-ant-xxxxx", // Replace with your Anthropic API key
    },
  });

  // Subscribe to text streaming
  agentx.on("text_delta", (e) => {
    process.stdout.write(e.data.text);
  });

  // Create container
  await agentx.request("container_create_request", {
    containerId: "main",
  });

  // Run agent
  const agentRes = await agentx.request("agent_run_request", {
    containerId: "main",
    config: {
      name: "Assistant",
      systemPrompt: "You are a helpful assistant.",
    },
  });

  // Send message
  await agentx.request("agent_receive_request", {
    agentId: agentRes.data.agentId,
    content: "Write a hello world program in TypeScript",
  });

  // Wait a bit for completion
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Cleanup
  await agentx.dispose();
}

main().catch(console.error);
```

## Step 3: Run It

```bash
npx tsx agent.ts
```

You should see the agent streaming its response in real-time!

## What's Happening?

1. **Create AgentX** - Initializes the Agent platform
2. **Subscribe to Events** - Listen to streaming text
3. **Create Container** - Isolation boundary for agents
4. **Run Agent** - Start an agent instance
5. **Send Message** - Send user input
6. **Cleanup** - Dispose AgentX and free resources

## Next Steps

### Add Conversation Loop

```typescript
import { createAgentX } from "agentxjs";
import * as readline from "node:readline/promises";

async function main() {
  const agentx = await createAgentX({
    llm: {
      apiKey: "sk-ant-xxxxx", // Your Anthropic API key
    },
  });

  agentx.on("text_delta", (e) => {
    process.stdout.write(e.data.text);
  });

  agentx.on("conversation_end", () => {
    console.log("\n");
  });

  await agentx.request("container_create_request", {
    containerId: "main",
  });

  const agentRes = await agentx.request("agent_run_request", {
    containerId: "main",
    config: {
      name: "Assistant",
      systemPrompt: "You are a helpful coding assistant.",
    },
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("Chat with your agent (Ctrl+C to exit)\n");

  while (true) {
    const input = await rl.question("You: ");

    if (!input.trim()) continue;

    process.stdout.write("Assistant: ");

    await agentx.request("agent_receive_request", {
      agentId: agentRes.data.agentId,
      content: input,
    });
  }
}

main().catch(console.error);
```

### Add Persistence

```typescript
import { createAgentX } from "agentxjs";

const agentx = await createAgentX({
  llm: {
    apiKey: "sk-ant-xxxxx", // Your Anthropic API key
  },
  storage: {
    driver: "sqlite",
    path: "./chat.db",
  },
});

// Now conversations are saved to chat.db!
```

### Add Event Logging

```typescript
// Log all events
agentx.onAny((event) => {
  console.log(`[${event.type}]`, event.data);
});

// Log specific events
agentx.on("conversation_start", () => {
  console.log("🤖 Agent is thinking...");
});

agentx.on("conversation_end", () => {
  console.log("✅ Response complete");
});

agentx.on("tool_planned", (e) => {
  console.log(`🔧 Calling tool: ${e.data.toolCall.name}`);
});
```

## Common Patterns

### Error Handling

```typescript
try {
  await agentx.request("agent_receive_request", {
    agentId: agentRes.data.agentId,
    content: input,
  });
} catch (error) {
  console.error("Failed to send message:", error);
}
```

### Interrupt Agent

```typescript
// Stop ongoing operation
await agentx.request("agent_interrupt_request", {
  agentId: agentRes.data.agentId,
});
```

### Destroy Agent

```typescript
// Clean up agent
await agentx.request("agent_destroy_request", {
  agentId: agentRes.data.agentId,
});
```

## Complete Example

```typescript
import { createAgentX } from "agentxjs";
import * as readline from "node:readline/promises";

async function main() {
  // Create AgentX with SQLite persistence
  const agentx = await createAgentX({
    llm: {
      apiKey: "sk-ant-xxxxx", // Your Anthropic API key
    },
    storage: {
      driver: "sqlite",
      path: "./chat.db",
    },
  });

  // Event handlers
  agentx.on("text_delta", (e) => process.stdout.write(e.data.text));
  agentx.on("conversation_start", () => console.log("\n🤖 Thinking..."));
  agentx.on("conversation_end", () => console.log("\n"));
  agentx.on("tool_planned", (e) => {
    console.log(`\n🔧 Using tool: ${e.data.toolCall.name}`);
  });

  // Create container
  await agentx.request("container_create_request", {
    containerId: "main",
  });

  // Run agent
  const agentRes = await agentx.request("agent_run_request", {
    containerId: "main",
    config: {
      name: "CodeAssistant",
      systemPrompt: "You are an expert coding assistant. Be concise.",
    },
  });

  // Chat loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("💬 Chat with CodeAssistant (Ctrl+C to exit)\n");

  while (true) {
    try {
      const input = await rl.question("You: ");

      if (!input.trim()) continue;

      await agentx.request("agent_receive_request", {
        agentId: agentRes.data.agentId,
        content: input,
      });
    } catch (error) {
      console.error("\n❌ Error:", error);
    }
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n\n👋 Goodbye!");
  process.exit(0);
});

main().catch(console.error);
```

## Learn More

- **[First Agent Tutorial](./first-agent.md)** - Detailed walkthrough
- **[Event System](../concepts/event-system.md)** - Understand events
- **[API Reference](../api/agentx.md)** - Complete API documentation
- **[Examples](../examples/)** - More examples

## Troubleshooting

**Agent not responding?**

- Check your `ANTHROPIC_API_KEY` is valid
- Ensure you have internet connection
- Check console for error messages

**TypeScript errors?**

- Run `pnpm add -D @types/node`
- Make sure `tsconfig.json` has `"moduleResolution": "bundler"`

**Import errors?**

- Add `"type": "module"` to `package.json`
- Or use `.mts` file extension
