/**
 * Workspace - Integration layer for multi-agent chat UI
 *
 * Workspace is the ONLY frontend-specific concept in the UI architecture.
 * It integrates:
 * - useSession hook (maps to agentx.sessions)
 * - useAgent hook (maps to agentx.agents)
 * - ContainerView (pure UI layout)
 *
 * Part of UI-Backend API Consistency design (see index.ts ADR #5):
 * - UI types mirror agentx-types
 * - Naming follows backend (session, not topic)
 * - No invented concepts except Workspace
 *
 * @example
 * ```tsx
 * import { Workspace } from "@deepractice-ai/agentx-ui";
 *
 * function App() {
 *   return (
 *     <Workspace
 *       agentx={agentx}
 *       userId="user_123"
 *       definitions={definitions}
 *     />
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect } from "react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";

import type { AgentX, Agent } from "@deepractice-ai/agentx-types";
import { useSession, type SessionItem } from "~/hooks/useSession";
import { useAgent } from "~/hooks/useAgent";
import { DefinitionPane } from "~/components/container/DefinitionPane";
import { SessionPane } from "~/components/container/SessionPane";
import { AgentPane } from "~/components/container/AgentPane";
import { InputPane } from "~/components/container/InputPane";
import { Sidebar } from "~/components/layout/Sidebar";
import { MainContent } from "~/components/layout/MainContent";
import type { AgentDefinitionItem } from "~/components/container/types";

/**
 * Props for Workspace component
 */
export interface WorkspaceProps {
  /**
   * AgentX instance for backend communication
   */
  agentx: AgentX;

  /**
   * Current user ID
   */
  userId: string;

  /**
   * Available agent definitions
   */
  definitions: AgentDefinitionItem[];

  /**
   * Optional callback when session changes
   */
  onSessionChange?: (session: SessionItem | null) => void;

  /**
   * Optional callback when definition changes
   */
  onDefinitionChange?: (definition: AgentDefinitionItem | null) => void;

  /**
   * Optional custom className
   */
  className?: string;
}

/**
 * Workspace - Integration layer component
 *
 * Integrates:
 * - useSession for session management (maps to agentx.sessions)
 * - useAgent for agent state (maps to agentx.agents)
 * - ContainerView layout components
 */
export function Workspace({
  agentx,
  userId,
  definitions,
  onSessionChange,
  onDefinitionChange,
  className = "",
}: WorkspaceProps) {
  // ===== UI Selection State =====
  const [currentDefinition, setCurrentDefinition] = useState<AgentDefinitionItem | null>(
    definitions[0] ?? null
  );

  // ===== Session State (maps to agentx.sessions) =====
  const {
    sessions,
    currentSession,
    selectSession,
    createSession,
    deleteSession,
    isLoading: sessionLoading,
  } = useSession(agentx, userId, {
    onSessionChange: (session) => {
      onSessionChange?.(session);
    },
  });

  // ===== Agent Instance Management =====
  const [agent, setAgent] = useState<Agent | null>(null);

  // Create agent when session is selected
  useEffect(() => {
    if (!currentSession || !currentDefinition) {
      setAgent(null);
      return;
    }

    // Create agent for this session
    // In real implementation, this would use agentx.agents.create()
    const createAgentForSession = async () => {
      try {
        // The actual agent creation depends on agentx API
        // AgentDefinitionItem extends AgentDefinition, so we can pass it directly
        if ("agents" in agentx && agentx.agents) {
          // Create agent using the definition (which includes name, description, etc.)
          const newAgent = await agentx.agents.create(currentDefinition, {
            // Additional configuration can be added here
          });
          setAgent(newAgent);
        }
      } catch (error) {
        console.error("Failed to create agent:", error);
      }
    };

    createAgentForSession();

    // Cleanup agent on unmount or session change
    return () => {
      if (agent) {
        agent.destroy?.().catch(console.error);
      }
    };
  }, [currentSession?.sessionId, currentDefinition?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Agent State (maps to agentx.agents) =====
  const {
    messages,
    streaming,
    errors,
    send,
    isLoading: agentLoading,
    clearMessages,
  } = useAgent(agent);

  // ===== Handlers =====

  const handleSelectDefinition = useCallback(
    (definition: AgentDefinitionItem) => {
      setCurrentDefinition(definition);
      onDefinitionChange?.(definition);
      // Clear current session when definition changes
      selectSession(null);
      clearMessages();
    },
    [selectSession, clearMessages, onDefinitionChange]
  );

  const handleSelectSession = useCallback(
    (session: SessionItem) => {
      selectSession(session);
      clearMessages();
    },
    [selectSession, clearMessages]
  );

  const handleCreateSession = useCallback(async () => {
    if (!currentDefinition) return;

    // Get MetaImage for the current definition
    const metaImage = await agentx.images.getMetaImage(currentDefinition.name);
    if (!metaImage) {
      console.error("MetaImage not found for definition:", currentDefinition.name);
      return;
    }

    await createSession(metaImage.imageId, `New Chat ${sessions.length + 1}`);
  }, [agentx, currentDefinition, createSession, sessions.length]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId);
    },
    [deleteSession]
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!currentSession) {
        // Auto-create session on first message
        handleCreateSession().then(() => {
          send(text);
        });
      } else {
        send(text);
      }
    },
    [currentSession, handleCreateSession, send]
  );

  // ===== Computed State =====
  const isLoading = sessionLoading || agentLoading;

  // ===== Render =====
  return (
    <div className={`h-full bg-background ${className}`}>
      <Allotment>
        {/* ActivityBar - Definition selection */}
        <Allotment.Pane minSize={56} maxSize={56}>
          <div className="h-full bg-muted/30 border-r border-border">
            <DefinitionPane
              definitions={definitions}
              current={currentDefinition}
              onSelect={handleSelectDefinition}
              onAdd={() => {
                // TODO: Add definition dialog
                console.log("Add definition");
              }}
            />
          </div>
        </Allotment.Pane>

        {/* Sidebar - Session list */}
        <Allotment.Pane minSize={200} maxSize={400} preferredSize={280}>
          <Sidebar>
            <SessionPane
              sessions={sessions}
              current={currentSession}
              agentName={currentDefinition?.name}
              onSelect={handleSelectSession}
              onCreate={handleCreateSession}
              onDelete={handleDeleteSession}
            />
          </Sidebar>
        </Allotment.Pane>

        {/* MainContent - Chat area */}
        <Allotment.Pane>
          <MainContent>
            <Allotment vertical>
              <Allotment.Pane>
                <AgentPane
                  definition={currentDefinition}
                  session={currentSession}
                  messages={messages}
                  streaming={streaming}
                  errors={errors}
                  isLoading={isLoading}
                  onCreateSession={handleCreateSession}
                />
              </Allotment.Pane>

              <Allotment.Pane minSize={80} maxSize={400} preferredSize={120}>
                <InputPane onSend={handleSend} disabled={isLoading} />
              </Allotment.Pane>
            </Allotment>
          </MainContent>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

export default Workspace;
