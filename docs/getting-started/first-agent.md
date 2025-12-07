# Your First Agent

A detailed walkthrough of building a complete AI agent with AgentX.

## What You'll Build

A CLI chat application with:

- Real-time streaming responses
- Conversation history
- Persistent storage (SQLite)
- Event logging
- Graceful error handling

## Prerequisites

Complete [Installation](./installation.md) and [Quick Start](./quickstart.md) first.

## Step-by-Step Guide

### 1. Project Setup

```bash
mkdir chat-agent
cd chat-agent
pnpm init -y
pnpm add agentxjs
pnpm add -D typescript tsx @types/node

# Add to package.json
echo '{"type": "module"}' > package.json
pnpm init -y  # Re-initialize to keep type: module
```

### 2. Create Basic Agent

Create `src/agent.ts`:

```typescript
import { createAgentX } from "agentxjs";

async function main() {
  // 1. Create runtime
  const agentx = await createAgentX({ llm: { apiKey: "sk-ant-xxxxx" } });
  console.log("✅ Runtime created");

  // 2. Create container
  await agentx.request("container_create_request", {
    containerId: "chat-container",
  });
  console.log("✅ Container created");

  // 3. Run agent
  const agentRes = await agentx.request("agent_run_request", {
    containerId: "chat-container",
    config: {
      name: "ChatBot",
      systemPrompt: "You are a helpful assistant.",
    },
  });
  console.log(`✅ Agent created: ${agentRes.data.agentId}`);

  // 4. Cleanup
  await agentx.dispose();
  console.log("✅ Disposed");
}

main().catch(console.error);
```

Run it:

```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxx
npx tsx src/agent.ts
```

### 3. Add Event Streaming

Update `src/agent.ts`:

```typescript
import { createAgentX } from "agentxjs";

async function main() {
  const agentx = await createAgentX({ llm: { apiKey: "sk-ant-xxxxx" } });

  // Subscribe to text streaming
  agentx.on("text_delta", (e) => {
    process.stdout.write(e.data.text);
  });

  // Subscribe to conversation events
  agentx.on("conversation_start", () => {
    console.log("\n🤖 Assistant is thinking...\n");
  });

  agentx.on("conversation_end", () => {
    console.log("\n\n✅ Response complete\n");
  });

  await agentx.request("container_create_request", {
    containerId: "chat-container",
  });

  const agentRes = await agentx.request("agent_run_request", {
    containerId: "chat-container",
    config: {
      name: "ChatBot",
      systemPrompt: "You are a helpful assistant.",
    },
  });

  // Send a message
  console.log("User: Hello!\n");
  await agentx.request("agent_receive_request", {
    agentId: agentRes.data.agentId,
    content: "Hello!",
  });

  // Wait for response
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await agentx.dispose();
}

main().catch(console.error);
```

### 4. Add Interactive Chat Loop

Create `src/chat.ts`:

```typescript
import { createAgentX } from "agentxjs";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function main() {
  const agentx = await createAgentX({ llm: { apiKey: "sk-ant-xxxxx" } });

  // Event handlers
  agentx.on("text_delta", (e) => {
    process.stdout.write(e.data.text);
  });

  agentx.on("conversation_start", () => {
    process.stdout.write("\n🤖 ");
  });

  agentx.on("conversation_end", () => {
    console.log("\n");
  });

  // Setup
  await agentx.request("container_create_request", {
    containerId: "chat-container",
  });

  const agentRes = await agentx.request("agent_run_request", {
    containerId: "chat-container",
    config: {
      name: "ChatBot",
      systemPrompt: "You are a helpful and friendly assistant.",
    },
  });

  // Interactive chat
  const rl = readline.createInterface({ input, output });

  console.log("💬 Chat started (Ctrl+C to exit)\n");

  while (true) {
    const userInput = await rl.question("You: ");

    if (!userInput.trim()) {
      continue;
    }

    await agentx.request("agent_receive_request", {
      agentId: agentRes.data.agentId,
      content: userInput,
    });
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Goodbye!");
  process.exit(0);
});

main().catch(console.error);
```

Run it:

```bash
npx tsx src/chat.ts
```

### 5. Add Persistence

Update `src/chat.ts` to save conversations:

```typescript
import { createAgentX } from "agentxjs";

// Add persistence to agentx
const agentx = await createAgentX({
  storage: {
    driver: "sqlite",
    path: "./chat-history.db",
  },
});

// Rest of the code remains the same
```

Now conversations are saved to `chat-history.db`!

### 6. Add Error Handling

