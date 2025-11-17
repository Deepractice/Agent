# @deepractice-ai/agent

## 0.13.0

### Minor Changes

- 59fe410: Pre-install PromptX CLI to avoid npx installation delays
  - Install @promptx/cli globally in Docker image
  - Use 'promptx mcp-server' command instead of npx
  - Improve startup reliability and speed

### Patch Changes

- 59fe410: Change error recovery strategy: treat all errors as recoverable by default

  This update improves user experience by allowing sessions to continue after errors (e.g., insufficient credits). Previously, many errors would permanently terminate sessions, requiring users to create new sessions even after fixing the issue.

  Changes:
  - Modified `isRecoverableError()` to return `true` by default for all errors
  - Sessions now stay in `idle` state after errors instead of `error` state
  - Added empty `fatalErrorPatterns` array for future data-driven classification
  - Enhanced error logging with `errorMessage` field for analysis
  - Updated frontend error messages with specific recovery suggestions

  Benefits:
  - Users can continue sessions after recharging credits
  - Better handling of temporary failures (network issues, rate limits)
  - Data-driven approach: collect fatal errors first, then classify
  - Improved error messages guide users to solutions

- Updated dependencies [59fe410]
  - @deepractice-ai/agent-sdk@0.13.0

## 0.12.0

### Patch Changes

- 8e565f8: Change error recovery strategy: treat all errors as recoverable by default

  This update improves user experience by allowing sessions to continue after errors (e.g., insufficient credits). Previously, many errors would permanently terminate sessions, requiring users to create new sessions even after fixing the issue.

  Changes:
  - Modified `isRecoverableError()` to return `true` by default for all errors
  - Sessions now stay in `idle` state after errors instead of `error` state
  - Added empty `fatalErrorPatterns` array for future data-driven classification
  - Enhanced error logging with `errorMessage` field for analysis
  - Updated frontend error messages with specific recovery suggestions

  Benefits:
  - Users can continue sessions after recharging credits
  - Better handling of temporary failures (network issues, rate limits)
  - Data-driven approach: collect fatal errors first, then classify
  - Improved error messages guide users to solutions

- Updated dependencies [8e565f8]
  - @deepractice-ai/agent-sdk@0.12.0

## 0.11.0

### Minor Changes

- 184beba: Add default system prompt for PromptX integration

  Improve role activation experience by adding a default system prompt that helps AI understand:
  - Current environment uses PromptX MCP server
  - Role activation can use short names without specifying "promptx"
  - Available PromptX capabilities and functions

  This addresses issue #100 where users had to explicitly say "activate promptx XXX role" instead of just "activate XXX role".

  **Changes:**
  - Add `DEFAULT_SYSTEM_PROMPT` constant with PromptX context
  - Update `ClaudeAdapter` to pass `systemPrompt` to SDK
  - Add `systemPrompt` field to `AgentConfig` type
  - System prompt priority: session option > agent config > default

  **Usage:**
  Users can now simply say "activate sean" or "activate writer" without specifying the platform name.

- d48a453: Implement session error recovery mechanism to handle recoverable errors

  This change distinguishes between recoverable and fatal errors, allowing sessions to continue after temporary failures like insufficient credits or rate limits.

  **Changes:**

  SDK (`@deepractice-ai/agent-sdk`):
  - Added `isRecoverableError()` utility function to detect recoverable errors (402, 429, timeouts, 503)
  - Modified `ClaudeSession.send()` to return to `idle` state for recoverable errors instead of `error` state
  - Added `_lastError` tracking and `getLastError()` public method
  - Updated `Session` interface to include `getLastError()` method

  Server (`apps/agent/server`):
  - Added state guard in `chat.js` to prevent sending messages to completed sessions
  - Enhanced error responses with `recoverable` and `state` flags

  Frontend (`apps/agent/web`):
  - Updated event types to include `recoverable` and `state` fields for error events
  - Enhanced `WebSocketAdapter` to parse and forward error recovery information
  - Improved `messageStore` to display context-aware error messages:
    - Recoverable: "⚠️ Error message ✅ Session still active, you can continue"
    - Fatal: "❌ Error message ⛔ Session failed, please create new session"

  **User Impact:**

  Before: Any API error (including temporary ones like insufficient credits) would permanently terminate the session, forcing users to create new sessions and lose conversation context.

  After: Recoverable errors (insufficient credits, rate limits, timeouts) allow the session to remain active. Users can resolve the issue (e.g., add credits) and continue the conversation without losing context.

