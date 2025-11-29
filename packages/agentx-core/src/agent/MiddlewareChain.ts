/**
 * MiddlewareChain
 *
 * Manages middleware chain for message interception.
 * Middlewares can modify, validate, or short-circuit message processing.
 */

import type { AgentMiddleware, Unsubscribe, UserMessage } from "@deepractice-ai/agentx-types";

/**
 * MiddlewareChain - Middleware management and execution
 */
export class MiddlewareChain {
  private readonly middlewares: AgentMiddleware[] = [];

  /**
   * Add middleware to the chain
   *
   * @param middleware - Middleware function
   * @returns Unsubscribe function to remove the middleware
   */
  use(middleware: AgentMiddleware): Unsubscribe {
    this.middlewares.push(middleware);

    return () => {
      const index = this.middlewares.indexOf(middleware);
      if (index !== -1) {
        this.middlewares.splice(index, 1);
      }
    };
  }

  /**
   * Execute the middleware chain
   *
   * @param message - User message to process
   * @param finalHandler - Handler called at the end of the chain
   */
  async execute(
    message: UserMessage,
    finalHandler: (msg: UserMessage) => Promise<void>
  ): Promise<void> {
    let index = 0;

    const next = async (msg: UserMessage): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(msg, next);
      } else {
        // End of chain - call final handler
        await finalHandler(msg);
      }
    };

    await next(message);
  }

  /**
   * Clear all middlewares
   */
  clear(): void {
    this.middlewares.length = 0;
  }

  /**
   * Get the number of middlewares
   */
  get size(): number {
    return this.middlewares.length;
  }
}
