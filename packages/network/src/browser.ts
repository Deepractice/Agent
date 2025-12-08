/**
 * @agentxjs/network - Network layer abstraction (Browser)
 *
 * Browser-only exports with auto-reconnect support.
 */

export { BrowserWebSocketClient, createWebSocketClient } from "./WebSocketClient";

// Re-export types
export type { ChannelClient, ChannelClientOptions, Unsubscribe } from "@agentxjs/types/network";
