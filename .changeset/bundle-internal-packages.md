---
"agentxjs": patch
"@agentxjs/runtime": patch
"@agentxjs/ui": patch
"@agentxjs/portagent": patch
---

fix: bundle internal packages to avoid npm dependency issues

- Configure tsup to bundle @agentxjs/types, @agentxjs/common, @agentxjs/agent
- Remove @agentxjs/types dependency from portagent
- These private packages are now bundled instead of being external dependencies