### Patch Changes

- Updated dependencies [184beba]
- Updated dependencies [d48a453]
  - @deepractice-ai/agent-sdk@0.11.0

## 0.10.0

### Minor Changes

- 41c54f3: feat: implement ESC key interruption using Claude SDK's interrupt API

  Added proper interruption support by leveraging Claude SDK's built-in interrupt functionality:
  - Add global ESC key listener in ChatInterface to abort active sessions
  - Implement interrupt() method in ClaudeAdapter that calls SDK's query.interrupt()
  - Update ClaudeSession.abort() to properly interrupt the underlying SDK query
  - Store current query instance in adapter for clean interruption

  Users can now press ESC during agent processing to immediately stop the current operation.

- 363911f: refactor: unify message streaming architecture using SDK events

  Major refactor to eliminate duplicate message channels and establish single source of truth:

  **Backend (agent-sdk):**
  - Claude Session now uses only `streamEventSubject` for real-time messages
  - `messageSubject` deprecated (kept for compatibility but not used)
  - All SDK messages (stream_event, assistant, user, result) forwarded to stream
  - User messages manually sent to stream in SDK format
  - `messages[]` array maintained only for REST API historical queries

  **Backend (WebSocket):**
  - `sessions-broadcast.js`: Changed message format from `agent-response` to `sdk-event`
  - `chat.js`: Removed stream subscription, only calls `send()` - messages broadcast via sessions-broadcast
  - Unified single channel architecture prevents duplicate messages

  **Frontend:**
  - Added `sdk-event` handler in websocketAdapter
  - Handles all SDK message types: stream_event, assistant, user, result
  - Tool results now properly displayed from SDK user messages
  - Maintains backward compatibility with `agent-response` messages

  **Benefits:**
  - ✅ Single source of truth for real-time messages
  - ✅ No duplicate messages
  - ✅ Tool results display correctly
  - ✅ Consistent flow for first and subsequent conversations
  - ✅ Simplified architecture with clear responsibilities

### Patch Changes

- e3a2035: fix: prevent duplicate message output in WebSocket stream

  Fixed three duplicate message issues:
  1. Tool result messages were sent twice (SDK transform + WebSocket forward)
  2. Assistant messages appeared twice after streaming (streaming delta + complete message)
  3. Text blocks in content arrays duplicated streaming content

  Changes:
  - Filter tool_result messages in WebSocket chat handler to prevent duplicate tool outputs
  - Track streaming completion state to skip duplicate complete messages
  - Apply streaming check to both string content and content array text blocks

- bd56098: fix: prevent Enter key from sending message during IME composition

  Fixed issue where pressing Enter to select IME (Input Method Editor) candidates would incorrectly trigger message send. This affected users typing in Chinese, Japanese, Korean, and other languages using input methods.

  Changes:
  - Add isComposing check to handleKeyDown to distinguish between IME confirmation and actual message send
  - Enter key now only sends message when not in IME composition state

- Updated dependencies [363911f]
  - @deepractice-ai/agent-sdk@0.10.0

## 0.9.0

### Minor Changes

- b08aadc: Add built-in PromptX MCP server support and fix MCP tool result display
  - Built-in PromptX MCP server configuration using `npx -y @promptx/mcp-server`
  - Fix MCP tool result display showing `[object Object]` instead of actual content
  - Properly serialize object results from MCP tools to JSON format

### Patch Changes

- 296a721: Fix tool execution output duplication issue in WebSocket stream
- edf2b3d: Fix user message text overflow issue - add overflow handling for long text content
- Updated dependencies [296a721]
  - @deepractice-ai/agent-sdk@0.9.0

## 0.8.2

### Patch Changes

- f627796: Fix streaming output and UI bugs
  - Remove fake token counter from AgentStatus component (real-time streaming output makes it unnecessary)
  - Fix duplicate streaming messages by preventing multiple WebSocket connections
  - Add streaming event support to session manager for real-time text updates
  - Improve WebSocket connection management to prevent reconnection loops

