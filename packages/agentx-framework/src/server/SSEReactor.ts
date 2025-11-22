/**
 * SSEReactor - Server-side SSE event forwarder
 *
 * Forwards all Agent events to SSE clients using native SSE implementation.
 * Built with defineReactor for minimal boilerplate.
 *
 * @example
 * ```typescript
 * import { SSEReactor, createSimpleSSESession } from "@deepractice-ai/agentx-sdk-server";
 *
 * const session = createSimpleSSESession({ res });
 * const reactor = SSEReactor.create({ session });
 * ```
 */

import { defineReactor } from "~/defineReactor";
import type { SimpleSSESession } from "~/server/SimpleSSESession";

/**
 * SSEReactor config
 */
export interface SSEReactorConfig {
  session: SimpleSSESession;
}

/**
 * Helper to send event to SSE client
 */
function sendEvent(session: SimpleSSESession, event: any): void {
  try {
    console.log(`[SSEReactor sendEvent] Event type: ${event.type}, isConnected: ${session.isConnected}`);

    // Check if session is still active
    if (!session.isConnected) {
      console.warn(`[SSEReactor] ❌ Cannot send event - SSE session disconnected`, {
        eventType: event.type,
      });
      return;
    }

    // Send event via SSE (SimpleSSESession handles formatting)
    console.log(`[SSEReactor sendEvent] Calling session.push() for ${event.type}`);
    session.push(event, event.type);
    console.log(`[SSEReactor sendEvent] ✅ session.push() completed for ${event.type}`);
  } catch (error) {
    console.error("[SSEReactor] ❌ Failed to send event:", {
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

/**
 * SSEReactor - Built with defineReactor
 *
 * Forwards Stream Layer events to SSE clients.
 * Browser-side Agent will automatically assemble Message/State/Turn events from these.
 *
 * Architecture:
 * Server: Driver → StreamEvents → SSEReactor → SSE
 * Browser: SSE → StreamEvents → MessageAssembler/StateMachine/TurnTracker → Complete Events
 */
export const SSEReactor = defineReactor<SSEReactorConfig>({
  name: "SSE",

  onInit: (context, config) => {
    console.log("[SSEReactor] Initialized", {
      sessionActive: config.session.isConnected,
      agentId: context.agentId,
    });
  },

  // ==================== Stream Layer (底层事件) ====================
  // Only forward Stream Layer - other layers will be auto-assembled by browser-side Agent
  onMessageStart: (e, cfg) => {
    console.log("[SSEReactor] onMessageStart called");
    sendEvent(cfg.session, e);
  },
  onMessageDelta: (e, cfg) => sendEvent(cfg.session, e),
  onMessageStop: (e, cfg) => sendEvent(cfg.session, e),
  onTextContentBlockStart: (e, cfg) => {
    console.log("[SSEReactor] onTextContentBlockStart called");
    sendEvent(cfg.session, e);
  },
  onTextDelta: (e, cfg) => {
    console.log("[SSEReactor] onTextDelta called");
    sendEvent(cfg.session, e);
  },
  onTextContentBlockStop: (e, cfg) => sendEvent(cfg.session, e),
  onToolUseContentBlockStart: (e, cfg) => sendEvent(cfg.session, e),
  onInputJsonDelta: (e, cfg) => sendEvent(cfg.session, e),
  onToolUseContentBlockStop: (e, cfg) => sendEvent(cfg.session, e),
  onToolCall: (e, cfg) => sendEvent(cfg.session, e),
  onToolResult: (e, cfg) => sendEvent(cfg.session, e),
});