```typescript
async function main() {
  const agentx = await createAgentX({
    storage: {
      driver: "sqlite",
      path: "./chat-history.db",
    },
  });

  agentx.on("text_delta", (e) => process.stdout.write(e.data.text));
  agentx.on("conversation_start", () => process.stdout.write("\n🤖 "));
  agentx.on("conversation_end", () => console.log("\n"));

  // Error handling
  agentx.on("error_occurred", (e) => {
    console.error("\n❌ Error:", e.data.message);
  });

  try {
    await agentx.request("container_create_request", {
      containerId: "chat-container",
    });

    const agentRes = await agentx.request("agent_run_request", {
      containerId: "chat-container",
      config: {
        name: "ChatBot",
        systemPrompt: "You are a helpful assistant.",
      },
    });

    const rl = readline.createInterface({ input, output });
    console.log("💬 Chat started (Ctrl+C to exit)\n");

    while (true) {
      const userInput = await rl.question("You: ");
      if (!userInput.trim()) continue;

      try {
        await agentx.request("agent_receive_request", {
          agentId: agentRes.data.agentId,
          content: userInput,
        });
      } catch (error) {
        console.error("\n❌ Failed to send message:", error);
      }
    }
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    await agentx.dispose();
    process.exit(1);
  }
}
```

### 7. Add Advanced Features

```typescript
import { createAgentX } from "agentxjs";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function main() {
  const agentx = await createAgentX({
    storage: {
      driver: "sqlite",
      path: "./chat-history.db",
    },
  });

  // Event handlers
  agentx.on("text_delta", (e) => process.stdout.write(e.data.text));
  agentx.on("conversation_start", () => process.stdout.write("\n🤖 "));
  agentx.on("conversation_end", () => console.log("\n"));

  // Tool usage logging
  agentx.on("tool_planned", (e) => {
    console.log(`\n🔧 Calling tool: ${e.data.toolCall.name}`);
    console.log(`   Input: ${JSON.stringify(e.data.toolCall.input)}`);
  });

  agentx.on("tool_completed", (e) => {
    console.log(`✅ Tool completed: ${e.data.toolResult.name}`);
  });

  // Turn analytics
  agentx.on("turn_response", (e) => {
    const { durationMs, usage } = e.data;
    console.log(`\n📊 Turn completed in ${durationMs}ms`);
    if (usage) {
      console.log(`   Input tokens: ${usage.inputTokens}`);
      console.log(`   Output tokens: ${usage.outputTokens}`);
    }
  });

  try {
    await agentx.request("container_create_request", {
      containerId: "chat-container",
    });

    const agentRes = await agentx.request("agent_run_request", {
      containerId: "chat-container",
      config: {
        name: "ChatBot",
        systemPrompt: `You are a helpful coding assistant.

You can help with:
- Writing code
- Debugging
- Explaining concepts
- Best practices`,
      },
    });

    const rl = readline.createInterface({ input, output });

    console.log("💬 CodeAssistant Chat\n");
    console.log("Commands:");
    console.log("  /help  - Show this help");
    console.log("  /clear - Clear conversation");
    console.log("  /quit  - Exit\n");

    while (true) {
      const userInput = await rl.question("You: ");

      if (!userInput.trim()) continue;

      // Handle commands
      if (userInput === "/help") {
        console.log("\nCommands: /help, /clear, /quit\n");
        continue;
      }

      if (userInput === "/quit") {
        break;
      }

      if (userInput === "/clear") {
        console.clear();
        console.log("💬 Conversation cleared\n");
        continue;
      }

      try {
        await agentx.request("agent_receive_request", {
          agentId: agentRes.data.agentId,
          content: userInput,
        });
      } catch (error) {
        console.error("\n❌ Error:", error);
      }
    }

    rl.close();
    await agentx.dispose();
    console.log("\n👋 Goodbye!");
  } catch (error) {
    console.error("❌ Fatal error:", error);
    await agentx.dispose();
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  console.log("\n\n👋 Goodbye!");
  process.exit(0);
});

main().catch(console.error);
```

## What You Learned

✅ Creating a Runtime
✅ Event subscription patterns
✅ Container and Agent creation
✅ Real-time streaming
✅ Persistent storage
✅ Error handling
✅ Interactive CLI
✅ Turn analytics

## Next Steps

- **[Event System](../concepts/event-system.md)** - Understand all event types
- **[Session Management](../guides/sessions.md)** - Resume conversations
- **[Tool Integration](../guides/tools.md)** - Add custom tools
- **[Examples](../examples/)** - More complete examples

## Full Code

The complete code is available in `/examples/chat-cli/`.

```bash
cd examples/chat-cli
pnpm install
pnpm start
```
