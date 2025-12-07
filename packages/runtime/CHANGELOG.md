# @agentxjs/runtime

## 0.1.2

### Patch Changes

- 0fa60d4: fix: bundle internal packages to avoid npm dependency issues
  - Configure tsup to bundle @agentxjs/types, @agentxjs/common, @agentxjs/agent
  - Remove @agentxjs/types dependency from portagent
  - These private packages are now bundled instead of being external dependencies

## 0.1.1

### Patch Changes

- aa60143: test: verify CI publish workflow
