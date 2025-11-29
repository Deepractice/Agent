/**
 * Input JSON Delta Event (L1: Stream Layer)
 *
 * Emitted when AI is constructing tool call parameters incrementally.
 * The parameters are streamed as JSON fragments that need to be concatenated.
 *
 * Usage: Show real-time tool parameter construction (optional)
 * Concatenate all partialJson values, then JSON.parse() when complete
 */

import type { StreamEvent } from "./StreamEvent";

export interface InputJsonDeltaEvent extends StreamEvent {
  type: "input_json_delta";

  /**
   * Event data
   */
  data: {
    /**
     * Partial JSON string fragment
     * Concatenate all fragments to build complete JSON
     *
     * @example
     * Delta 1: '{"query"'
     * Delta 2: ': "AgentX'
     * Delta 3: ' docs"}'
     * Result: '{"query": "AgentX docs"}'
     */
    partialJson: string;
  };
}
