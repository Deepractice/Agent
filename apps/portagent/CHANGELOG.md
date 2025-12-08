# @agentxjs/portagent

## 1.0.1

### Patch Changes

- Updated dependencies [608bc77]
  - agentxjs@1.0.1
  - @agentxjs/ui@1.0.1
  - @agentxjs/runtime@1.0.1

## 1.0.0

### Patch Changes

- 4043daa: **Architecture: Extract network layer + Fix WebSocket connection timeout (#142)**

  ## Problem

  WebSocket connections were timing out after prolonged inactivity (60+ seconds), causing "WebSocket is already in CLOSING or CLOSED state" errors and request timeouts when creating new conversations.

  ## Solution

  ### 1. New Package: @agentxjs/network

  Extracted network layer into a dedicated package with clean abstraction:
  - **Channel Interface** - Transport-agnostic client/server interfaces
  - **WebSocketServer** - Server implementation with built-in heartbeat (30s ping/pong)
  - **WebSocketClient** - Node.js client
  - **BrowserWebSocketClient** - Browser client with auto-reconnect (using `reconnecting-websocket`)

  ### 2. Refactored agentx Package
  - Now depends on `@agentxjs/network` instead of direct WebSocket handling
  - Simplified codebase: removed 200+ lines of WebSocket management code
  - Cleaner separation: business logic vs network transport

  ### 3. Fixed Connection Timeout
  - **Server**: Ping every 30s, terminate on timeout
  - **Browser**: Auto-reconnect with exponential backoff (1-10s, infinite retries)
  - **Logging**: Connection state changes logged for debugging

  ## Benefits

  ✅ **Separation of Concerns** - Network layer isolated from business logic
  ✅ **Reusability** - Channel interfaces can be implemented with HTTP/2, gRPC, etc.
  ✅ **Testability** - Easy to mock Channel for testing
  ✅ **Maintainability** - Network code in one place

  ## Migration

  No breaking changes for users - same API, better internals.

- Updated dependencies [4043daa]
  - agentxjs@1.0.0
  - @agentxjs/ui@1.0.0
  - @agentxjs/runtime@1.0.0

## 0.1.9

### Patch Changes

- 1c488b0: fix(docker): ensure Docker image installs correct npm package version
  - Add VERSION build arg to Dockerfile for explicit version control
  - Wait for specific version availability on npm before building
  - Pass version via build-args to prevent installing stale cached versions
  - agentxjs@0.1.9
  - @agentxjs/runtime@0.1.9
  - @agentxjs/ui@0.1.9

## 0.1.8

### Patch Changes

- d873f12: refactor(portagent): simplify environment variable names
  - Rename `PORTAGENT_DATA_DIR` to `DATA_DIR` for brevity
  - Remove deprecated `PORTAGENT_PASSWORD` environment variable and CLI option
  - agentxjs@0.1.8
  - @agentxjs/runtime@0.1.8
  - @agentxjs/ui@0.1.8

## 0.1.7

### Patch Changes

- 06dc1d6: fix: run Docker container as non-root user
  - Add agentx user (UID 1001) to Docker image
  - Run container as non-root user to allow Claude Agent SDK bypassPermissions mode
  - Set AGENTX_DATA_DIR to user home directory

- Updated dependencies [da67096]
  - @agentxjs/runtime@0.1.7
  - agentxjs@0.1.7
  - @agentxjs/ui@0.1.7

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
