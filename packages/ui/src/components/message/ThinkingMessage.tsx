/**
 * ThinkingMessage - Display thinking indicator
 *
 * Features:
 * - Three animated bouncing dots
 * - Left-aligned with assistant avatar
 */

import * as React from "react";
import { MessageAvatar } from "./MessageAvatar";
import { cn } from "~/utils/utils";

export interface ThinkingMessageProps {
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * ThinkingMessage Component
 */
export const ThinkingMessage: React.FC<ThinkingMessageProps> = ({ className }) => {
  const [dots, setDots] = React.useState("");

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("flex gap-3 py-2", className)}>
      <MessageAvatar role="assistant" />
      <div className="rounded-lg px-4 py-2 bg-muted">
        <div className="text-sm text-muted-foreground">Thinking{dots}</div>
      </div>
    </div>
  );
};
