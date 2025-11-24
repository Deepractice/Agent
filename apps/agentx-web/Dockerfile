# Deepractice AgentX Web
# Uses pre-built artifacts from host
#

ARG RUNTIME_VERSION=latest
FROM deepracticexs/agent-runtime:${RUNTIME_VERSION}

# Switch to root for installations
USER root

# Install PromptX CLI globally (includes MCP server, pre-install to avoid npx delays)
RUN npm install -g @promptx/cli

WORKDIR /app

# Copy entire monorepo (pre-built on host) with correct ownership
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node packages ./packages
COPY --chown=node:node apps/agentx-web ./apps/agentx-web
COPY --chown=node:node node_modules ./node_modules

# Environment variables
ENV NODE_ENV=production \
    PORT=5200 \
    AGENT_WORK_DIR=/project \
    LOG_DIR=/logs

# Runtime variables (must be provided via docker run -e or docker-compose):
# - ANTHROPIC_API_KEY (required) → mapped to AGENTX_API_KEY
# - ANTHROPIC_BASE_URL (optional, default: https://api.anthropic.com) → mapped to AGENTX_BASE_URL
# - AGENTX_MODEL (optional, default: claude-sonnet-4-5-20250929)
# - AGENT_WORK_DIR (optional, default: /project)
# - AGENT_SYSTEM_PROMPT (optional)
# - AGENT_MAX_TURNS (optional)
# - AGENT_PERMISSION_MODE (optional, default: bypassPermissions)

# Create working directory and set ownership
RUN mkdir -p /project && chown node:node /project

# Switch to non-root user
USER node

# Expose port
EXPOSE 5200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5200/ || exit 1

# Start agentx-web server with environment variable mapping
WORKDIR /app/apps/agentx-web
CMD sh -c 'export AGENTX_API_KEY=${ANTHROPIC_API_KEY}; export AGENTX_BASE_URL=${ANTHROPIC_BASE_URL:-https://api.anthropic.com}; exec pnpm start'
