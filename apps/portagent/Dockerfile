# Portagent Dockerfile
# Image: deepracticexs/portagent
# Dogfooding: Install directly from npm registry

FROM deepracticexs/agent-runtime

# Version to install (passed from CI)
ARG VERSION=latest

WORKDIR /app

# Switch to root for npm install
USER root

# Install specific version from npm
RUN npm install -g @agentxjs/portagent@${VERSION}

# Create non-root user for security
# Claude Agent SDK requires non-root user for bypassPermissions mode
RUN addgroup -g 1001 -S agentx && \
    adduser -u 1001 -S agentx -G agentx && \
    mkdir -p /home/agentx/.agentx && \
    chown -R agentx:agentx /home/agentx /app

# Environment - Defaults
ENV NODE_ENV=production
ENV PORT=5200
ENV LOG_LEVEL=info
ENV DATA_DIR=/home/agentx/.agentx

# Environment - Required (must be provided at runtime)
# LLM_PROVIDER_KEY=sk-ant-xxxxx    # Anthropic API key
# LLM_PROVIDER_MODEL=claude-haiku-4-5-20251001
# Environment - Optional (can be overridden at runtime)
# LLM_PROVIDER_URL=https://api.anthropic.com
# JWT_SECRET=your-jwt-secret       # Auto-generated if not set
# INVITE_CODE_REQUIRED=true        # Set to "false" to disable

# Switch to non-root user
USER agentx

# Expose port
EXPOSE 5200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5200/health || exit 1

# Run
CMD ["portagent"]
