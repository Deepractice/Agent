// @ts-nocheck - Temporary workaround for TypeScript JSX type inference issues
import type React from "react";
import type { ErrorMessage as ErrorMessageType } from "@deepractice-ai/agentx-types";
import { MessageAvatar } from "~/components/elements/MessageAvatar";
import { AlertCircle, AlertTriangle, XCircle } from "lucide-react";

export interface ErrorMessageProps {
  /**
   * Error message data
   */
  error: ErrorMessageType;

  /**
   * Whether to show detailed error information
   * @default false
   */
  showDetails?: boolean;
}

/**
 * ErrorMessage - Display an error event
 *
 * Features:
 * - Error severity visualization (fatal/error/warning)
 * - Error category badge (system/agent/llm/validation)
 * - Error code and message
 * - Optional details expansion
 *
 * @example
 * ```tsx
 * <ErrorMessage error={{
 *   type: 'error',
 *   subtype: 'system',
 *   severity: 'error',
 *   message: 'WebSocket connection failed',
 *   code: 'WS_ERROR',
 *   recoverable: true,
 *   uuid: '123',
 *   sessionId: 'session_123',
 *   timestamp: Date.now()
 * }} />
 * ```
 */
export function ErrorMessage({ error, showDetails = false }: ErrorMessageProps) {
  // Defensive: provide defaults for missing fields
  const severity = error.severity || "error";
  const subtype = error.subtype || "unknown";

  // Severity styling
  const severityConfig: Record<
    ErrorMessageType["severity"],
    {
      bg: string;
      border: string;
      text: string;
      icon: React.ReactNode;
      label: string;
    }
  > = {
    fatal: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-300 dark:border-red-700",
      text: "text-red-700 dark:text-red-300",
      icon: <XCircle className="w-5 h-5 text-white" />,
      label: "Fatal Error",
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-300 dark:border-red-700",
      text: "text-red-700 dark:text-red-300",
      icon: <AlertCircle className="w-5 h-5 text-white" />,
      label: "Error",
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-300 dark:border-yellow-700",
      text: "text-yellow-700 dark:text-yellow-300",
      icon: <AlertTriangle className="w-5 h-5 text-white" />,
      label: "Warning",
    },
  };

  const config = severityConfig[severity] ?? severityConfig.error;

  // Subtype badge color
  const subtypeColors: Record<ErrorMessageType["subtype"], string> = {
    system: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    agent: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    llm: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    validation: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    unknown: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };

  const subtypeColor = subtypeColors[subtype] ?? subtypeColors.unknown;

  return (
    <div className="chat-message error">
      <div className="w-full">
        {/* Avatar */}
        <MessageAvatar
          label={config.label}
          variant={severity === "warning" ? "warning" : "error"}
          icon={config.icon}
          size="md"
        />

        {/* Content */}
        <div className="pl-3 sm:pl-0">
          <div className={`text-sm ${config.bg} ${config.border} border rounded-lg p-3`}>
            {/* Header: Subtype badge + Code */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${subtypeColor}`}
              >
                {subtype.toUpperCase()}
              </span>
              {error.code && (
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                  {error.code}
                </span>
              )}
              {!error.recoverable && (
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  • Non-recoverable
                </span>
              )}
            </div>

            {/* Error message */}
            <p className={`${config.text} font-medium`}>{error.message || "Unknown error"}</p>

            {/* Details (optional) */}
            {showDetails && error.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  Show details
                </summary>
                <pre className="mt-2 text-xs bg-gray-900 dark:bg-gray-950 text-gray-100 rounded p-2 overflow-x-auto">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
