/**
 * ClaudeEnvironment - Claude SDK perception layer
 *
 * Converts Claude SDK events to EnvironmentEvents.
 * Only emits raw streaming materials: text_chunk, stream_start, stream_end, etc.
 *
 * Design principle:
 * - We only care about raw materials from external world
 * - Even if SDK assembles tool_call/tool_result, we don't use them
 * - We have our own internal world (Mealy Machine) to assemble
 *
 * @see packages/types/src/ecosystem/Environment.ts
 * @see packages/types/src/ecosystem/event/environment/EnvironmentEvent.ts
 */

import type {
  Environment,
  EnvironmentEvent,
  UserMessage,
  TextChunkEvent,
  StreamStartEvent,
  StreamEndEvent,
  InterruptedEvent,
  ConnectedEvent,
  DisconnectedEvent,
} from "@agentxjs/types";
import {
  query,
  type SDKUserMessage,
  type SDKMessage,
  type Query,
  type SDKPartialAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { Subject } from "rxjs";
import { createLogger } from "@agentxjs/common";
import { buildOptions, type EnvironmentContext } from "./buildOptions";
import { buildSDKUserMessage } from "./helpers";
import { observableToAsyncIterable } from "./observableToAsyncIterable";

const logger = createLogger("ecosystem/ClaudeEnvironment");

/**
 * ClaudeEnvironment configuration
 */
export interface ClaudeEnvironmentConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  systemPrompt?: string;
  cwd?: string;
  sessionId?: string;
  resumeSessionId?: string;
  onSessionIdCaptured?: (sessionId: string) => void;
}

/**
 * Check if an error is an abort error (expected during interrupt)
 */
function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.name === "AbortError") return true;
    if (error.message.includes("aborted")) return true;
    if (error.message.includes("abort")) return true;
  }

  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (err.name === "AbortError") return true;
    if (typeof err.message === "string") {
      if (err.message.includes("aborted")) return true;
      if (err.message.includes("abort")) return true;
    }
    if (err.cause && isAbortError(err.cause)) return true;
  }

  const errorStr = String(error).toLowerCase();
  if (errorStr.includes("abort")) return true;

  return false;
}

/**
 * ClaudeEnvironment - Perceives Claude SDK and emits EnvironmentEvents
 */
export class ClaudeEnvironment implements Environment {
  readonly type = "claude";

  private readonly config: ClaudeEnvironmentConfig;
  private emit: ((event: EnvironmentEvent) => void) | null = null;

  private promptSubject = new Subject<SDKUserMessage>();
  private responseSubject = new Subject<SDKMessage>();
  private currentAbortController: AbortController | null = null;
  private claudeQuery: Query | null = null;
  private isInitialized = false;
  private wasInterrupted = false;

  constructor(config: ClaudeEnvironmentConfig) {
    this.config = config;
  }

  /**
   * Start perceiving the environment
   */
  start(emit: (event: EnvironmentEvent) => void): void {
    this.emit = emit;
    logger.info("ClaudeEnvironment started");

    // Emit connected event
    this.emitEvent({
      type: "connected",
      timestamp: Date.now(),
      data: {},
    } as ConnectedEvent);
  }

  /**
   * Stop perceiving and clean up
   */
  stop(): void {
    if (this.claudeQuery) {
      this.claudeQuery.interrupt().catch(() => {});
    }

    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }

    this.promptSubject.complete();
    this.responseSubject.complete();

    // Emit disconnected event
    if (this.emit) {
      this.emitEvent({
        type: "disconnected",
        timestamp: Date.now(),
        data: { reason: "stopped" },
      } as DisconnectedEvent);
    }

