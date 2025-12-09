# Portagent

![Portagent Demo](./public/Portagent.gif)

Portagent is a multi-user AI Agent gateway powered by [AgentX](https://github.com/Deepractice/AgentX). It provides a web-based interface for interacting with Claude AI agents, with built-in user authentication and session management.

## Features

- **Multi-User Support**: User registration and authentication with JWT tokens
- **WebSocket Communication**: Real-time bidirectional communication with AI agents
- **Invite Code System**: Optional invite code for controlled access
- **Persistent Storage**: SQLite-based storage for users, sessions, and agent data
- **Docker Ready**: Pre-built Docker images for easy deployment
- **Claude Integration**: Powered by Anthropic's Claude API via Claude Agent SDK

## Quick Start

### Using Docker (Recommended)

```bash
docker run -d \
  --name portagent \
  -p 5200:5200 \
  -e LLM_PROVIDER_KEY=sk-ant-xxxxx \
  -v ./data:/home/agentx/.agentx \
  deepracticexs/portagent:latest
```

Then open <http://localhost:5200> in your browser.

### Using Docker Compose

Create a `.env` file:

```env
LLM_PROVIDER_KEY=sk-ant-xxxxx
JWT_SECRET=your-secure-random-secret
```

Create `docker-compose.yml`:

```yaml
services:
  portagent:
    image: deepracticexs/portagent:latest
    container_name: portagent
    restart: unless-stopped
    ports:
      - "5200:5200"
    environment:
      - LLM_PROVIDER_KEY=${LLM_PROVIDER_KEY}
      - LLM_PROVIDER_URL=${LLM_PROVIDER_URL:-https://api.anthropic.com}
      - LLM_PROVIDER_MODEL=${LLM_PROVIDER_MODEL:-claude-sonnet-4-20250514}
      - JWT_SECRET=${JWT_SECRET}
      - INVITE_CODE_REQUIRED=${INVITE_CODE_REQUIRED:-false}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    volumes:
      - ./data:/home/agentx/.agentx
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5200/health"]
      interval: 30s
      timeout: 10s
      start_period: 5s
      retries: 3
```

Run:

```bash
docker compose up -d
```

### Using npm

```bash
# Install globally
npm install -g @agentxjs/portagent

# Run with required API key
export LLM_PROVIDER_KEY=sk-ant-xxxxx
portagent
```

## Configuration

### Environment Variables

| Variable               | Required | Default                     | Description                                 |
| ---------------------- | -------- | --------------------------- | ------------------------------------------- |
| `LLM_PROVIDER_KEY`     | **Yes**  | -                           | Anthropic API key (starts with `sk-ant-`)   |
| `LLM_PROVIDER_URL`     | No       | `https://api.anthropic.com` | API base URL                                |
| `LLM_PROVIDER_MODEL`   | No       | `claude-sonnet-4-20250514`  | Claude model to use                         |
| `PORT`                 | No       | `5200`                      | Server port                                 |
| `AGENTX_DIR`           | No       | `~/.agentx`                 | AgentX data directory path                  |
| `JWT_SECRET`           | No       | Auto-generated              | Secret for JWT token signing                |
| `INVITE_CODE_REQUIRED` | No       | `false`                     | Require invite code for registration        |
| `LOG_LEVEL`            | No       | `info`                      | Log level: `debug`, `info`, `warn`, `error` |
| `NODE_ENV`             | No       | `production`                | Environment mode                            |

### CLI Options

```bash
portagent [options]

Options:
  -p, --port <port>        Port to listen on (default: 5200)
  -d, --data-dir <path>    Data directory (default: ~/.agentx)
  -e, --env-file <path>    Path to environment file
  --jwt-secret <secret>    JWT secret for token signing
  --api-key <key>          LLM provider API key
  --api-url <url>          LLM provider base URL
  --model <model>          LLM model name
  -h, --help               Display help
  -V, --version            Display version
```

### Data Directory Structure

```text
~/.agentx/                  # Default data directory (configurable via AGENTX_DIR)
├── data/                   # Database files
│   ├── agentx.db          # AgentX data (containers, images, sessions)
│   └── portagent.db       # User authentication data
└── logs/                   # Log files
    └── portagent.log
```

## Invite Code System

Portagent uses a daily rotating invite code for registration security. The invite code is the **Unix timestamp (in seconds) of today's 00:00:01** in the server's timezone.

### Calculating the Invite Code

**Linux/macOS:**

```bash
# For server's local timezone
date -d "today 00:00:01" +%s

# For UTC (Docker default)
TZ=UTC date -d "today 00:00:01" +%s

# macOS syntax
date -j -f "%Y-%m-%d %H:%M:%S" "$(date +%Y-%m-%d) 00:00:01" "+%s"
```

**JavaScript:**

```javascript
// Server's local timezone
const now = new Date();
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 1);
const inviteCode = Math.floor(todayStart.getTime() / 1000);
console.log(inviteCode);
```

**Note:** Docker containers typically run in UTC timezone. Make sure to calculate the invite code for the correct timezone.

### Enabling Invite Codes

Set `INVITE_CODE_REQUIRED=true` to require invite codes for registration:

```bash
docker run -e INVITE_CODE_REQUIRED=true ...
```

## API Endpoints

| Method | Path                 | Auth | Description            |
| ------ | -------------------- | ---- | ---------------------- |
| GET    | `/health`            | No   | Health check           |
| GET    | `/api/auth/config`   | No   | Get auth configuration |
| POST   | `/api/auth/register` | No   | Register new user      |
| POST   | `/api/auth/login`    | No   | Login                  |
| GET    | `/api/auth/verify`   | Yes  | Verify token           |
| POST   | `/api/auth/logout`   | No   | Logout (client-side)   |
| GET    | `/agentx/info`       | Yes  | Get platform info      |
| WS     | `/ws`                | Yes  | WebSocket connection   |

### Authentication

All protected endpoints require a JWT token in the Authorization header:

```text
Authorization: Bearer <token>
```

For WebSocket connections (which don't support headers), pass the token as a query parameter:

```text
ws://localhost:5200/ws?token=<token>
```

### Register

```bash
curl -X POST http://localhost:5200/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "secret123",
    "inviteCode": "1765152001",
    "email": "john@example.com",
    "displayName": "John Doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:5200/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "john",
    "password": "secret123"
  }'
```

## Docker Images

Pre-built images are available on Docker Hub:

```bash
# Latest version
docker pull deepracticexs/portagent:latest

# Specific version
docker pull deepracticexs/portagent:0.1.9

# Available architectures: linux/amd64, linux/arm64
```

### Building Locally

```bash
# From repository root
docker build -t portagent:local -f apps/portagent/Dockerfile .

# Run local build
docker run -d \
  --name portagent \
  -p 5200:5200 \
  -e LLM_PROVIDER_KEY=sk-ant-xxxxx \
  portagent:local
```

## Production Deployment

### Recommended Settings

```yaml
services:
  portagent:
    image: deepracticexs/portagent:0.1.9 # Pin to specific version
    restart: unless-stopped
    environment:
      - LLM_PROVIDER_KEY=${LLM_PROVIDER_KEY}
      - JWT_SECRET=${JWT_SECRET} # Use a strong, persistent secret
      - INVITE_CODE_REQUIRED=true # Enable for production
      - LOG_LEVEL=info
    volumes:
      - ./data:/home/agentx/.agentx # Persist data
    ports:
      - "5200:5200"
```

### Security Considerations

1. **API Key**: Never expose `LLM_PROVIDER_KEY` in client-side code or logs
2. **JWT Secret**: Use a strong, random secret and keep it consistent across restarts
3. **Invite Codes**: Enable invite codes in production to control access
4. **HTTPS**: Use a reverse proxy (nginx, Caddy) with TLS in production
5. **Volume Permissions**: The container runs as non-root user (uid 1001)

### Reverse Proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name portagent.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### "LLM_PROVIDER_KEY is required"

- Ensure `LLM_PROVIDER_KEY` environment variable is set
- For Docker, use `-e LLM_PROVIDER_KEY=xxx` or `environment:` in compose

### "Invalid invite code"

- Invite code changes daily at midnight (server timezone)
- Docker uses UTC by default
- Calculate code for correct timezone (see Invite Code section)
- Set `INVITE_CODE_REQUIRED=false` to disable

### Permission denied errors

- Docker container runs as user `agentx` (uid 1001)
- Ensure mounted volumes have correct permissions:

```bash
sudo chown -R 1001:1001 ./data
```

### WebSocket connection fails

- Ensure token is passed as query parameter for WS connections
- Check reverse proxy WebSocket configuration

### Viewing Logs

```bash
# Docker logs
docker logs portagent

# Follow logs
docker logs -f portagent

# Log files inside container
docker exec portagent cat /home/agentx/.agentx/logs/portagent.log
```

## Development

```bash
# Clone repository
git clone https://github.com/Deepractice/AgentX.git
cd AgentX

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development server
cd apps/portagent
pnpm dev
```

## License

MIT License - see [LICENSE](./LICENSE) for details.
