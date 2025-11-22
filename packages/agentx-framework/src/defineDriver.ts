/**
 * defineDriver
 *
 * Framework helper for creating AgentDriver implementations with minimal boilerplate.
 * Developers implement the core processMessage logic to transform external data sources
 * into AgentX StreamEventType.
 *
 * @example
 * ```typescript
 * import { defineDriver } from "@deepractice-ai/agentx-framework";
 * import { StreamEventBuilder } from "@deepractice-ai/agentx-engine";
 *
 * const MyDriver = defineDriver({
 *   name: "MyDriver",
 *
 *   async *processMessage(message, config) {
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
 * for await (const event of driver.processMessage(userMessage)) {
 *   console.log(event);
 * }
 * ```
 */

import type { AgentDriver } from "@deepractice-ai/agentx-engine";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-event";

/**
 * Driver definition configuration
 */
export interface DriverDefinition<TConfig = any, TInstance = void> {
  /**
   * Driver name (for identification)
   */
  name: string;

  /**
   * Optional: Create instance state
   *
   * Factory function to create driver instance state.
   * This allows stateful drivers (e.g., persistent connections, caches).
   *
   * @param config - Driver configuration
   * @returns Instance state object
   *
   * @example
   * ```typescript
   * createInstance: (config) => ({
   *   connection: null,
   *   cache: new Map(),
   * })
   * ```
   */
  createInstance?: (config: TConfig) => TInstance | Promise<TInstance>;

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
   * @param instance - Driver instance state (if createInstance is provided)
   * @returns AsyncIterable of StreamEventType
   *
   * @example
   * ```typescript
   * async *processMessage(message, config, instance) {
   *   const builder = new StreamEventBuilder("agent-id");
   *   const firstMsg = await extractFirst(message);
   *
   *   yield builder.messageStart("msg_1", "claude-3-5-sonnet");
   *   yield builder.textDelta("Hello world", 0);
   *   yield builder.messageStop();
   * }
   * ```
   */
  processMessage: (
    message: UserMessage | AsyncIterable<UserMessage>,
    config: TConfig,
    instance: TInstance
  ) => AsyncIterable<StreamEventType>;

  /**
   * Optional: Initialize driver
   * Called when driver is created (after createInstance)
   *
   * @param config - Driver configuration
   * @param instance - Driver instance state
   */
  onInit?: (config: TConfig, instance: TInstance) => void | Promise<void>;

  /**
   * Optional: Destroy driver
   * Called when driver is destroyed
   *
   * @param instance - Driver instance state
   */
  onDestroy?: (instance: TInstance) => void | Promise<void>;

  /**
   * Optional: Abort current operation
   * Called when abort() is invoked
   *
   * @param instance - Driver instance state
   */
  onAbort?: (instance: TInstance) => void;
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
class SimpleAgentDriver<TConfig = any, TInstance = void> implements AgentDriver {
  private instance: TInstance;

  constructor(
    private definition: DriverDefinition<TConfig, TInstance>,
    private config: TConfig,
    public readonly sessionId: string,
    instance: TInstance
  ) {
    this.instance = instance;
  }

  get driverSessionId(): string | null {
    // Let the driver implementation manage its own session ID if needed
    return null;
  }

  async *processMessage(
    messages: UserMessage | AsyncIterable<UserMessage>
  ): AsyncIterable<StreamEventType> {
    // Delegate to definition with sessionId injected into config
    const configWithSession = {
      ...this.config,
      sessionId: this.sessionId, // Inject framework session ID
    } as TConfig;
    yield* this.definition.processMessage(messages, configWithSession, this.instance);
  }

  /**
   * Abort current operation
   */
  abort(): void {
    if (this.definition.onAbort) {
      this.definition.onAbort(this.instance);
    }
  }

  /**
   * Destroy driver
   */
  async destroy(): Promise<void> {
    if (this.definition.onDestroy) {
      await this.definition.onDestroy(this.instance);
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
 *   async *processMessage(message, config) {
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
export function defineDriver<TConfig = any, TInstance = void>(
  definition: DriverDefinition<TConfig, TInstance>
): DefinedDriver<TConfig> {
  return {
    name: definition.name,

    create: (config: TConfig & { sessionId?: string }) => {
      const sessionId =
        config.sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Create instance state if factory is provided
      let instance: TInstance;
      if (definition.createInstance) {
        const instanceResult = definition.createInstance(config);
        if (instanceResult instanceof Promise) {
          // For async createInstance, we need special handling
          // We'll create a proxy driver that waits for instance initialization
          return createAsyncDriver(definition, config, sessionId, instanceResult);
        } else {
          instance = instanceResult;
        }
      } else {
        // No instance state - use undefined (typed as void)
        instance = undefined as TInstance;
      }

      const driver = new SimpleAgentDriver(definition, config, sessionId, instance);

      // Call onInit if provided
      if (definition.onInit) {
        const initResult = definition.onInit(config, instance);
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

/**
 * Create driver with async instance initialization
 */
function createAsyncDriver<TConfig, TInstance>(
  definition: DriverDefinition<TConfig, TInstance>,
  config: TConfig,
  sessionId: string,
  instancePromise: Promise<TInstance>
): AgentDriver {
  let resolvedInstance: TInstance | null = null;
  let initError: Error | null = null;

  // Start instance initialization
  instancePromise
    .then((inst) => {
      resolvedInstance = inst;
      // Call onInit after instance is ready
      if (definition.onInit) {
        const initResult = definition.onInit(config, inst);
        if (initResult instanceof Promise) {
          initResult.catch((err) => {
            console.error(`[${definition.name}] Init error:`, err);
          });
        }
      }
    })
    .catch((err) => {
      initError = err;
      console.error(`[${definition.name}] Instance creation error:`, err);
    });

  return {
    sessionId,
    driverSessionId: null,

    async *processMessage(messages: UserMessage | AsyncIterable<UserMessage>) {
      // Wait for instance to be ready
      if (!resolvedInstance) {
        if (initError) {
          throw initError;
        }
        // Wait for instance
        resolvedInstance = await instancePromise;
      }

      const configWithSession = {
        ...config,
        sessionId,
      } as TConfig;

      yield* definition.processMessage(messages, configWithSession, resolvedInstance!);
    },

    abort() {
      if (definition.onAbort && resolvedInstance) {
        definition.onAbort(resolvedInstance);
      }
    },

    async destroy() {
      if (definition.onDestroy && resolvedInstance) {
        await definition.onDestroy(resolvedInstance);
      }
    },
  };
}
