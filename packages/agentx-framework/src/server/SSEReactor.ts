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
import { createLogger } from "@deepractice-ai/agentx-logger";

// Logger now uses lazy initialization - safe to create at module level
const logger = createLogger("framework/SSEReactor");

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
    logger.debug("Sending event to SSE client", {
      eventType: event.type,
      isConnected: session.isConnected,
    });

    // Check if session is still active
    if (!session.isConnected) {
      logger.warn("Cannot send event - SSE session disconnected", {
        eventType: event.type,
      });
      return;
    }

    // Send event via SSE (SimpleSSESession handles formatting)
    session.push(event, event.type);
    logger.debug("Event sent successfully", { eventType: event.type });
  } catch (error) {
    logger.error("Failed to send event", {
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
    logger.info("SSEReactor initialized", {
      sessionActive: config.session.isConnected,
      agentId: context.agentId,
    });
  },

  // ==================== Stream Layer (底层事件) ====================
  // Only forward Stream Layer - other layers will be auto-assembled by browser-side Agent
  onMessageStart: (e, cfg) => {
    logger.debug("onMessageStart called");
    sendEvent(cfg.session, e);
  },
  onMessageDelta: (e, cfg) => sendEvent(cfg.session, e),
  onMessageStop: (e, cfg) => sendEvent(cfg.session, e),
  onTextContentBlockStart: (e, cfg) => {
    logger.debug("onTextContentBlockStart called");
    sendEvent(cfg.session, e);
  },
  onTextDelta: (e, cfg) => {
    logger.debug("onTextDelta called");
    sendEvent(cfg.session, e);
  },
  onTextContentBlockStop: (e, cfg) => sendEvent(cfg.session, e),
  onToolUseContentBlockStart: (e, cfg) => {
    logger.debug("onToolUseContentBlockStart called");
    sendEvent(cfg.session, e);
  },
  onInputJsonDelta: (e, cfg) => {
    logger.debug("onInputJsonDelta called");
    sendEvent(cfg.session, e);
  },
  onToolUseContentBlockStop: (e, cfg) => {
    logger.debug("onToolUseContentBlockStop called");
    sendEvent(cfg.session, e);
  },
  onToolCall: (e, cfg) => {
    logger.debug("onToolCall called");
    sendEvent(cfg.session, e);
  },
  onToolResult: (e, cfg) => {
    logger.debug("onToolResult called");
    sendEvent(cfg.session, e);
  },
});
