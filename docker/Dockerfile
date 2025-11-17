#
# Deepractice Agent - NPM-based Lightweight Dockerfile
# Uses published @deepractice-ai/agent from npm
#

ARG RUNTIME_VERSION=latest
FROM deepracticexs/agent-runtime:${RUNTIME_VERSION}

# Switch to root for installations
USER root

# Install agent globally from npm (includes CLI, server, and web UI)
RUN npm install -g @deepractice-ai/agent

# Install PromptX CLI globally (includes MCP server, pre-install to avoid npx delays)
RUN npm install -g @promptx/cli

# Environment variables
ENV NODE_ENV=production \
    PORT=5200 \
    PROJECT_PATH=/project \
    LOG_DIR=/logs

# Runtime variables (must be provided via docker run -e or docker-compose):
# - ANTHROPIC_API_KEY (required)
# - ANTHROPIC_BASE_URL (optional, default: https://api.anthropic.com)
# - AUTO_RUN_PROMPT (optional, prompt to auto-execute on startup)
# - AUTO_RUN_SESSION_ID (optional, session ID to resume)

# Create project and logs directories and set ownership
RUN mkdir -p /project /logs && chown node:node /project /logs

# Switch to non-root user
USER node

# Set working directory
WORKDIR /project

# Expose port
EXPOSE 5200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5200/api/health || exit 1

# Start application using agentx CLI
CMD ["agentx", "http", "--host", "0.0.0.0"]
