# @agentxjs/portagent

## 0.1.6

### Patch Changes

- Updated dependencies [2474559]
  - @agentxjs/runtime@0.1.6
  - agentxjs@0.1.6
  - @agentxjs/ui@0.1.6

## 0.1.5

### Patch Changes

- Updated dependencies [275f120]
  - @agentxjs/runtime@0.1.5
  - agentxjs@0.1.5
  - @agentxjs/ui@0.1.5

## 0.1.4

### Patch Changes

- faa35d4: fix: remove private packages from npm dependencies
  - Move internal packages to devDependencies
  - Bundle via tsup noExternal config
  - Fixes npm install errors for end users

- Updated dependencies [faa35d4]
  - agentxjs@0.1.4
  - @agentxjs/runtime@0.1.4
  - @agentxjs/ui@0.1.4

## 0.1.3

### Patch Changes

- 02171e5: fix: remove private packages from published dependencies

  Move @agentxjs/types, @agentxjs/common, @agentxjs/agent from dependencies
  to devDependencies. These packages are bundled via tsup noExternal config
  and should not appear in the published package.json dependencies.

- Updated dependencies [02171e5]
  - agentxjs@0.1.3
  - @agentxjs/runtime@0.1.3
  - @agentxjs/ui@0.1.3

## 0.1.2

### Patch Changes

- 0fa60d4: fix: bundle internal packages to avoid npm dependency issues
  - Configure tsup to bundle @agentxjs/types, @agentxjs/common, @agentxjs/agent
  - Remove @agentxjs/types dependency from portagent
  - These private packages are now bundled instead of being external dependencies

- Updated dependencies [0fa60d4]
  - agentxjs@0.1.2
  - @agentxjs/runtime@0.1.2
  - @agentxjs/ui@0.1.2

## 0.1.1

### Patch Changes

- aa60143: test: verify CI publish workflow
- Updated dependencies [aa60143]
  - agentxjs@0.1.1
  - @agentxjs/runtime@0.1.1
  - @agentxjs/ui@0.1.1

## 0.1.0

### Minor Changes

- a22942e: Add invite code validation for user registration
  - Add invite code field to registration form (required by default)
  - Invite code is validated as today's 00:00:01 Unix timestamp
  - Make email field optional during registration
  - Add `INVITE_CODE_REQUIRED` environment variable to enable/disable invite code requirement
  - Add `/api/auth/config` endpoint for frontend to fetch auth configuration

### Patch Changes

- agentxjs@0.1.0
- @agentxjs/types@0.1.0
- @agentxjs/node-runtime@0.1.0
- @agentxjs/ui@0.1.0

## 0.0.9

### Patch Changes

- Updated dependencies
  - @agentxjs/node-runtime@0.0.9
  - @agentxjs/ui@0.0.9
  - agentxjs@0.0.9
  - @agentxjs/types@0.0.9

## 0.0.8

### Patch Changes

- Publish @agentxjs/common as public package to fix logger singleton issue across packages
- Updated dependencies
  - agentxjs@0.0.6
  - @agentxjs/node-runtime@0.0.6
  - @agentxjs/ui@0.0.6
  - @agentxjs/types@0.0.6

## 0.0.7

### Patch Changes

- Move dotenv to dependencies to fix ESM/CJS compatibility issue

## 0.0.6

### Patch Changes

- Bundle dotenv into CLI to fix runtime dependency issue

## 0.0.5

### Patch Changes

- Updated dependencies
  - @agentxjs/ui@0.0.5
  - agentxjs@0.0.5
  - @agentxjs/types@0.0.5
  - @agentxjs/node-runtime@0.0.5

## 0.0.4

### Patch Changes

- Bundle internal packages (@agentxjs/agent, @agentxjs/common, @agentxjs/engine) into published packages to fix npm install failures
- b206fda: Initial release of AgentX platform (v0.0.2)
  - agentxjs: Main entry point for AgentX framework
  - @agentxjs/types: TypeScript type definitions
  - @agentxjs/node-runtime: Node.js runtime with Claude SDK, SQLite, FileLogger
  - @agentxjs/ui: React UI components for building AI agent interfaces
  - @agentxjs/portagent: AgentX Portal CLI application

- Updated dependencies
- Updated dependencies [b206fda]
  - agentxjs@0.0.4
  - @agentxjs/node-runtime@0.0.4
  - @agentxjs/types@0.0.4
  - @agentxjs/ui@0.0.4
