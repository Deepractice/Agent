/**
 * ClaudeDriver - ADK-based Claude AI Driver
 *
 * Modern implementation using AgentX ADK with full Claude SDK integration.
 */

import { defineDriver } from "@deepractice-ai/agentx-adk";
import type { UserMessage, StreamEventType } from "@deepractice-ai/agentx-types";
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
 * ClaudeDriver - Claude AI driver using ADK
 *
 * Full implementation matching ClaudeSDKDriver logic with ADK wrapper.
 */
export const ClaudeDriver = defineDriver({
  name: "ClaudeDriver",
  description: "Claude AI driver powered by Anthropic Claude SDK",
  config: claudeSDKConfig,

  create: (context) => {
    // Driver state (same as ClaudeSDKDriver)
    const promptSubject = new Subject<SDKUserMessage>();
    const responseSubject = new Subject<SDKMessage>();
    const abortController = new AbortController();
    const sessionMap = new Map<string, string>();
    let claudeQuery: Query | null = null;
    let isInitialized = false;

    /**
     * Initialize the driver (lazy initialization on first message)
     */
    async function initialize(): Promise<void> {
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
          logger.error("Background listener error", { agentId, error });
          responseSubject.error(error);
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

        await initialize();

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
      },

      /**
       * Destroy the driver and cleanup resources
       */
      async destroy(): Promise<void> {
        const agentId = context.agentId;

        promptSubject.complete();
        responseSubject.complete();
        abortController.abort();

        logger.info("ClaudeDriver destroyed", { agentId });
      },
    };
  },
});
