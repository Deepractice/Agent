/**
 * AgentDriverBridge
 *
 * Internal Reactor that connects AgentDriver to the EventBus.
 *
 * Responsibilities:
 * 1. Subscribe to user_message events from EventBus
 * 2. Call driver.processMessage() and iterate through Stream events
 * 3. Forward all events to EventBus (no transformation needed)
 *
 * This is an internal implementation detail.
 * Users only interact with AgentDriver interface.
 */

import type { AgentReactor, AgentReactorContext } from "~/interfaces/AgentReactor";
import type { AgentDriver } from "~/interfaces/AgentDriver";
import type { UserMessageEvent, ErrorMessageEvent } from "@deepractice-ai/agentx-event";
import type { ErrorMessage } from "@deepractice-ai/agentx-types";
import { createLogger, type LoggerProvider } from "@deepractice-ai/agentx-logger";

/**
 * AgentDriverBridge
 *
 * Bridges AgentDriver to EventBus using Reactor pattern.
 */
export class AgentDriverBridge implements AgentReactor {
  readonly id = "driver";
  readonly name = "AgentDriverBridge";

  private context: AgentReactorContext | null = null;
  private abortController: AbortController | null = null;
  private logger: LoggerProvider;

  constructor(private driver: AgentDriver) {
    this.logger = createLogger("core/agent/AgentDriverBridge");
  }

  async initialize(context: AgentReactorContext): Promise<void> {
    this.context = context;

    this.logger.info("Initializing DriverBridge", {
      agentId: context.agentId,
      sessionId: context.sessionId,
      driverType: this.driver.constructor.name,
    });

    // Subscribe to user_message events
    context.consumer.consumeByType("user_message", this.handleUserMessage.bind(this));

    this.logger.debug("Subscribed to user_message events");
  }

  async destroy(): Promise<void> {
    this.logger.info("Destroying DriverBridge");

    // Abort any ongoing operations
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.driver.abort();

    // Destroy driver
    await this.driver.destroy();

    this.context = null;
    this.logger.debug("DriverBridge destroyed");
  }

  /**
   * Handle user message event
   *
   * Calls driver.processMessage() and forwards all Stream events to EventBus.
   */
  private async handleUserMessage(event: UserMessageEvent): Promise<void> {
    this.logger.info("Handling user message", {
      messageId: event.data.id,
      eventUuid: event.uuid,
      contentPreview:
        typeof event.data.content === "string"
          ? event.data.content.substring(0, 50)
          : "[complex content]",
    });

    if (!this.context) {
      this.logger.error("No context available");
      return;
    }

    // Save context reference (might become null during async operations)
    const context = this.context;

    // Create new AbortController for this request
    this.abortController = new AbortController();

    try {
      this.logger.debug("Calling driver.processMessage", {
        driverType: this.driver.constructor.name,
      });

      // Iterate through Stream events from driver
      let eventCount = 0;
      for await (const streamEvent of this.driver.processMessage(event.data)) {
        eventCount++;

        // Log ALL events to diagnose forwarding issue
        this.logger.debug("Received stream event from driver", {
          eventNum: eventCount,
          eventType: streamEvent.type,
        });

        // Check if aborted (null-safe check)
        if (this.abortController?.signal.aborted) {
          this.logger.debug("Stream processing aborted", { eventCount });
          break;
        }

        // Forward event to EventBus (no transformation needed)
        this.logger.debug("Forwarding to EventBus", {
          eventType: streamEvent.type,
          producerActive: context.producer.isActive(),
        });
        context.producer.produce(streamEvent);
        this.logger.debug("Event forwarded successfully", {
          eventType: streamEvent.type,
        });
      }

      this.logger.debug("Stream processing completed", { totalEvents: eventCount });
    } catch (error) {
      this.logger.error("Error processing stream", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Check producer state before emitting error
      const producerActive = context.producer.isActive();
      this.logger.info("About to emit error event", {
        producerActive,
        contextExists: !!context,
      });

      // Create and emit ErrorMessageEvent
      const errorMessage: ErrorMessage = {
        id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        role: "error",
        subtype: "llm",
        severity: "error",
        message: error instanceof Error ? error.message : String(error),
        code: "DRIVER_ERROR",
        recoverable: true,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
      };

      const errorEvent: ErrorMessageEvent = {
        type: "error_message",
        data: errorMessage,
        uuid: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        agentId: context.agentId,
        timestamp: Date.now(),
      };

      if (producerActive) {
        context.producer.produce(errorEvent);
        this.logger.info("Error event emitted successfully");
      } else {
        this.logger.error("Cannot emit error event: producer is not active (EventBus closed)", {
          errorMessage: errorMessage.message,
        });
      }
    } finally {
      this.abortController = null;
    }
  }
}
