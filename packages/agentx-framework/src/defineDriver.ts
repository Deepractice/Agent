/**
 * defineDriver
 *
 * Framework helper for creating AgentDriver implementations with minimal boilerplate.
 * Developers implement the core sendMessage logic to transform external data sources
 * into AgentX StreamEventType.
 *
 * @example
 * ```typescript
 * import { defineDriver } from "@deepractice-ai/agentx-framework";
 * import { StreamEventBuilder } from "@deepractice-ai/agentx-core";
 *
 * const MyDriver = defineDriver({
 *   name: "MyDriver",
 *
 *   async *sendMessage(message, config) {
 *     // Extract first message if iterable
 *     const firstMsg = await getFirst(message);
 *
 *     // Create builder
 *     const builder = new StreamEventBuilder("my-agent");
 *
 *     // Call external SDK
 *     const stream = await externalSDK.query(firstMsg.content);
 *
 *     // Transform external events → AgentX events
 *     yield builder.messageStart("msg_123", "my-model");
 *
 *     for await (const chunk of stream) {
 *       if (chunk.type === "text") {
 *         yield builder.textDelta(chunk.text, 0);
 *       }
 *     }
 *
 *     yield builder.messageStop();
 *   },
 *
 *   onInit: (config) => console.log("Driver initialized"),
 *   onDestroy: () => console.log("Driver destroyed"),
 * });
 *
 * // Use it
 * const driver = MyDriver.create({ apiKey: "xxx" });
 * for await (const event of driver.sendMessage(userMessage)) {
 *   console.log(event);
 * }
 * ```
 */

import type { AgentDriver } from "@deepractice-ai/agentx-core";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-event";

/**
 * Driver definition configuration
 */
export interface DriverDefinition<TConfig = any> {
  /**
   * Driver name (for identification)
   */
  name: string;

  /**
   * Core method: Transform UserMessage(s) into StreamEventType
   *
   * Developers must:
   * 1. Handle single message or AsyncIterable<UserMessage>
   * 2. Call external SDK/data source
   * 3. Transform raw data → StreamEventType (using StreamEventBuilder or directly)
   *
   * @param message - User message(s)
   * @param config - Driver configuration
   * @returns AsyncIterable of StreamEventType
   *
   * @example
   * ```typescript
   * async *sendMessage(message, config) {
   *   const builder = new StreamEventBuilder("agent-id");
   *   const firstMsg = await extractFirst(message);
   *
   *   yield builder.messageStart("msg_1", "claude-3-5-sonnet");
   *   yield builder.textDelta("Hello world", 0);
   *   yield builder.messageStop();
   * }
   * ```
   */
  sendMessage: (
    message: UserMessage | AsyncIterable<UserMessage>,
    config: TConfig
  ) => AsyncIterable<StreamEventType>;

  /**
   * Optional: Initialize driver
   * Called when driver is created
   */
  onInit?: (config: TConfig) => void | Promise<void>;

  /**
   * Optional: Destroy driver
   * Called when driver is destroyed
   */
  onDestroy?: () => void | Promise<void>;

  /**
   * Optional: Abort current operation
   * Called when abort() is invoked
   */
  onAbort?: () => void;
}

/**
 * Defined driver factory
 */
export interface DefinedDriver<TConfig = any> {
  /**
   * Driver name
   */
  name: string;

  /**
   * Create a driver instance
   */
  create: (config: TConfig & { sessionId?: string }) => AgentDriver;
}

/**
 * Internal driver implementation
 */
class SimpleAgentDriver implements AgentDriver {
  constructor(
    private definition: DriverDefinition,
    private config: any,
    public readonly sessionId: string
  ) {}

  get driverSessionId(): string | null {
    // Let the driver implementation manage its own session ID if needed
    return null;
  }

  async *sendMessage(
    messages: UserMessage | AsyncIterable<UserMessage>
  ): AsyncIterable<StreamEventType> {
    // Delegate to definition with sessionId injected into config
    const configWithSession = {
      ...this.config,
      sessionId: this.sessionId, // Inject framework session ID
    };
    yield* this.definition.sendMessage(messages, configWithSession);
  }

  /**
   * Abort current operation
   */
  abort(): void {
    if (this.definition.onAbort) {
      this.definition.onAbort();
    }
  }

  /**
   * Destroy driver
   */
  async destroy(): Promise<void> {
    if (this.definition.onDestroy) {
      await this.definition.onDestroy();
    }
  }
}

/**
 * Define a custom driver with simplified API
 *
 * @param definition - Driver definition
 * @returns Defined driver factory
 *
 * @example
 * ```typescript
 * const EchoDriver = defineDriver({
 *   name: "Echo",
 *   async *sendMessage(message, config) {
 *     const builder = new StreamEventBuilder("echo");
 *     const firstMsg = await extractFirst(message);
 *
 *     yield builder.messageStart("msg_1", "echo-v1");
 *     yield builder.textDelta("You said: " + firstMsg.content, 0);
 *     yield builder.messageStop();
 *   }
 * });
 *
 * const driver = EchoDriver.create({ sessionId: "test" });
 * ```
 */
export function defineDriver<TConfig = any>(
  definition: DriverDefinition<TConfig>
): DefinedDriver<TConfig> {
  return {
    name: definition.name,

    create: (config: TConfig & { sessionId?: string }) => {
      const sessionId =
        config.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const driver = new SimpleAgentDriver(definition, config, sessionId);

      // Call onInit if provided
      if (definition.onInit) {
        const initResult = definition.onInit(config);
        if (initResult instanceof Promise) {
          // If async, we can't await here, but we store the promise
          initResult.catch((err) => {
            console.error(`[${definition.name}] Init error:`, err);
          });
        }
      }

      return driver;
    },
  };
}
