/**
 * UnknownMessage - Fallback for unrecognized message types
 *
 * Displays when no handler in the chain can process the message.
 * Useful for debugging and development.
 */

import * as React from "react";
import type { Message } from "agentxjs";
import { AlertCircle } from "lucide-react";

export interface UnknownMessageProps {
  /**
   * The unrecognized message
   */
  message: Message;
}

/**
 * UnknownMessage Component
 */
export const UnknownMessage: React.FC<UnknownMessageProps> = ({ message }) => {
  return (
    <div className="flex gap-3 py-2">
      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-500 text-white flex-shrink-0">
        <AlertCircle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-yellow-600 dark:text-yellow-500 mb-1">
          Unknown message type: {message.subtype ?? "undefined"}
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
          <pre className="text-xs overflow-x-auto">{JSON.stringify(message, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};
