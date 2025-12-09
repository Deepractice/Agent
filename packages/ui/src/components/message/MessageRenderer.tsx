/**
 * MessageRenderer - Render messages using Chain of Responsibility pattern
 *
 * This component uses a chain of MessageHandlers to render different message types.
 * It provides flexibility to use default handlers or custom handlers.
 *
 * Benefits:
 * - Clean separation: Each handler handles one message type
 * - Extensible: Easy to add new message types
 * - Flexible: Support custom handler chains
 *
 * @example
 * ```tsx
 * // Use default handlers
 * <MessageRenderer message={message} />
 *
 * // Use custom handler chain
 * const customChain = createCustomMessageChain([
 *   new MyCustomHandler(),
 *   ...defaultHandlers
 * ]);
 * <MessageRenderer message={message} customChain={customChain} />
 * ```
 */

import * as React from "react";
import type { Message } from "agentxjs";
import type { MessageHandler } from "./MessageHandler";
import { createMessageChain } from "./createMessageChain";
import { UnknownMessage } from "./UnknownMessage";

export interface MessageRendererProps {
  /**
   * Message to render
   */
  message: Message;
  /**
   * Custom handler chain (optional)
   * If not provided, uses default chain
   */
  customChain?: MessageHandler;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * MessageRenderer Component
 *
 * Uses Chain of Responsibility pattern to delegate rendering to appropriate handler.
 */
export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  customChain,
  className,
}) => {
  // Create default chain once
  const defaultChain = React.useMemo(() => createMessageChain(), []);

  // Use custom chain or default chain
  const chain = customChain ?? defaultChain;

  // Render through chain
  const rendered = chain.render(message);

  // If no handler can process, show UnknownMessage
  if (rendered === null) {
    return (
      <div className={className}>
        <UnknownMessage message={message} />
      </div>
    );
  }

  return <div className={className}>{rendered}</div>;
};
