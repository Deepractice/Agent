# Portagent Dockerfile
# Image: deepracticexs/portagent
# Dogfooding: Install directly from npm registry

FROM deepracticexs/agent-runtime

# Version to install (passed from CI)
ARG VERSION=latest

WORKDIR /app

# Install specific version from npm (using sudo from base image)
RUN sudo npm install -g @agentxjs/portagent@${VERSION}

# Create data directory for node user
RUN mkdir -p /home/node/.agentx

# Environment - Defaults
ENV NODE_ENV=production
ENV PORT=5200
ENV LOG_LEVEL=info
ENV AGENTX_DIR=/home/node/.agentx

# Environment - Required (must be provided at runtime)
# LLM_PROVIDER_KEY=sk-ant-xxxxx    # Anthropic API key
# LLM_PROVIDER_MODEL=claude-haiku-4-5-20251001
# Environment - Optional (can be overridden at runtime)
# LLM_PROVIDER_URL=https://api.anthropic.com
# JWT_SECRET=your-jwt-secret       # Auto-generated if not set
# INVITE_CODE_REQUIRED=true        # Set to "false" to disable

# Run as non-root user (already defined in base image)
USER node

# Expose port
EXPOSE 5200

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5200/health || exit 1

# Run
CMD ["portagent"]
