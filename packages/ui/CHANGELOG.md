# @agentxjs/ui

## 1.1.0

### Minor Changes

- da7e950: Add interrupt functionality with ESC key support and AssistantToolbar
  - Add AssistantToolbar component with action buttons (copy, regenerate, like, dislike)
  - Show "esc to stop" hint during streaming/thinking states
  - Show action buttons when conversation is completed
  - Add ESC key listener in Chat component to interrupt ongoing conversations
  - Pass onStop callback to AssistantEntry for toolbar click handling

- 47092ae: Add mobile responsive support with separate mobile components

  **@agentxjs/ui:**
  - Add mobile components: MobileDrawer, MobileHeader, MobileMessagePane, MobileInputPane, MobileChat, MobileAgentList
  - Add MobileStudio for full mobile experience with drawer navigation
  - Add ResponsiveStudio for automatic mobile/desktop switching at 768px breakpoint
  - Add useIsMobile hook for viewport detection
  - Mobile design follows Claude App's minimalist style

  **@agentxjs/portagent:**
  - Use ResponsiveStudio for automatic mobile/desktop layout switching

- 5749112: refactor(ui): unify assistant message lifecycle with single component

  **Major Changes:**
  - Consolidated `ThinkingMessage` and `StreamingMessage` into a single `AssistantMessage` component that handles all lifecycle states
  - Added message-level status types: `UserMessageStatus` and `AssistantMessageStatus`
  - Implemented complete status flow: `queued → thinking → responding → success`
  - Created comprehensive Stories for `AssistantMessage` and `ToolMessage` components

  **Technical Improvements:**
  - Applied single responsibility principle - one component manages all assistant message states
  - Added `useAgent` hook to manage assistant message status transitions automatically
  - Improved Chat component with unified message rendering logic
  - Fixed `RuntimeOperations.getImageMessages` type signature to use proper `Message[]` type

  **UI Enhancements:**
  - `queued` state: "Queue..." with animated dots
  - `thinking` state: "Thinking..." with animated dots
  - `responding` state: Streaming text with cursor animation
  - `success` state: Complete rendered message

  This refactoring significantly improves code maintainability and provides a clearer mental model for message lifecycle management.

- f20f020: Refactor UI to conversation-first, block-based architecture

  **Breaking Changes:**
  - Removed `MessageRenderer`, `MessageHandler`, `createMessageChain`
  - Removed individual message stories (AssistantMessage, UserMessage, ToolMessage, UnknownMessage)
  - `useAgent` hook now returns `conversations` instead of `messages`

  **New Architecture:**
  - **Conversation-first design**: User/Assistant/Error conversations as top-level units
  - **Block-based content**: AssistantConversation contains blocks (TextBlock, ToolBlock, ImageBlock)
  - **Unified state management**: Single reducer pattern with stable IDs

  **New Components:**
  - `UserEntry`, `AssistantEntry`, `ErrorEntry` - conversation-level components
  - `TextBlock`, `ToolBlock` - content block components

  **New Features:**
  - Tool planning status: Shows "Planning..." when AI is generating tool input
  - Proper text preservation: Text no longer disappears when tool calls start
  - Streaming text block support with cursor animation

  **Bug Fixes:**
  - Fixed text disappearing during tool call loops
  - Fixed history messages being overwritten by new messages

### Patch Changes

- agentxjs@1.1.0

## 1.0.2

### Patch Changes

- agentxjs@1.0.2

## 1.0.1

### Patch Changes

- Updated dependencies [608bc77]
  - agentxjs@1.0.1

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

## 0.1.9

### Patch Changes

- agentxjs@0.1.9

## 0.1.8

### Patch Changes

- agentxjs@0.1.8

## 0.1.7

### Patch Changes

- agentxjs@0.1.7

## 0.1.6

### Patch Changes

- agentxjs@0.1.6

## 0.1.5

### Patch Changes

- agentxjs@0.1.5

## 0.1.4

### Patch Changes

- faa35d4: fix: remove private packages from npm dependencies
  - Move internal packages to devDependencies
  - Bundle via tsup noExternal config
  - Fixes npm install errors for end users

- Updated dependencies [faa35d4]
  - agentxjs@0.1.4

## 0.1.3

### Patch Changes

- 02171e5: fix: remove private packages from published dependencies

  Move @agentxjs/types, @agentxjs/common, @agentxjs/agent from dependencies
  to devDependencies. These packages are bundled via tsup noExternal config
  and should not appear in the published package.json dependencies.

- Updated dependencies [02171e5]
  - agentxjs@0.1.3

## 0.1.2

### Patch Changes

- 0fa60d4: fix: bundle internal packages to avoid npm dependency issues
  - Configure tsup to bundle @agentxjs/types, @agentxjs/common, @agentxjs/agent
  - Remove @agentxjs/types dependency from portagent
  - These private packages are now bundled instead of being external dependencies

- Updated dependencies [0fa60d4]
  - agentxjs@0.1.2

## 0.1.1

### Patch Changes

- aa60143: test: verify CI publish workflow
- Updated dependencies [aa60143]
  - agentxjs@0.1.1

## 0.1.0

### Patch Changes

- agentxjs@0.1.0
- @agentxjs/types@0.1.0

## 0.0.9

### Patch Changes

- agentxjs@0.0.9
- @agentxjs/types@0.0.9

## 0.0.6

### Patch Changes

- Updated dependencies
  - agentxjs@0.0.6
  - @agentxjs/types@0.0.6

## 0.0.5

### Patch Changes

- Move @agentxjs/common to devDependencies to fix npm install (bundled via Vite)
  - agentxjs@0.0.5
  - @agentxjs/types@0.0.5

## 0.0.4

### Patch Changes

- b206fda: Initial release of AgentX platform (v0.0.2)
  - agentxjs: Main entry point for AgentX framework
  - @agentxjs/types: TypeScript type definitions
  - @agentxjs/node-runtime: Node.js runtime with Claude SDK, SQLite, FileLogger
  - @agentxjs/ui: React UI components for building AI agent interfaces
  - @agentxjs/portagent: AgentX Portal CLI application

- Updated dependencies
- Updated dependencies [b206fda]
  - agentxjs@0.0.4
  - @agentxjs/types@0.0.4
  - @agentxjs/common@0.1.1
