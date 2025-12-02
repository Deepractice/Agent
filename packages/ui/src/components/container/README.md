# Container Components

Business components for building multi-agent workspace interfaces. These components provide the **content** that fills Layout components.

## Design Philosophy

> **Agent-First, Topic-Based**: Users interact with persistent Agent "partners", organizing conversations into manageable Topics.

```
Container (state management)
├── AgentDefinitionPane → fills ActivityBar (agent selection)
├── SessionPane → fills Sidebar (topic/session list)
└── AgentPane → fills MainContent (chat interface)
```

## Component Catalog

### 1. Container

Top-level integration component that manages state via render props.

```tsx
import { Container } from "@agentxjs/ui";

<Container
  initialDefinitions={definitions}
  initialSessions={sessions}
>
  {(state) => (
    // Render your layout with state
  )}
</Container>
```

**Props:**

- `initialDefinitions` - Available agent definitions
- `initialSessions` - Existing sessions
- `onDefinitionChange` - Callback when agent changes
- `onSessionChange` - Callback when session changes
- `createAgent` - Factory function for Agent instances

### 2. AgentDefinitionPane

Agent selection icons for ActivityBar.

```tsx
<ActivityBar>
  <AgentDefinitionPane
    definitions={state.definitions}
    current={state.currentDefinition}
    onSelect={state.selectDefinition}
    onAdd={() => openAddAgentDialog()}
  />
</ActivityBar>
```

**Features:**

- Vertical icon list
- Active state ring
- Online/offline indicator
- Unread badge count
- Add new agent button

### 3. SessionPane

Session/Topic list for Sidebar.

```tsx
<Sidebar>
  <SessionPane
    sessions={state.sessions}
    current={state.currentSession}
    agentName={state.currentDefinition?.name}
    onSelect={state.selectSession}
    onCreate={() => state.createSession()}
  />
</Sidebar>
```

**Features:**

- Search/filter
- Status indicators (active, pending, completed, archived)
- Grouped by status
- Preview text
- Relative timestamps
- Create new topic button

### 4. AgentPane

Main chat interface for MainContent.

```tsx
<MainContent>
  <AgentPane
    agent={state.currentAgent}
    definition={state.currentDefinition}
    session={state.currentSession}
    onCreateSession={() => state.createSession()}
  />
</MainContent>
```

**Features:**

- Agent header with status
- Chat message list (via Chat component)
- Empty states for no agent / no session
- Streaming text support

---

## Complete Layout Example

```tsx
import { Allotment } from "allotment";
import {
  Container,
  AgentDefinitionPane,
  SessionPane,
  AgentPane,
  ActivityBar,
  Sidebar,
  MainContent,
} from "@agentxjs/ui";

function MyStudio() {
  return (
    <div className="h-screen">
      <Container
        initialDefinitions={myDefinitions}
        initialSessions={mySessions}
        createAgent={(def, session) => createRemoteAgent({ ... })}
      >
        {(state) => (
          <Allotment>
            {/* Agent selection (ActivityBar) */}
            <Allotment.Pane minSize={56} maxSize={56}>
              <ActivityBar>
                <AgentDefinitionPane
                  definitions={state.definitions}
                  current={state.currentDefinition}
                  onSelect={state.selectDefinition}
                  onAdd={handleAddAgent}
                />
              </ActivityBar>
            </Allotment.Pane>

            {/* Session list (Sidebar) */}
            <Allotment.Pane minSize={200} maxSize={400} preferredSize={280}>
              <Sidebar>
                <SessionPane
                  sessions={state.sessions}
                  current={state.currentSession}
                  agentName={state.currentDefinition?.name}
                  onSelect={state.selectSession}
                  onCreate={() => state.createSession()}
                />
              </Sidebar>
            </Allotment.Pane>

            {/* Chat area (MainContent) */}
            <Allotment.Pane>
              <MainContent>
                <AgentPane
                  agent={state.currentAgent}
                  definition={state.currentDefinition}
                  session={state.currentSession}
                  onCreateSession={() => state.createSession()}
                />
              </MainContent>
            </Allotment.Pane>
          </Allotment>
        )}
      </Container>
    </div>
  );
}
```

---

## Data Model

```
Container (User Studio)
└── definitions: AgentDefinitionItem[]
    └── name, description, icon, color, isOnline, activeSessionCount

└── sessions: SessionItem[]
    └── sessionId, agentId, title, status, lastActivityAt, preview, unreadCount

└── currentDefinition: AgentDefinitionItem | null
└── currentSession: SessionItem | null
└── currentAgent: Agent | null (runtime instance)
```

### Session Status Flow

```
Created → active → pending → completed → archived
                     ↑           │
                     └───────────┘
                    (reopen)
```

---

## Relationship with Layout Components

| Layout Component | Container Component   | Purpose               |
| ---------------- | --------------------- | --------------------- |
| `ActivityBar`    | `AgentDefinitionPane` | Agent selection icons |
| `Sidebar`        | `SessionPane`         | Session/Topic list    |
| `MainContent`    | `AgentPane`           | Chat interface        |

Layout components are **structural** (positioning only).
Container components are **business** (agent-specific logic).

---

## State Management

### useContainer Hook

For custom integration without the Container component:

```tsx
import { useContainer } from "@agentxjs/ui";

function MyCustomStudio() {
  const {
    definitions,
    currentDefinition,
    sessions,
    currentSession,
    selectDefinition,
    selectSession,
    createSession,
    // ... more
  } = useContainer({
    initialDefinitions: myDefinitions,
    initialSessions: mySessions,
    onSessionChange: (session) => trackAnalytics(session),
  });

  return (
    // Build your own layout
  );
}
```

---

## Styling

Components use Tailwind CSS and follow the design system:

- **Colors**: `bg-sidebar`, `bg-background`, `text-foreground`, etc.
- **Spacing**: Consistent padding/margins
- **Transitions**: Smooth hover/active states

To customize, override Tailwind classes or use the design tokens.

---

## Related Documentation

- [Layout Components](../layout/README.md) - Structural containers
- [Chat Components](../chat/README.md) - Message rendering
- [Design System](../../DESIGN_SYSTEM.md) - Colors, typography
