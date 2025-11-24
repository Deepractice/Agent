/**
 * WebSocketReactor - Server-side WebSocket event forwarder
 *
 * Forwards all Agent events to WebSocket clients.
 * Built with defineReactor for minimal boilerplate.
 *
 * @example
 * ```typescript
 * import { WebSocketReactor } from "@deepractice-ai/agentx-framework/ws";
 *
 * const reactor = WebSocketReactor.create({ ws: websocketInstance });
 * ```
 */

import { defineReactor } from "../defineReactor";

/**
 * WebSocket-like interface for platform independence
 */
export interface WebSocketLike {
  send(data: string): void;
  readyState: number;
}

/**
 * WebSocketReactor config
 */
export interface WebSocketReactorConfig {
  ws: WebSocketLike;
}

/**
 * Helper to send event to WebSocket
 */
function sendEvent(ws: WebSocketLike, event: any): void {
  try {
    // Only send if WebSocket is open (readyState === 1)
    if (ws.readyState === 1) {
      // Log important events
      if (event.type === "error_message" || event.type === "assistant_message") {
        console.log(`[WebSocketReactor] ✅ Sending ${event.type} to client`);
      }
      ws.send(JSON.stringify(event));
    } else {
      console.warn(`[WebSocketReactor] ❌ Cannot send event - WebSocket not open`, {
        eventType: event.type,
        readyState: ws.readyState,
        stateText: ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][ws.readyState] || "UNKNOWN",
      });
    }
  } catch (error) {
    console.error("[WebSocketReactor] ❌ Failed to send event:", {
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * WebSocketReactor - Built with defineReactor
 *
 * Forwards all events from all 4 reactor layers to WebSocket clients.
 * This enables real-time streaming of agent events to browser clients.
 */
export const WebSocketReactor = defineReactor<WebSocketReactorConfig>({
  name: "WebSocket",

  // ==================== Stream Layer ====================
  onMessageStart: (e, cfg) => sendEvent(cfg.ws, e),
  onMessageDelta: (e, cfg) => sendEvent(cfg.ws, e),
  onMessageStop: (e, cfg) => sendEvent(cfg.ws, e),
  onTextContentBlockStart: (e, cfg) => sendEvent(cfg.ws, e),
  onTextDelta: (e, cfg) => sendEvent(cfg.ws, e),
  onTextContentBlockStop: (e, cfg) => sendEvent(cfg.ws, e),
  onToolUseContentBlockStart: (e, cfg) => sendEvent(cfg.ws, e),
  onInputJsonDelta: (e, cfg) => sendEvent(cfg.ws, e),
  onToolUseContentBlockStop: (e, cfg) => sendEvent(cfg.ws, e),
  onToolCall: (e, cfg) => sendEvent(cfg.ws, e),
  onToolResult: (e, cfg) => sendEvent(cfg.ws, e),

  // ==================== State Layer ====================
  onAgentReady: (e, cfg) => sendEvent(cfg.ws, e),
  onConversationStart: (e, cfg) => sendEvent(cfg.ws, e),
  onConversationThinking: (e, cfg) => sendEvent(cfg.ws, e),
  onConversationResponding: (e, cfg) => sendEvent(cfg.ws, e),
  onConversationEnd: (e, cfg) => sendEvent(cfg.ws, e),
  onToolPlanned: (e, cfg) => sendEvent(cfg.ws, e),
  onToolExecuting: (e, cfg) => sendEvent(cfg.ws, e),
  onToolCompleted: (e, cfg) => sendEvent(cfg.ws, e),
  onToolFailed: (e, cfg) => sendEvent(cfg.ws, e),
  onStreamStart: (e, cfg) => sendEvent(cfg.ws, e),
  onStreamComplete: (e, cfg) => sendEvent(cfg.ws, e),
  onErrorOccurred: (e, cfg) => sendEvent(cfg.ws, e),

  // ==================== Message Layer ====================
  // NOTE: Message Layer events should NOT be forwarded - client assembles them locally from Stream Layer events
  // This prevents duplicate messages (server assembles + client assembles = double!)
  // onUserMessage: (e, cfg) => sendEvent(cfg.ws, e),  // ❌ Client already has this
  // onAssistantMessage: (e, cfg) => sendEvent(cfg.ws, e),  // ❌ Client assembles from stream events
  // onToolUseMessage: (e, cfg) => sendEvent(cfg.ws, e),  // ❌ Client assembles from stream events

  // EXCEPTION: error_message MUST be forwarded (critical errors from server)
  onErrorMessage: (e, cfg) => sendEvent(cfg.ws, e),

  // ==================== Turn Layer ====================
  onTurnRequest: (e, cfg) => sendEvent(cfg.ws, e),
  onTurnResponse: (e, cfg) => sendEvent(cfg.ws, e),
});
