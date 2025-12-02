/* eslint-disable no-undef */
/**
 * ClaudeDriver - Claude AI Driver for Node.js Runtime
 *
 * Full Claude SDK integration with stream event transformation.
 */

import type {
  UserMessage,
  StreamEventType,
  RuntimeDriver,
  Sandbox,
  AgentContext,
} from "@agentxjs/types";
import {
  query,
  type SDKUserMessage,
  type SDKMessage,
  type Query,
} from "@anthropic-ai/claude-agent-sdk";
import { Subject } from "rxjs";
import { createLogger } from "@agentxjs/common";
import { buildOptions, type DriverContext } from "./buildOptions";
import { buildSDKUserMessage } from "./helpers";
import { transformSDKMessages } from "./messageTransform";
import { observableToAsyncIterable } from "./observableToAsyncIterable";

const logger = createLogger("claude/ClaudeDriver");

/**
 * ClaudeDriver configuration (collected from environment by Runtime)
 */
export interface ClaudeDriverConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  systemPrompt?: string;
}

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
 * Options for creating ClaudeDriver
 */
export interface ClaudeDriverOptions {
  /**
   * SDK session ID for resume (from previous conversation)
   */
  resumeSessionId?: string;

  /**
   * Callback when SDK session ID is captured
   * Used by Container to track session ID for future resume
   */
  onSessionIdCaptured?: (sessionId: string) => void;
}

/**
 * Create a ClaudeDriver instance
 *
 * Factory function to create RuntimeDriver for Claude.
 *
 * @param config - Driver configuration (from Runtime + AgentDefinition)
 * @param context - Agent context (identity)
 * @param sandbox - Sandbox for resource isolation
 * @param options - Optional driver options (resume, callbacks)
 */
export function createClaudeDriver(
  config: ClaudeDriverConfig,
  context: AgentContext,
  sandbox: Sandbox,
  options?: ClaudeDriverOptions
): RuntimeDriver {
  // Extract agentId from context
  const agentId = context.agentId;

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

    logger.info("Initializing ClaudeDriver", { agentId });

    // Build options from config
    const driverContext: DriverContext = {
      agentId,
      createdAt: context.createdAt,
      ...config,
      // Set working directory from sandbox workspace
      cwd: sandbox.workspace.path,
      // Default to bypass permissions (agent runs autonomously)
      permissionMode: "bypassPermissions",
      // Pass resume session ID if provided (for conversation continuity)
      resume: options?.resumeSessionId,
    };
    const sdkOptions = buildOptions(driverContext, abortController);
    const promptStream = observableToAsyncIterable<SDKUserMessage>(promptSubject);

    claudeQuery = query({
      prompt: promptStream,
      options: sdkOptions,
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
    sandbox,

    /**
     * Receive a user message and yield stream events
     */
    async *receive(message: UserMessage): AsyncIterable<StreamEventType> {
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

        const responseStream = (async function* (): AsyncGenerator<SDKMessage> {
          for await (const sdkMsg of observableToAsyncIterable<SDKMessage>(responseSubject)) {
            yield sdkMsg;
            if (sdkMsg.type === "result") break;
          }
        })();

        yield* transformSDKMessages(
          agentId,
          responseStream,
          (capturedSessionId) => {
            sessionMap.set(agentId, capturedSessionId);
            // Notify external listener (Container) about captured session ID
            options?.onSessionIdCaptured?.(capturedSessionId);
          },
          {
            isInterrupted: () => wasInterrupted,
          }
        );
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
  };
}
