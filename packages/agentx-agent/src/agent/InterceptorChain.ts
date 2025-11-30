/**
 * InterceptorChain
 *
 * Manages interceptor chain for event dispatch interception.
 * Interceptors can modify, filter, or log events before they reach subscribers.
 */

import type { AgentInterceptor, AgentOutput, Unsubscribe } from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("core/InterceptorChain");

/**
 * InterceptorChain - Interceptor management and execution
 */
export class InterceptorChain {
  private readonly interceptors: AgentInterceptor[] = [];
  private readonly agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  /**
   * Add interceptor to the chain
   *
   * @param interceptor - Interceptor function
   * @returns Unsubscribe function to remove the interceptor
   */
  intercept(interceptor: AgentInterceptor): Unsubscribe {
    this.interceptors.push(interceptor);

    return () => {
      const index = this.interceptors.indexOf(interceptor);
      if (index !== -1) {
        this.interceptors.splice(index, 1);
      }
    };
  }

  /**
   * Execute the interceptor chain
   *
   * @param event - Event to process
   * @param finalHandler - Handler called at the end of the chain
   */
  execute(event: AgentOutput, finalHandler: (e: AgentOutput) => void): void {
    let index = 0;

    const next = (e: AgentOutput): void => {
      if (index < this.interceptors.length) {
        const interceptor = this.interceptors[index++];
        try {
          interceptor(e, next);
        } catch (error) {
          logger.error("Interceptor error", {
            agentId: this.agentId,
            eventType: e.type,
            interceptorIndex: index - 1,
            error,
          });
          // Continue to next interceptor even if one fails
          next(e);
        }
      } else {
        // End of chain - call final handler
        finalHandler(e);
      }
    };

    next(event);
  }

  /**
   * Clear all interceptors
   */
  clear(): void {
    this.interceptors.length = 0;
  }

  /**
   * Get the number of interceptors
   */
  get size(): number {
    return this.interceptors.length;
  }
}
