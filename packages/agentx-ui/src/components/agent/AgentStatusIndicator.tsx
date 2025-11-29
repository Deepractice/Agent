/**
 * AgentStatusIndicator - Agent state monitoring and display component
 *
 * Monitors agent.state and displays appropriate status UI.
 * Handles loading states, status text, elapsed time, and abort functionality.
 *
 * @example
 * ```tsx
 * <AgentStatusIndicator agent={agent} />
 * ```
 */

import { useState, useEffect } from "react";
import type { Agent, AgentState } from "@deepractice-ai/agentx-types";

export interface AgentStatusIndicatorProps {
  /**
   * Agent instance to monitor
   */
  agent: Agent;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Whether to show the abort button
   * @default true
   */
  showAbortButton?: boolean;
}

/**
 * Get display text for agent state
 */
function getStatusText(state: AgentState): string {
  switch (state) {
    case "initializing":
      return "Initializing";
    case "queued":
      return "Queued";
    case "thinking":
      return "Thinking";
    case "responding":
      return "Responding";
    case "planning_tool":
      return "Planning tool use";
    case "awaiting_tool_result":
      return "Awaiting tool result";
    case "conversation_active":
      return "Processing";
    default:
      return "";
  }
}

/**
 * Check if state is a loading state
 */
function isLoadingState(state: AgentState): boolean {
  return state !== "idle" && state !== "ready" && state !== "initializing";
}

/**
 * AgentStatusIndicator - Displays agent status with animations
 */
export function AgentStatusIndicator({
  agent,
  className = "",
  showAbortButton = true,
}: AgentStatusIndicatorProps) {
  const [state, setState] = useState<AgentState>(agent.state);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Subscribe to agent state changes
  useEffect(() => {
    const unsubscribe = agent.onStateChange((change) => {
      setState(change.current);
    });

    // Sync initial state
    setState(agent.state);

    return unsubscribe;
  }, [agent]);

  // Elapsed time counter
  useEffect(() => {
    if (!isLoadingState(state)) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [state]);

  // Spinner animation
  useEffect(() => {
    if (!isLoadingState(state)) return;

    const timer = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(timer);
  }, [state]);

  const isLoading = isLoadingState(state);
  const statusText = getStatusText(state);
  const spinners = ["●", "●", "●", "○"];

  const handleAbort = () => {
    agent.interrupt();
  };

  if (!isLoading) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between max-w-4xl mx-auto bg-gray-900 dark:bg-gray-950 text-white rounded-lg shadow-lg px-4 py-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {/* Animated spinner */}
            <span className="text-xl text-blue-400 flex items-center space-x-0.5">
              {spinners.map((dot, i) => (
                <span
                  key={i}
                  className={`transition-opacity duration-200 ${
                    i === animationPhase ? "opacity-100" : "opacity-30"
                  }`}
                >
                  {dot}
                </span>
              ))}
            </span>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{statusText}...</span>
                <span className="text-gray-400 text-sm">({elapsedTime}s)</span>
                <span className="text-gray-400 hidden sm:inline">·</span>
                <span className="text-gray-300 text-sm hidden sm:inline">esc to interrupt</span>
              </div>
              <div className="text-xs text-gray-400 sm:hidden mt-1">esc to interrupt</div>
            </div>
          </div>
        </div>

        {showAbortButton && (
          <button
            onClick={handleAbort}
            className="ml-3 text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span className="hidden sm:inline">Stop</span>
          </button>
        )}
      </div>
    </div>
  );
}
