# Installation

Get started with AgentX in minutes.

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (recommended) or npm/yarn
- **TypeScript** >= 5.0.0 (for TypeScript projects)

## Quick Install

### For Backend (Node.js)

```bash
# Using pnpm (recommended)
pnpm add agentxjs @agentxjs/runtime

# Using npm
npm install agentxjs @agentxjs/runtime

# Using yarn
yarn add agentxjs @agentxjs/runtime
```

**Why both packages?**

- `agentxjs` - Unified API
- `@agentxjs/runtime` - Runtime with Claude SDK (peer dependency)

### For Frontend (Browser)

```bash
# Using pnpm (recommended)
pnpm add agentxjs

# Using npm
npm install agentxjs

# Using yarn
yarn add agentxjs
```

**Note**: Frontend only needs `agentxjs` because it connects to a backend server via WebSocket.

## Get API Key

Get your Anthropic API key from [Anthropic Console](https://console.anthropic.com/).

You'll pass it directly to `createAgentX()` - no environment variables needed.

## Package Architecture

AgentX uses a layered architecture with clear dependencies:

```
@agentxjs/types        Type definitions (zero deps)
       ↑
@agentxjs/common       Logger facade
       ↑
@agentxjs/agent        AgentEngine (Mealy Machine)
       ↑
@agentxjs/runtime      Runtime + Claude SDK ← peerDependency
       ↑
agentxjs               Unified API (local/remote)
```

### Package Overview

| Package             | Description             | Install when                      |
| ------------------- | ----------------------- | --------------------------------- |
| `agentxjs`          | Unified API entry point | **Always install**                |
| `@agentxjs/runtime` | Runtime with Claude SDK | Backend/Node.js (peer dependency) |
| `@agentxjs/agent`   | AgentEngine only        | Advanced use (custom drivers)     |
| `@agentxjs/types`   | Type definitions        | Type-only imports                 |
| `@agentxjs/common`  | Logger facade           | Internal use only                 |
| `@agentxjs/ui`      | React components        | Frontend UI                       |

### Why Peer Dependency?

`@agentxjs/runtime` is marked as **optional peer dependency** of `agentxjs` because:

1. **Tree-shaking** - Frontend doesn't bundle Claude SDK, SQLite, etc.
2. **Flexibility** - Users control runtime version
3. **Bundle size** - Browser bundle stays small (~50KB vs ~5MB)

### Installation Examples

**Backend (Node.js) - Recommended:**

```bash
pnpm add agentxjs @agentxjs/runtime
```

**Frontend (Browser):**

```bash
pnpm add agentxjs
# No need for @agentxjs/runtime
```

**With React UI:**

```bash
pnpm add agentxjs @agentxjs/ui react react-dom
```

**Advanced (Custom Driver):**

```bash
pnpm add @agentxjs/agent @agentxjs/types
```

## Verify Installation

Create `test.ts`:

```typescript
import { createAgentX } from "agentxjs";

async function main() {
  console.log("AgentX installed successfully!");

  const agentx = await createAgentX({
    llm: {
      apiKey: "sk-ant-xxxxx", // Replace with your API key
    },
  });
  console.log("AgentX created");

  await agentx.dispose();
  console.log("AgentX disposed");
}

main();
```

Run it:

```bash
npx tsx test.ts
```

You should see:

```
AgentX installed successfully!
AgentX created
AgentX disposed
```

## TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

## Project Setup

### Option 1: New TypeScript Project

```bash
mkdir my-agent-project
cd my-agent-project

pnpm init
pnpm add agentxjs
pnpm add -D typescript tsx @types/node

# Create tsconfig.json
npx tsc --init
```

### Option 2: Existing Project

```bash
# Add to existing project
pnpm add agentxjs

# TypeScript support
pnpm add -D @types/node
```

## Storage Dependencies (Optional)

For persistent storage:

```bash
# SQLite (recommended for local development)
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3

# Or use memory storage (no additional dependencies needed)
```

## Next Steps

- **[Quick Start](./quickstart.md)** - Build your first agent in 5 minutes
- **[First Agent](./first-agent.md)** - Detailed walkthrough
- **[Architecture Overview](../concepts/overview.md)** - Understand the system

## Troubleshooting

### "Cannot find module 'agentxjs'"

Make sure you installed the package:

```bash
pnpm add agentxjs
```

### "API key required" or authentication errors

Make sure you pass your API key to `createAgentX()`:

```typescript
const agentx = await createAgentX({
  llm: {
    apiKey: "sk-ant-xxxxx", // Your Anthropic API key
  },
});
```

### TypeScript errors with types

Install type definitions:

```bash
pnpm add -D @types/node
```

### ESM/CJS issues

AgentX uses ESM. Make sure your `package.json` has:

```json
{
  "type": "module"
}
```

Or use `.mts` file extension.

## Getting Help

- **[Documentation](../README.md)** - Full documentation
- **[GitHub Issues](https://github.com/Deepractice/Agent/issues)** - Report bugs
- **[Examples](../examples/)** - Code examples
