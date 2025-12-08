# agentxjs

## 1.0.1

### Patch Changes

- 608bc77: Bundle @agentxjs/network into agentxjs package to fix Docker build
  - Bundle @agentxjs/network into agentxjs dist (noExternal)
  - Move reconnecting-websocket and ws to runtime dependencies
  - Fix Docker build error where @agentxjs/network was not published to npm

  No API changes for users - the fix is transparent.
  - @agentxjs/runtime@1.0.1

## 1.0.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [4043daa]
  - @agentxjs/network@0.2.0
  - @agentxjs/runtime@1.0.0

## 0.1.9

### Patch Changes

- @agentxjs/runtime@0.1.9

## 0.1.8

### Patch Changes

- @agentxjs/runtime@0.1.8

## 0.1.7

### Patch Changes

- Updated dependencies [da67096]
  - @agentxjs/runtime@0.1.7

## 0.1.6

### Patch Changes

- Updated dependencies [2474559]
  - @agentxjs/runtime@0.1.6

## 0.1.5

### Patch Changes

- Updated dependencies [275f120]
  - @agentxjs/runtime@0.1.5

## 0.1.4

### Patch Changes

- faa35d4: fix: remove private packages from npm dependencies
  - Move internal packages to devDependencies
  - Bundle via tsup noExternal config
  - Fixes npm install errors for end users

- Updated dependencies [faa35d4]
  - @agentxjs/runtime@0.1.4

## 0.1.3

### Patch Changes

- 02171e5: fix: remove private packages from published dependencies

  Move @agentxjs/types, @agentxjs/common, @agentxjs/agent from dependencies
  to devDependencies. These packages are bundled via tsup noExternal config
  and should not appear in the published package.json dependencies.

- Updated dependencies [02171e5]
  - @agentxjs/runtime@0.1.3

## 0.1.2

### Patch Changes

- 0fa60d4: fix: bundle internal packages to avoid npm dependency issues
  - Configure tsup to bundle @agentxjs/types, @agentxjs/common, @agentxjs/agent
  - Remove @agentxjs/types dependency from portagent
  - These private packages are now bundled instead of being external dependencies

- Updated dependencies [0fa60d4]
  - @agentxjs/runtime@0.1.2

## 0.1.1

### Patch Changes

- aa60143: test: verify CI publish workflow
- Updated dependencies [aa60143]
  - @agentxjs/runtime@0.1.1

## 0.1.0

### Patch Changes

- @agentxjs/common@0.1.0
- @agentxjs/types@0.1.0

## 0.0.9

### Patch Changes

- @agentxjs/common@0.0.9
- @agentxjs/types@0.0.9

## 0.0.6

### Patch Changes

- Publish @agentxjs/common as public package to fix logger singleton issue across packages
- Updated dependencies
  - @agentxjs/common@0.1.0
  - @agentxjs/types@0.0.6

## 0.0.5

### Patch Changes

- @agentxjs/types@0.0.5

## 0.0.4

### Patch Changes

- Bundle internal packages (@agentxjs/agent, @agentxjs/common, @agentxjs/engine) into published packages to fix npm install failures
- b206fda: Initial release of AgentX platform (v0.0.2)
  - agentxjs: Main entry point for AgentX framework
  - @agentxjs/types: TypeScript type definitions
  - @agentxjs/node-runtime: Node.js runtime with Claude SDK, SQLite, FileLogger
  - @agentxjs/ui: React UI components for building AI agent interfaces
  - @agentxjs/portagent: AgentX Portal CLI application

- Updated dependencies [b206fda]
  - @agentxjs/types@0.0.4
