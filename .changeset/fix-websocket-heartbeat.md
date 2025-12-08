---
"agentxjs": minor
"@agentxjs/network": minor
"@agentxjs/types": minor
"@agentxjs/portagent": patch
"@agentxjs/ui": patch
---

**Architecture: Extract network layer + Fix WebSocket connection timeout (#142)**

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
