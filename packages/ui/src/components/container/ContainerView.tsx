/**
 * ContainerView - Pure UI layout component for multi-agent workspace
 *
 * This is a presentational component that receives all data and callbacks
 * as props. It contains NO business logic or state management.
 *
 * Part of UI-Backend API Consistency design (see index.ts ADR #5):
 * - Studio (integration) uses useSession + useAgent hooks
 * - ContainerView (pure UI) renders the layout
 *
 * @example
 * ```tsx
 * // Used by Studio (integration layer)
 * <ContainerView
 *   definitions={definitions}
 *   sessions={sessions}
 *   currentDefinition={currentDefinition}
 *   currentSession={currentSession}
 *   messages={messages}
 *   streaming={streaming}
 *   isLoading={isLoading}
 *   onSelectDefinition={handleSelectDefinition}
 *   onSelectSession={handleSelectSession}
 *   onCreateSession={handleCreateSession}
 *   onSend={handleSend}
 * />
 * ```
 */

import type { ReactNode } from "react";
import type { Message, AgentError } from "@agentxjs/types";
import type { AgentDefinitionItem } from "./types";
import type { SessionItem } from "~/hooks/useSession";

// Pane components
import { DefinitionPane } from "./DefinitionPane";
import { SessionPane } from "./SessionPane";
import { AgentPane } from "./AgentPane";
import { InputPane } from "./InputPane";

/**
 * Props for ContainerView component
 *
 * All data is passed in, no internal state management.
 */
export interface ContainerViewProps {
  // ===== Data =====

  /**
   * Available agent definitions
   */
  definitions: AgentDefinitionItem[];

  /**
   * User's sessions
   */
  sessions: SessionItem[];

  /**
   * Currently selected definition
   */
  currentDefinition: AgentDefinitionItem | null;

  /**
   * Currently selected session
   */
  currentSession: SessionItem | null;

  /**
   * Messages in current conversation
   */
  messages: Message[];

  /**
   * Current streaming text (assistant response in progress)
   */
  streaming?: string;

  /**
   * Errors from agent
   */
  errors?: AgentError[];

  /**
   * Whether agent is processing
   */
  isLoading: boolean;

  // ===== Callbacks =====

  /**
   * Called when user selects a definition
   */
  onSelectDefinition: (definition: AgentDefinitionItem) => void;

  /**
   * Called when user selects a session
   */
  onSelectSession: (session: SessionItem) => void;

  /**
   * Called when user wants to create a new session
   */
  onCreateSession: () => void;

  /**
   * Called when user sends a message
   */
  onSend: (text: string) => void;

  /**
   * Called when user wants to abort current response
   */
  onAbort?: () => void;

  /**
   * Called when user wants to add a definition
   */
  onAddDefinition?: () => void;

  /**
   * Called when user wants to delete a session
   */
  onDeleteSession?: (sessionId: string) => void;

  // ===== Layout customization =====

  /**
   * Custom render for the entire layout
   * If provided, takes full control of rendering
   */
  children?: (props: ContainerViewRenderProps) => ReactNode;

  /**
   * Custom className for container
   */
  className?: string;
}

/**
 * Props passed to custom render function
 */
export interface ContainerViewRenderProps {
  // All data props
  definitions: AgentDefinitionItem[];
  sessions: SessionItem[];
  currentDefinition: AgentDefinitionItem | null;
  currentSession: SessionItem | null;
  messages: Message[];
  streaming?: string;
  errors?: AgentError[];
  isLoading: boolean;

  // All callbacks
  onSelectDefinition: (definition: AgentDefinitionItem) => void;
  onSelectSession: (session: SessionItem) => void;
  onCreateSession: () => void;
  onSend: (text: string) => void;
  onAbort?: () => void;
  onAddDefinition?: () => void;
  onDeleteSession?: (sessionId: string) => void;
}

/**
 * ContainerView - Pure UI layout component
 *
 * Default layout (3-column):
 * ```
 * ┌──────────┬────────────┬──────────────────────────┐
 * │          │            │                          │
 * │ Def.Pane │ Sess.Pane  │      AgentPane           │
 * │  (60px)  │  (240px)   │                          │
 * │          │            ├──────────────────────────┤
 * │          │            │      InputPane           │
 * └──────────┴────────────┴──────────────────────────┘
 * ```
 *
 * When `children` is provided, it acts as a render props container.
 */
export function ContainerView({
  definitions,
  sessions,
  currentDefinition,
  currentSession,
  messages,
  streaming,
  errors,
  isLoading,
  onSelectDefinition,
  onSelectSession,
  onCreateSession,
  onSend,
  onAbort,
  onAddDefinition,
  onDeleteSession,
  children,
  className = "",
}: ContainerViewProps) {
  // Build render props
  const renderProps: ContainerViewRenderProps = {
    definitions,
    sessions,
    currentDefinition,
    currentSession,
    messages,
    streaming,
    errors,
    isLoading,
    onSelectDefinition,
    onSelectSession,
    onCreateSession,
    onSend,
    onAbort,
    onAddDefinition,
    onDeleteSession,
  };

  // If custom render provided, use it
  if (children) {
    return <div className={`h-full flex flex-col ${className}`}>{children(renderProps)}</div>;
  }

  // Default 3-column layout
  return (
    <div className={`h-full flex ${className}`}>
      {/* Left: Definition Pane */}
      <div className="w-[60px] border-r border-border flex-shrink-0">
        <DefinitionPane
          definitions={definitions}
          current={currentDefinition}
          onSelect={onSelectDefinition}
        />
      </div>

      {/* Middle: Session Pane */}
      <div className="w-[240px] border-r border-border flex-shrink-0">
        <SessionPane
          sessions={sessions}
          current={currentSession}
          onSelect={onSelectSession}
          onCreate={onCreateSession}
          onDelete={onDeleteSession}
        />
      </div>

      {/* Right: Agent + Input */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Agent Pane */}
        <div className="flex-1 min-h-0">
          <AgentPane
            definition={currentDefinition}
            session={currentSession}
            messages={messages}
            streaming={streaming}
            errors={errors}
            isLoading={isLoading}
            onAbort={onAbort}
            onCreateSession={onCreateSession}
          />
        </div>

        {/* Input Pane */}
        <div className="flex-shrink-0 border-t border-border">
          <InputPane onSend={onSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}

// Re-export types
export type { AgentDefinitionItem } from "./types";
export type { SessionItem } from "~/hooks/useSession";
