/**
 * SSEReactor - Server-side SSE event forwarder
 *
 * Forwards all Agent events to SSE clients using native SSE implementation.
 * Built with defineReactor for minimal boilerplate.
 *
 * @example
 * ```typescript
 * import { SSEReactor, createSSERequest } from "@deepractice-ai/agentx-sdk-server";
 *
 * const request = createSSERequest({ res });
 * const reactor = SSEReactor.create({ request });
 * ```
 */

import { defineReactor } from "~/defineReactor";
import type { SSERequest } from "~/server/SSERequest";
import { createLogger } from "@deepractice-ai/agentx-logger";

// Logger now uses lazy initialization - safe to create at module level
const logger = createLogger("framework/SSEReactor");

/**
 * SSEReactor config with dynamic request support
 */
export interface SSEReactorConfig {
  request: SSERequest;
  // Internal: mutable request container for updates (on reconnect)
  _requestContainer?: { current: SSERequest };
}

/**
 * SSEReactor instance with dynamic request support
 */
export interface SSEReactorInstance {
  currentRequest: SSERequest;
  updateRequest: (newRequest: SSERequest) => void;
}

/**
 * Helper to send event to SSE client
 */
function sendEvent(config: SSEReactorConfig, event: any): void {
  try {
    // Get current request from container
    const request = config._requestContainer
      ? config._requestContainer.current
      : config.request;

    logger.debug("Sending event to SSE client", {
      eventType: event.type,
      isConnected: request.isConnected,
    });

    // Check if request is still active
    if (!request.isConnected) {
      logger.warn("Cannot send event - SSE request disconnected", {
        eventType: event.type,
      });
      return;
    }

    // Send event via SSE (SSERequest handles formatting)
    request.push(event, event.type);
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
 *
 * Key feature: Supports dynamic session updates for SSE reconnections
 */
export const SSEReactor = defineReactor<SSEReactorConfig>({
  name: "SSE",

  onInit: (context, config) => {
    // Create mutable request container
    if (!config._requestContainer) {
      config._requestContainer = { current: config.request };
    }

    logger.info("SSEReactor initialized", {
      requestActive: config.request.isConnected,
      agentId: context.agentId,
    });
  },

  // ==================== Stream Layer (底层事件) ====================
  // Only forward Stream Layer - other layers will be auto-assembled by browser-side Agent
  onMessageStart: (e, cfg) => {
    logger.debug("onMessageStart called");
    sendEvent(cfg, e);
  },
  onMessageDelta: (e, cfg) => sendEvent(cfg, e),
  onMessageStop: (e, cfg) => sendEvent(cfg, e),
  onTextContentBlockStart: (e, cfg) => {
    logger.debug("onTextContentBlockStart called");
    sendEvent(cfg, e);
  },
  onTextDelta: (e, cfg) => {
    logger.debug("onTextDelta called");
    sendEvent(cfg, e);
  },
  onTextContentBlockStop: (e, cfg) => sendEvent(cfg, e),
  onToolUseContentBlockStart: (e, cfg) => {
    logger.debug("onToolUseContentBlockStart called");
    sendEvent(cfg, e);
  },
  onInputJsonDelta: (e, cfg) => {
    logger.debug("onInputJsonDelta called");
    sendEvent(cfg, e);
  },
  onToolUseContentBlockStop: (e, cfg) => {
    logger.debug("onToolUseContentBlockStop called");
    sendEvent(cfg, e);
  },
  onToolCall: (e, cfg) => {
    logger.debug("onToolCall called");
    sendEvent(cfg, e);
  },
  onToolResult: (e, cfg) => {
    logger.debug("onToolResult called");
    sendEvent(cfg, e);
  },
});
