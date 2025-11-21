/**
 * SSEReactor - Server-side SSE event forwarder
 *
 * Forwards all Agent events to SSE clients using better-sse.
 * Built with defineReactor for minimal boilerplate.
 *
 * @example
 * ```typescript
 * import { SSEReactor } from "@deepractice-ai/agentx-sdk-server";
 * import { createSession } from "better-sse";
 *
 * const session = await createSession(req, res);
 * const reactor = SSEReactor.create({ session });
 * ```
 */

import { defineReactor } from "~/defineReactor";
import type { Session } from "better-sse";

/**
 * SSEReactor config
 */
export interface SSEReactorConfig {
  session: Session;
}

/**
 * Helper to send event to SSE client
 */
function sendEvent(session: Session, event: any): void {
  try {
    // Check if session is still active
    if (!session.isConnected) {
      console.warn(`[SSEReactor] ❌ Cannot send event - SSE session disconnected`, {
        eventType: event.type,
      });
      return;
    }

    // Log important events
    if (event.type === "error_message" || event.type === "assistant_message") {
      console.log(`[SSEReactor] ✅ Sending ${event.type} to client`);
    }

    // Send event via SSE
    // better-sse automatically handles the SSE format (data: ...)
    session.push(event, event.type);
  } catch (error) {
    console.error("[SSEReactor] ❌ Failed to send event:", {
      eventType: event.type,
      error: error instanceof Error ? error.message : String(error),
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

  // ==================== Stream Layer (底层事件) ====================
  // Only forward Stream Layer - other layers will be auto-assembled by browser-side Agent
  onMessageStart: (e, cfg) => sendEvent(cfg.session, e),
  onMessageDelta: (e, cfg) => sendEvent(cfg.session, e),
  onMessageStop: (e, cfg) => sendEvent(cfg.session, e),
  onTextContentBlockStart: (e, cfg) => sendEvent(cfg.session, e),
  onTextDelta: (e, cfg) => sendEvent(cfg.session, e),
  onTextContentBlockStop: (e, cfg) => sendEvent(cfg.session, e),
  onToolUseContentBlockStart: (e, cfg) => sendEvent(cfg.session, e),
  onInputJsonDelta: (e, cfg) => sendEvent(cfg.session, e),
  onToolUseContentBlockStop: (e, cfg) => sendEvent(cfg.session, e),
  onToolCall: (e, cfg) => sendEvent(cfg.session, e),
  onToolResult: (e, cfg) => sendEvent(cfg.session, e),
});
