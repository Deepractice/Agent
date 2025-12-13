/**
 * ClaudeEffector - Listens to SystemBus and sends to Claude SDK
 *
 * Subscribes to user_message events on SystemBus and sends to Claude SDK.
 */

import type { Effector, SystemBusConsumer } from "@agentxjs/types/runtime/internal";
import type { UserMessage } from "@agentxjs/types/agent";
import type { EventContext } from "@agentxjs/types/runtime";
import { query, type SDKUserMessage, type Query } from "@anthropic-ai/claude-agent-sdk";
import { Subject } from "rxjs";
import { createLogger } from "@agentxjs/common";
import { buildOptions, type EnvironmentContext } from "./buildOptions";
import { buildSDKUserMessage } from "./helpers";
import { observableToAsyncIterable } from "./observableToAsyncIterable";
import type { ClaudeReceptor, ReceptorMeta } from "./ClaudeReceptor";

const logger = createLogger("ecosystem/ClaudeEffector");

/** Default timeout in milliseconds (30 seconds) */
const DEFAULT_TIMEOUT = 30_000;

/**
 * MCP Server Config (SDK Compatible)
 * Re-exported from types for convenience.
 */
export type { McpServerConfig } from "@agentxjs/types/runtime";

/**
 * ClaudeEffector configuration
 */
export interface ClaudeEffectorConfig {
  /** Agent ID for filtering events (required) */
  agentId: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  systemPrompt?: string;
  cwd?: string;
  sessionId?: string;
  resumeSessionId?: string;
  onSessionIdCaptured?: (sessionId: string) => void;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** MCP servers configuration */
  mcpServers?: Record<string, import("@agentxjs/types/runtime").McpServerConfig>;
}

/**
 * ClaudeEffector - Subscribes to SystemBus and sends to Claude SDK
 *
 * Uses SystemBusConsumer (read-only) because Effector only subscribes to events.
 */
export class ClaudeEffector implements Effector {
  private readonly config: ClaudeEffectorConfig;
  private readonly receptor: ClaudeReceptor;

  private promptSubject = new Subject<SDKUserMessage>();
  private currentAbortController: AbortController | null = null;
  private claudeQuery: Query | null = null;
  private isInitialized = false;
  private wasInterrupted = false;
  private currentMeta: ReceptorMeta | null = null;

  constructor(config: ClaudeEffectorConfig, receptor: ClaudeReceptor) {
    this.config = config;
    this.receptor = receptor;
  }

  /**
   * Connect to SystemBus consumer to subscribe to events
   */
  connect(consumer: SystemBusConsumer): void {
    logger.debug("ClaudeEffector connected to SystemBusConsumer", {
      agentId: this.config.agentId,
    });

    // Listen for user_message events (with requestId and context)
    // Filter by agentId to only process messages for this agent
    consumer.on("user_message", async (event) => {
      const typedEvent = event as {
        type: string;
        data: UserMessage;
        requestId?: string;
        context?: EventContext;
      };

      logger.debug("user_message event received", {
        eventAgentId: typedEvent.context?.agentId,
        myAgentId: this.config.agentId,
        matches: typedEvent.context?.agentId === this.config.agentId,
      });

      // Filter by agentId - only process messages for this agent
      if (typedEvent.context?.agentId !== this.config.agentId) {
        return;
      }

      const message = typedEvent.data;
      const meta: ReceptorMeta = {
        requestId: typedEvent.requestId || "",
        context: typedEvent.context || {},
      };
      await this.send(message, meta);
    });

    // Listen for interrupt events
    // Filter by agentId to only process interrupts for this agent
    consumer.on("interrupt", (event) => {
      const typedEvent = event as {
        type: string;
        requestId?: string;
        context?: EventContext;
      };

      // Filter by agentId - only process interrupts for this agent
      if (typedEvent.context?.agentId !== this.config.agentId) {
        return;
      }

      const meta: ReceptorMeta = {
        requestId: typedEvent.requestId || "",
        context: typedEvent.context || {},
      };
      this.interrupt(meta);
    });
  }

