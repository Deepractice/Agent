/**
 * ClaudeDriver - ADK-based Claude AI Driver
 *
 * Modern implementation using AgentX ADK with full Claude SDK integration.
 */

import { defineDriver } from "@deepractice-ai/agentx-adk";
import type {
  UserMessage,
  StreamEventType,
  InterruptedStreamEvent,
} from "@deepractice-ai/agentx-types";
import {
  query,
  type SDKUserMessage,
  type SDKMessage,
  type Query,
} from "@anthropic-ai/claude-agent-sdk";
import { Subject } from "rxjs";
import { createLogger } from "@deepractice-ai/agentx-logger";
import { claudeSDKConfig } from "./ClaudeConfig";
import { buildOptions } from "./buildOptions";
import { buildSDKUserMessage } from "./helpers";
import { transformSDKMessages } from "./messageTransform";
import { observableToAsyncIterable } from "./observableToAsyncIterable";

const logger = createLogger("claude/ClaudeDriver");

/**
 * Check if an error is an abort error (expected during interrupt)
 *
 * Claude SDK may throw non-standard error objects, so we check multiple ways.
 */
function isAbortError(error: unknown): boolean {
  // Check for standard AbortError
  if (error instanceof Error) {
    if (error.name === "AbortError") return true;
    if (error.message.includes("aborted")) return true;
    if (error.message.includes("abort")) return true;
  }

  // Check for non-standard error objects (Claude SDK may throw these)
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;

    // Check name property
    if (err.name === "AbortError") return true;

    // Check message property (may be string)
    if (typeof err.message === "string") {
      if (err.message.includes("aborted")) return true;
      if (err.message.includes("abort")) return true;
    }

    // Check for cause chain (AbortError may be wrapped)
    if (err.cause && isAbortError(err.cause)) return true;
  }

  // Check string representation as last resort
  const errorStr = String(error).toLowerCase();
  if (errorStr.includes("abort")) return true;

  return false;
}

/**
 * ClaudeDriver - Claude AI driver using ADK
 *
 * Full implementation matching ClaudeSDKDriver logic with ADK wrapper.
 */
export const ClaudeDriver = defineDriver({
  name: "ClaudeDriver",
  description: "Claude AI driver powered by Anthropic Claude SDK",
  config: claudeSDKConfig,

  create: (context) => {
    // Driver state
    let promptSubject = new Subject<SDKUserMessage>();
    let responseSubject = new Subject<SDKMessage>();
    let currentAbortController: AbortController | null = null;
    const sessionMap = new Map<string, string>();
    let claudeQuery: Query | null = null;
    let isInitialized = false;
    let wasInterrupted = false; // Track if current operation was interrupted

    /**
     * Reset driver state after abort
     * This allows re-initialization on next receive()
     */
    function resetState(): void {
      isInitialized = false;
      claudeQuery = null;
      // Create new Subjects (completed ones can't be reused)
      promptSubject = new Subject<SDKUserMessage>();
      responseSubject = new Subject<SDKMessage>();
    }

    /**
     * Initialize the driver (lazy initialization on first message)
     */
    async function initialize(abortController: AbortController): Promise<void> {
      if (isInitialized) return;

      const agentId = context.agentId;
      logger.info("Initializing ClaudeDriver", { agentId });

      // Convert AgentContext to Claude SDK Options
      const options = buildOptions(context as any, abortController);
      const promptStream = observableToAsyncIterable(promptSubject);

      claudeQuery = query({
        prompt: promptStream,
        options,
      });

      isInitialized = true;

      // Background listener for SDK responses
      (async () => {
        try {
          for await (const sdkMsg of claudeQuery!) {
            responseSubject.next(sdkMsg);
          }
          responseSubject.complete();
        } catch (error) {
          // Check if this is an abort error (expected during interrupt)
          if (isAbortError(error)) {
            logger.debug("Background listener aborted (expected during interrupt)", { agentId });
            responseSubject.complete();
            // Reset state so next receive() can re-initialize
            resetState();
          } else {
            logger.error("Background listener error", { agentId, error });
            responseSubject.error(error);
          }
        }
      })();

      logger.info("ClaudeDriver initialized", { agentId });
    }

    return {
      name: "ClaudeDriver",

      /**
       * Receive a user message and yield stream events
       */
      async *receive(message: UserMessage): AsyncIterable<StreamEventType> {
        const agentId = context.agentId;

        // Reset interrupt flag for this receive() call
        wasInterrupted = false;

        // Create abort controller for this receive() call
        currentAbortController = new AbortController();

        try {
          await initialize(currentAbortController);

          const sessionId = agentId;
          const sdkUserMessage = buildSDKUserMessage(message, sessionId);

          logger.debug("Sending message", {
            agentId,
            content:
              typeof message.content === "string" ? message.content.substring(0, 80) : "[structured]",
          });

          promptSubject.next(sdkUserMessage);

          const responseStream = (async function* () {
            for await (const sdkMsg of observableToAsyncIterable(responseSubject)) {
              yield sdkMsg;
              if (sdkMsg.type === "result") break;
            }
          })();

          yield* transformSDKMessages(agentId, responseStream, (capturedSessionId) => {
            sessionMap.set(agentId, capturedSessionId);
          });

          // If interrupted, yield InterruptedStreamEvent
          // This ensures interrupt flows through the event pipeline
          if (wasInterrupted) {
            logger.debug("Yielding InterruptedStreamEvent", { agentId });
            const interruptedEvent: InterruptedStreamEvent = {
              type: "interrupted",
              uuid: `interrupted_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              agentId,
              timestamp: Date.now(),
              data: {
                reason: "user_interrupt",
              },
            };
            yield interruptedEvent;
          }
        } finally {
          // Cleanup
          currentAbortController = null;
          wasInterrupted = false;
        }
      },

      /**
       * Interrupt the current operation
       *
       * Uses SDK's native interrupt() method which is less destructive than abort().
       * This only interrupts the current turn, not the entire SDK connection.
       */
      interrupt(): void {
        const agentId = context.agentId;

        if (claudeQuery) {
          logger.debug("Interrupting current operation via SDK interrupt()", { agentId });
          wasInterrupted = true; // Set flag so receive() yields InterruptedStreamEvent
          // Use SDK's native interrupt - less destructive than abort
          claudeQuery.interrupt().catch((err) => {
            logger.debug("SDK interrupt() error (may be expected)", { agentId, error: err });
          });
          logger.info("Operation interrupted", { agentId });
        } else {
          logger.debug("No active query to interrupt", { agentId });
        }
      },

      /**
       * Destroy the driver and cleanup resources
       */
      async destroy(): Promise<void> {
        const agentId = context.agentId;

        // Abort any ongoing operation
        if (currentAbortController) {
          currentAbortController.abort();
          currentAbortController = null;
        }

        promptSubject.complete();
        responseSubject.complete();

        logger.info("ClaudeDriver destroyed", { agentId });
      },
    };
  },
});