    this.emit = null;
    logger.info("ClaudeEnvironment stopped");
  }

  /**
   * Send a message to the environment (triggers LLM request)
   */
  async send(message: UserMessage): Promise<void> {
    this.wasInterrupted = false;
    this.currentAbortController = new AbortController();

    try {
      await this.initialize(this.currentAbortController);

      const sessionId = this.config.sessionId || "default";
      const sdkUserMessage = buildSDKUserMessage(message, sessionId);

      logger.debug("Sending message to Claude", {
        content:
          typeof message.content === "string"
            ? message.content.substring(0, 80)
            : "[structured]",
      });

      this.promptSubject.next(sdkUserMessage);

      // Process SDK responses and emit EnvironmentEvents
      await this.processResponses();
    } finally {
      this.currentAbortController = null;
      this.wasInterrupted = false;
    }
  }

  /**
   * Interrupt current operation
   */
  interrupt(): void {
    if (this.claudeQuery) {
      logger.debug("Interrupting Claude query");
      this.wasInterrupted = true;
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

    logger.info("Initializing ClaudeEnvironment");

    const context: EnvironmentContext = {
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      systemPrompt: this.config.systemPrompt,
      cwd: this.config.cwd,
      resume: this.config.resumeSessionId,
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

    logger.info("ClaudeEnvironment initialized");
  }

  /**
   * Start background listener for SDK responses
   */
  private startBackgroundListener(): void {
    (async () => {
      try {
        for await (const sdkMsg of this.claudeQuery!) {
          this.responseSubject.next(sdkMsg);
        }
        this.responseSubject.complete();
      } catch (error) {
        if (isAbortError(error)) {
          logger.debug("Background listener aborted (expected during interrupt)");
          this.responseSubject.complete();
          this.resetState();
        } else {
          logger.error("Background listener error", { error });
          this.responseSubject.error(error);
        }
      }
    })();
  }

  /**
   * Process SDK responses and emit EnvironmentEvents
   */
  private async processResponses(): Promise<void> {
    const responseStream = (async function* (subject: Subject<SDKMessage>): AsyncGenerator<SDKMessage> {
      for await (const sdkMsg of observableToAsyncIterable<SDKMessage>(subject)) {
        yield sdkMsg;
        if (sdkMsg.type === "result") break;
      }
    })(this.responseSubject);

    for await (const sdkMsg of responseStream) {
      if (!sdkMsg) {
        logger.debug("Received undefined message, stream likely aborted");
        break;
      }

      // Capture session ID
      if (sdkMsg.session_id && this.config.onSessionIdCaptured) {
        this.config.onSessionIdCaptured(sdkMsg.session_id);
      }

      // Process based on message type
      switch (sdkMsg.type) {
        case "stream_event":
          this.processStreamEvent(sdkMsg);
          break;

        case "result":
          if (sdkMsg.subtype === "error_during_execution" && this.wasInterrupted) {
            this.emitEvent({
              type: "interrupted",
              timestamp: Date.now(),
              data: { reason: "user_interrupt" },
            } as InterruptedEvent);
          }
          break;
      }
    }
  }

  /**
   * Process stream_event from SDK and emit corresponding EnvironmentEvent
   */
  private processStreamEvent(sdkMsg: SDKPartialAssistantMessage): void {
    const event = sdkMsg.event;

    switch (event.type) {
      case "message_start":
        this.emitEvent({
          type: "stream_start",
          timestamp: Date.now(),
          data: {
            messageId: event.message.id,
            model: event.message.model,
          },
        } as StreamStartEvent);
        break;

      case "content_block_delta":
        if (event.delta.type === "text_delta") {
          this.emitEvent({
            type: "text_chunk",
            timestamp: Date.now(),
            data: { text: event.delta.text },
          } as TextChunkEvent);
        }
        // Note: input_json_delta is internal assembling, not raw material
        break;

      case "message_stop":
        this.emitEvent({
          type: "stream_end",
          timestamp: Date.now(),
          data: { stopReason: "end_turn" },
        } as StreamEndEvent);
        break;
    }
  }

  /**
   * Emit an EnvironmentEvent
   */
  private emitEvent(event: EnvironmentEvent): void {
    if (this.emit) {
      this.emit(event);
    }
  }

  /**
   * Reset state after abort
   */
  private resetState(): void {
    this.isInitialized = false;
    this.claudeQuery = null;
    this.promptSubject = new Subject<SDKUserMessage>();
    this.responseSubject = new Subject<SDKMessage>();
  }
}