  /**
   * Send a message to Claude SDK
   */
  private async send(message: UserMessage, meta: ReceptorMeta): Promise<void> {
    this.wasInterrupted = false;
    this.currentAbortController = new AbortController();
    this.currentMeta = meta; // Store for background listener

    const timeout = this.config.timeout ?? DEFAULT_TIMEOUT;
    const timeoutId = setTimeout(() => {
      logger.warn("Request timeout", { timeout });
      this.currentAbortController?.abort(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    try {
      await this.initialize(this.currentAbortController);

      const sessionId = this.config.sessionId || "default";
      const sdkUserMessage = buildSDKUserMessage(message, sessionId);

      logger.debug("Sending message to Claude", {
        content:
          typeof message.content === "string" ? message.content.substring(0, 80) : "[structured]",
        timeout,
        requestId: meta.requestId,
      });

      this.promptSubject.next(sdkUserMessage);

      // Process SDK responses
      // Note: We don't await here - background listener handles responses
      // currentMeta stays set until the next send() call
    } finally {
      clearTimeout(timeoutId);
      this.currentAbortController = null;
      this.wasInterrupted = false;
      // Don't clear currentMeta - it's needed by background listener
      // this.currentMeta = null;
    }
  }

  /**
   * Interrupt current operation
   */
  private interrupt(meta?: ReceptorMeta): void {
    if (this.claudeQuery) {
      logger.debug("Interrupting Claude query", { requestId: meta?.requestId });
      this.wasInterrupted = true;
      // Store meta for interrupted event
      if (meta) {
        this.currentMeta = meta;
      }
      this.claudeQuery.interrupt().catch((err) => {
        logger.debug("SDK interrupt() error (may be expected)", { error: err });
      });
    }
  }

  /**
   * Initialize the Claude SDK query (lazy initialization)
   */
  private async initialize(abortController: AbortController): Promise<void> {
    if (this.isInitialized) return;

    logger.info("Initializing ClaudeEffector");

    const context: EnvironmentContext = {
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      systemPrompt: this.config.systemPrompt,
      cwd: this.config.cwd,
      resume: this.config.resumeSessionId,
      mcpServers: this.config.mcpServers,
    };

    const sdkOptions = buildOptions(context, abortController);
    const promptStream = observableToAsyncIterable<SDKUserMessage>(this.promptSubject);

    this.claudeQuery = query({
      prompt: promptStream,
      options: sdkOptions,
    });

    this.isInitialized = true;

    // Background listener for SDK responses
    this.startBackgroundListener();

    logger.info("ClaudeEffector initialized");
  }

  /**
   * Start background listener for SDK responses
   */
  private startBackgroundListener(): void {
    (async () => {
      try {
        for await (const sdkMsg of this.claudeQuery!) {
          // Log all SDK messages for debugging
          logger.debug("SDK message received", {
            type: sdkMsg.type,
            subtype: (sdkMsg as { subtype?: string }).subtype,
            sessionId: sdkMsg.session_id,
            hasCurrentMeta: !!this.currentMeta,
          });

          // Forward stream_event to receptor for emission with current meta
          if (sdkMsg.type === "stream_event" && this.currentMeta) {
            this.receptor.feed(sdkMsg, this.currentMeta);
          }

          // Forward user message (contains tool_result) to receptor
          if (sdkMsg.type === "user" && this.currentMeta) {
            this.receptor.feedUserMessage(sdkMsg, this.currentMeta);
          }

          // Capture session ID
          if (sdkMsg.session_id && this.config.onSessionIdCaptured) {
            this.config.onSessionIdCaptured(sdkMsg.session_id);
          }

          // Handle result
          if (sdkMsg.type === "result") {
            const resultMsg = sdkMsg as {
              subtype: string;
              is_error?: boolean;
              errors?: string[];
              error?: { message?: string; type?: string };
            };
            // Log full result object for debugging
            logger.info("SDK result received (full)", {
              fullResult: JSON.stringify(sdkMsg, null, 2),
            });
            logger.info("SDK result received", {
              subtype: resultMsg.subtype,
              isError: resultMsg.is_error,
              errors: resultMsg.errors,
              wasInterrupted: this.wasInterrupted,
            });

            // Handle user interrupt
            if (resultMsg.subtype === "error_during_execution" && this.wasInterrupted) {
              this.receptor.emitInterrupted("user_interrupt", this.currentMeta || undefined);
            }
            // Handle SDK errors (API errors, rate limits, etc.)
            else if (resultMsg.is_error && this.currentMeta) {
              const fullResult = sdkMsg as {
                result?: string;
                error?: { message?: string; type?: string };
                errors?: string[];
              };
              const errorMessage =
                fullResult.error?.message ||
                fullResult.errors?.join(", ") ||
                (typeof fullResult.result === "string" ? fullResult.result : null) ||
                "An error occurred";
              const errorCode = fullResult.error?.type || resultMsg.subtype || "api_error";
              this.receptor.emitError(errorMessage, errorCode, this.currentMeta);
            }
          }
        }
      } catch (error) {
        if (this.isAbortError(error)) {
          logger.debug("Background listener aborted (expected during interrupt)");
          this.resetState();
        } else {
          logger.error("Background listener error", { error });
          // Emit error to receptor so it can be displayed in chat
          if (this.currentMeta) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            this.receptor.emitError(errorMessage, "runtime_error", this.currentMeta);
          }
        }
      }
    })();
  }

  /**
   * Check if an error is an abort error
   */
  private isAbortError(error: unknown): boolean {
    if (error instanceof Error) {
      if (error.name === "AbortError") return true;
      if (error.message.includes("aborted")) return true;
      if (error.message.includes("abort")) return true;
    }
    return false;
  }

  /**
   * Reset state after abort
   */
  private resetState(): void {
    this.isInitialized = false;
    this.claudeQuery = null;
    this.promptSubject = new Subject<SDKUserMessage>();
  }

  /**
   * Dispose and cleanup resources
   */
  dispose(): void {
    logger.debug("Disposing ClaudeEffector");

    // Abort any ongoing request
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    // Complete the prompt subject
    this.promptSubject.complete();

    // Reset state
    this.resetState();
  }
}
