/**
 * Studio - Integration layer for multi-agent chat UI
 *
 * Studio is the ONLY frontend-specific concept in the UI architecture.
 * It integrates:
 * - useSession hook (maps to agentx.sessions)
 * - useAgent hook (maps to agentx.agents)
 * - ContainerView (pure UI layout)
 *
 * Part of UI-Backend API Consistency design (see index.ts ADR #5):
 * - UI types mirror agentx-types
 * - Naming follows backend (session, not topic)
 * - No invented concepts except Studio
 *
 * @example
 * ```tsx
 * import { Studio } from "@agentxjs/ui";
 *
 * function App() {
 *   return (
 *     <Studio
 *       agentx={agentx}
 *       userId="user_123"
 *       definitions={definitions}
 *     />
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Allotment } from "allotment";
import "allotment/dist/style.css";

import type { AgentX, Agent, Message } from "@agentxjs/types";
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
 * Props for Studio component
 */
export interface StudioProps {
  /**
   * AgentX instance for backend communication
   */
  agentx: AgentX;

  /**
   * Current user ID
   */
  userId: string;

  /**
   * User's dedicated Container ID
   * All agent operations will use this container
   */
  containerId: string;

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
 * Studio - Integration layer component
 *
 * Integrates:
 * - useSession for session management (maps to agentx.sessions)
 * - useAgent for agent state (maps to agentx.agents)
 * - ContainerView layout components
 */
export function Studio({
  agentx,
  userId,
  containerId,
  definitions,
  onSessionChange,
  onDefinitionChange,
  className = "",
}: StudioProps) {
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
  const [historyMessages, setHistoryMessages] = useState<Message[]>([]);
  // Use ref to avoid triggering effect when clearing the flag
  const justCreatedSessionIdRef = useRef<string | null>(null);

  // Resume agent when session is selected (for existing sessions)
  // New sessions are handled by handleCreateSession with run() instead
  useEffect(() => {
    if (!currentSession) {
      setAgent(null);
      setHistoryMessages([]);
      return;
    }

    // Skip if this session was just created (already has agent via run())
    if (currentSession.sessionId === justCreatedSessionIdRef.current) {
      justCreatedSessionIdRef.current = null;
      return;
    }

    // Resume agent from session and load history
    const resumeAgentFromSession = async () => {
      try {
        // Get the actual Session object and call resume()
        if ("sessions" in agentx && agentx.sessions) {
          const session = await agentx.sessions.get(currentSession.sessionId);
          if (session) {
            // Load history messages first
            const history = await session.getMessages();
            setHistoryMessages(history);

            // Then resume agent using user's container (which auto-collects new messages)
            const newAgent = await session.resume({ containerId });
            setAgent(newAgent);
          }
        }
      } catch (error) {
        console.error("Failed to resume agent from session:", error);
      }
    };

    resumeAgentFromSession();

    // Cleanup agent on unmount or session change
    return () => {
      if (agent) {
        agent.destroy?.().catch(console.error);
      }
    };
  }, [currentSession?.sessionId, containerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Agent State (maps to agentx.agents) =====
  const {
    messages: liveMessages,
    streaming,
    errors,
    send,
    status,
    interrupt,
    isLoading: agentLoading,
  } = useAgent(agent);

  // Combine history messages with live messages
  // History is loaded once on session change, live messages accumulate during conversation
  const messages = [...historyMessages, ...liveMessages];

  // ===== Handlers =====

  const handleSelectDefinition = useCallback(
    (definition: AgentDefinitionItem) => {
      setCurrentDefinition(definition);
      onDefinitionChange?.(definition);
      // Clear current session when definition changes
      selectSession(null);
    },
    [selectSession, onDefinitionChange]
  );

  const handleSelectSession = useCallback(
    (session: SessionItem) => {
      selectSession(session);
    },
    [selectSession]
  );

  const handleCreateSession = useCallback(async () => {
    if (!currentDefinition) return;

    // Get MetaImage for the current definition
    const metaImage = await agentx.images.getMetaImage(currentDefinition.name);
    if (!metaImage) {
      console.error("MetaImage not found for definition:", currentDefinition.name);
      return;
    }

    // Create session first
    const newSession = await createSession(metaImage.imageId, `New Chat ${sessions.length + 1}`);
    if (!newSession) return;

    // For new session, use run() instead of resume()
    // run() creates a fresh agent from the image, using user's container
    const newAgent = await agentx.images.run(metaImage.imageId, { containerId });

    // Get session object and collect messages
    const session = await agentx.sessions.get(newSession.sessionId);
    if (session) {
      session.collect(newAgent);
    }

    // Set agent directly and mark this session as just created (skip resume)
    justCreatedSessionIdRef.current = newSession.sessionId;
    setHistoryMessages([]); // New session has no history
    setAgent(newAgent);
  }, [agentx, currentDefinition, containerId, createSession, sessions.length]);

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
              onSettings={() => {
                // TODO: Settings dialog
                console.log("Open settings");
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
                  agentId={agent?.agentId}
                  messages={messages}
                  streaming={streaming}
                  errors={errors}
                  status={status}
                  isLoading={isLoading}
                  onAbort={interrupt}
                  onCreateSession={handleCreateSession}
                />
              </Allotment.Pane>

              <Allotment.Pane minSize={150} maxSize={600} preferredSize={220}>
                <InputPane
                  key={currentSession?.sessionId ?? "new"}
                  onSend={handleSend}
                  disabled={isLoading}
                />
              </Allotment.Pane>
            </Allotment>
          </MainContent>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}

export default Studio;
