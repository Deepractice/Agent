---
"@agentxjs/types": minor
"@agentxjs/runtime": minor
"agentxjs": minor
"@agentxjs/ui": patch
---

feat: MCP configuration refactor - ImageRecord as single source of truth

- Add `mcpServers` field to ImageRecord for persistent storage
- Add `defaultAgent` to LocalConfig for system-level agent defaults
- RuntimeAgent reads config (name, systemPrompt, mcpServers) from ImageRecord
- Export McpServerConfig from runtime/internal barrel
- Dev-server uses stdio transport for MCP servers