- 8a9df83: Fix tool result display and new conversation streaming

  **Tool Result Display**
  - Fixed tool_result messages not being processed in claude-session.ts
  - Tool results now correctly update corresponding tool use messages
  - Added Bash tool result display (removed from hidden list)
  - All tools (WebSearch, Bash, etc.) now show their execution results

  **New Conversation Streaming**
  - Fixed streaming response not displaying for new conversations
  - Frontend now passes tempId to backend in POST /sessions/create
  - Backend uses tempId for streaming events before real session ID is available
  - Streaming events now match frontend's pending session ID
  - Existing conversations continue to work normally (no breaking changes)

  **Technical Changes**
  - Modified transformSDKMessage to handle tool_result blocks and update existing messages
  - Added tempId to SessionCreateOptions interface
  - Session manager now uses frontend tempId for streaming events
  - WebSocket adapter correctly forwards all streaming messages

- Updated dependencies [f627796]
- Updated dependencies [8a9df83]
  - @deepractice-ai/agent-sdk@0.8.2

## 0.8.1

### Patch Changes

- 85c07c2: Fix WebSocket connection stability and prevent rapid reconnect loops
  - Add error event handler to server chat WebSocket to capture connection errors
  - Implement 30-second heartbeat mechanism (server sends ping, client auto-responds with pong)
  - Add 10-second connection timeout to prevent hanging connections
  - Enhance close event logging with code, reason, and wasClean flag for better debugging
  - Adjust reconnection backoff strategy from 2s to 5s initial delay (5s → 10s → 20s → 30s)
  - Improve reconnection attempt logging with progress counter (attempt X/5)

  These changes prevent idle connection drops caused by network intermediaries and eliminate UI stuttering from frequent reconnect cycles. WebSocket connections now remain stable for extended periods.
  - @deepractice-ai/agent-sdk@0.8.1

## 0.8.0

### Minor Changes

- 078d87e: feat: add auto-run feature for Docker containers
  - Add `/api/start-url` endpoint to support automatic prompt execution on startup
  - Add `/auto` route to handle auto-run with prompt and session parameters
  - Support `AUTO_RUN_PROMPT` and `AUTO_RUN_SESSION_ID` environment variables
  - Backend manages one-time auto-run to prevent repeated execution
  - Update Docker configuration and documentation with auto-run examples

### Patch Changes

- @deepractice-ai/agent-sdk@0.8.0

## 0.7.0

### Minor Changes

- c7d426e: Add URL query parameter support for auto-starting sessions with initial prompt

  Users can now start a new session automatically by providing a prompt in the URL query parameter:
  - `http://localhost:5173/?prompt=your-message` will create a new session and send the message
  - The prompt parameter is automatically cleared from the URL after processing
  - Fixed React Strict Mode double execution issue using useRef

### Patch Changes

- Updated dependencies [dabb970]
  - @deepractice-ai/agent-sdk@0.7.0

## 0.6.4

### Patch Changes

- a240812: Fix changeset fixed groups configuration

  Replace wildcard pattern with explicit package names as changeset doesn't support glob patterns in fixed groups.

- Updated dependencies [a240812]
  - @deepractice-ai/agent-sdk@0.6.4

## 0.6.3

### Patch Changes

- ea7bab5: Fix duplicate session rendering in sidebar

  Prevent duplicate session items from appearing when creating a new session by adding duplicate check in addSession method.

## 0.6.2

### Patch Changes

- 91abd32: Fix DiffDisplay crash when loading sessions with Edit/Write tool history

  Fixed a critical bug where the application would crash with "createDiff(...).map is not a function" error when loading historical sessions containing Edit or Write tool calls. The issue was caused by using a stub implementation that returned an empty string instead of properly using the useDiffCalculation hook that returns an array of diff objects.

## 0.6.1

### Patch Changes

- dce9d18: Sync package versions and fix documentation
  - Fix incorrect package name in README installation instructions
  - Sync agent-sdk version to match agent package (0.6.0)
  - Ensure version consistency across fixed package groups

- Updated dependencies [dce9d18]
  - @deepractice-ai/agent-sdk@0.6.1

## 0.6.0

### Minor Changes

- b5c7d21: Update Docker image to use consolidated @deepractice-ai/agent package
  - Changed Dockerfile to install @deepractice-ai/agent instead of deprecated @deepractice-ai/agent-cli
  - The new package includes CLI, server, and web UI in a single distribution
  - Maintains backward compatibility with existing agentx CLI command
