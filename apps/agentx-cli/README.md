# AgentX CLI

Container-like CLI for managing AgentX agents.

## Installation

```bash
# From monorepo root
pnpm install
pnpm --filter @deepractice-ai/agentx-cli build

# Link globally (optional)
cd apps/agentx-cli
npm link
```

## Commands

### Run an Agent

Start an agent server with web UI.

```bash
# Foreground mode
agentx run -w /path/to/workspace --env-file .env.local

# Background mode (detached)
agentx run --name my-agent -w /path/to/workspace -d --env-file .env.local

# With custom port
agentx run -w . -p 8080 -d
```

**Options:**

| Option                 | Description                            | Default             |
| ---------------------- | -------------------------------------- | ------------------- |
| `-w, --work-dir <dir>` | Working directory for agent (required) | -                   |
| `--name <name>`        | Agent name                             | `agent_<timestamp>` |
| `-p, --port <port>`    | Port to listen on                      | `5200`              |
| `-h, --host <host>`    | Host to bind to                        | `0.0.0.0`           |
| `-d, --detach`         | Run in background                      | `false`             |
| `--env-file <file>`    | Environment file path                  | `.env.local`        |
| `--model <model>`      | Model name                             | From env            |

### List Agents

List all registered agents and their status.

```bash
agentx ps
```

Output:

```
NAME              PORT    STATUS      PID     WORK_DIR
my-agent          5200    running     12345   /home/user/projects
test-agent        8080    stopped     -       /home/user/test
```

### Stop an Agent

Stop a running agent by name.

```bash
# Stop agent
agentx stop my-agent

# Stop and remove agent directory
agentx stop my-agent --rm
```

### Domain Syntax

All commands support explicit domain syntax:

```bash
agentx agent run -w .
agentx agent ps
agentx agent stop my-agent
```

## Configuration

### Environment Variables

Create `.env.local` file:

```bash
# Server
HOST=0.0.0.0
PORT=5200

# Platform Configuration (AGENTX_*)
AGENTX_API_KEY=your-api-key
AGENTX_BASE_URL=https://api.anthropic.com
AGENTX_MODEL=claude-sonnet-4-5-20250929

# Agent Runtime Configuration (AGENT_*)
AGENT_WORK_DIR=/path/to/workspace
AGENT_SYSTEM_PROMPT=You are a helpful AI assistant.
AGENT_MAX_TURNS=
AGENT_PERMISSION_MODE=bypassPermissions
```

**Required variables:**

- `AGENTX_API_KEY` - Anthropic API key
- `AGENTX_BASE_URL` - API base URL

## Data Directory

Agent data is stored in `~/.agentx/`:

```
~/.agentx/
└── agents/
    └── <agent-name>/
        ├── config.json    # Agent configuration
        ├── agent.pid      # Process ID file
        └── agent.log      # Log output
```

## Examples

### Quick Start

```bash
# Create env file
cat > .env.local << EOF
AGENTX_API_KEY=your-api-key
AGENTX_BASE_URL=https://api.anthropic.com
EOF

# Start agent
agentx run --name dev -w ~/projects -d --env-file .env.local

# Check status
agentx ps

# Open in browser
open http://localhost:5200

# Stop when done
agentx stop dev
```

### Multiple Agents

```bash
# Start multiple agents on different ports
agentx run --name agent1 -w ~/project1 -p 5200 -d --env-file .env
agentx run --name agent2 -w ~/project2 -p 5201 -d --env-file .env

# List all
agentx ps

# Stop all
agentx stop agent1
agentx stop agent2
```

## Development

```bash
# Run in development mode
pnpm dev run -w . --env-file ../agentx-web/.env.local

# Build
pnpm build

# Type check
pnpm typecheck
```

## Requirements

- Node.js >= 18
- Built `agentx-web` dist (for static files)

## License

MIT
