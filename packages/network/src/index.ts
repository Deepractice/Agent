/**
 * @agentxjs/network - Network layer abstraction (Node.js)
 *
 * Provides WebSocket client/server implementations of Channel interfaces.
 */

export { WebSocketServer } from "./WebSocketServer";
export { WebSocketClient, createWebSocketClient } from "./WebSocketClient";

// Re-export types
export type {
  ChannelServer,
  ChannelClient,
  ChannelConnection,
  ChannelClientOptions,
  ChannelServerOptions,
  Unsubscribe,
} from "@agentxjs/types/network";
