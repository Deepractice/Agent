# Issue 011: Distributed Architecture Design for AgentX

**Status**: Planning
**Priority**: High
**Created**: 2025-01-26
**Related**: Issue 010 (Stateless Engine foundation)

## Overview

This issue documents the complete distributed architecture design for AgentX, enabling horizontal scaling with multiple stateless Engine instances sharing a common database. The design builds on the stateless AgentEngine from Issue 010.

## Goals

1. **Horizontal Scaling** - Multiple Engine instances can handle any agentId
2. **State DB化** - All business data persisted to database, not memory
3. **Tool Compatibility** - Agent tools work seamlessly across distributed instances
4. **Desktop/Cloud Parity** - Same codebase works for both desktop and cloud deployment

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Load Balancer                                  │
│                    (Random or sticky routing)                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   AgentEngine A     │ │   AgentEngine B     │ │   AgentEngine C     │
│   (STATELESS)       │ │   (STATELESS)       │ │   (STATELESS)       │
│                     │ │                     │ │                     │
│   - Driver          │ │   - Driver          │ │   - Driver          │
│   - Presenters      │ │   - Presenters      │ │   - Presenters      │
│   - NO state!       │ │   - NO state!       │ │   - NO state!       │
│                     │ │                     │ │                     │
│   /mnt/juicefs/     │ │   /mnt/juicefs/     │ │   /mnt/juicefs/     │
│   (shared FS)       │ │   (shared FS)       │ │   (shared FS)       │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────┐
        ▼                           ▼                       ▼
┌───────────────┐          ┌───────────────┐       ┌───────────────┐
│  SessionStore │          │  StateStore   │       │   JuiceFS     │
│  (Messages)   │          │ (AgentState)  │       │  (Project FS) │
│               │          │               │       │               │
│  PostgreSQL   │          │  PostgreSQL   │       │  R2 + Redis   │
└───────────────┘          └───────────────┘       └───────────────┘
```

## Key Design Decisions

### 1. Stateless Engine (Completed in Issue 010)

Engine has NO persistent state. All intermediate processing state is local variables:

```typescript
class AgentEngine {
  // NO store field!

  async receive(agentId: string, message: UserMessage) {
    let state = createInitialState(); // LOCAL variable

    for await (const event of this.driver(message)) {
      state = this.processEvent(agentId, state, event);
    }
    // state discarded - business data persisted by Presenters
  }
}
```

### 2. Business Data Persistence via Presenters

Presenters handle all data persistence:

```typescript
const engine = new AgentEngine({
  driver: claudeDriver,
  presenters: [
    // Forward stream events to SSE
    createStreamPresenter((id, event) => sseConnection.send(id, event)),

    // Persist messages to database
    createMessagePresenter((id, event) => sessionStore.addMessage(id, event.data)),

    // Persist statistics (cost, tokens, duration)
    createTurnPresenter((id, event) => statsStore.addTurn(id, event.data)),
  ],
});
```

### 3. Distributed File System with JuiceFS

Agent tools require file system access. In distributed deployment, we use JuiceFS:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              JuiceFS                                     │
│                                                                          │
│  Metadata (small, fast)              Data (large, core content)         │
│  ├─ File names, directories         ├─ Actual file content              │
│  ├─ Permissions, timestamps         ├─ Chunked storage                  │
│  └─ Location mapping                └─ Compression/encryption           │
│       │                                   │                              │
│       ▼                                   ▼                              │
│  Redis (Upstash)                    Object Storage (R2)                 │
│  ~$10/month                         ~$0.015/GB/month                    │
└─────────────────────────────────────────────────────────────────────────┘
```

**Why JuiceFS?**

| Requirement           | JuiceFS Solution                             |
| --------------------- | -------------------------------------------- |
| SDK Compatibility     | ✅ POSIX-compatible, tools work unchanged    |
| Desktop Compatibility | ✅ Desktop uses local FS, cloud uses JuiceFS |
| Zero Code Changes     | ✅ Only deployment config changes            |
| Performance           | ✅ Local caching, near-native speed          |

## Technology Stack

### Storage Layer

| Component          | Technology        | Reason                    |
| ------------------ | ----------------- | ------------------------- |
| **Object Storage** | Cloudflare R2     | Zero egress fees!         |
| **Metadata DB**    | Upstash Redis     | Serverless, low cost      |
| **Session Store**  | PostgreSQL (Neon) | Serverless PostgreSQL     |
| **State Store**    | PostgreSQL (Neon) | Same DB, different tables |

### Cost Analysis

**Scenario**: 10 active agents, each with 1GB project

| Service         | Usage     | Cost/Month     |
| --------------- | --------- | -------------- |
| R2 Storage      | 10GB      | $0.15          |
| R2 Egress       | Unlimited | $0 (free!)     |
| R2 API Requests | ~1M       | $0.36          |
| Upstash Redis   | Pro tier  | $10            |
| Neon PostgreSQL | Free tier | $0             |
| **Total**       |           | **~$11/month** |

### Why Cloudflare R2?

| Provider          | Storage   | Egress   | API Requests |
| ----------------- | --------- | -------- | ------------ |
| **Cloudflare R2** | $0.015/GB | **FREE** | $0.36/M      |
| AWS S3            | $0.023/GB | $0.09/GB | $0.40/M      |
| Backblaze B2      | $0.006/GB | $0.01/GB | Free         |

**Agent workload characteristics**:

- Frequent file reads (high egress)
- Moderate storage (code projects are small)
- Many small requests

→ **R2's free egress is the killer feature** for agent workloads.

## Data Flow

### Request Handling

```
User Request (agentId: "agent_123")
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Load Balancer (routes to any available Engine)                          │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  AgentEngine (stateless)                                                 │
│                                                                          │
│  1. receive(agentId, message)                                           │
│  2. Driver calls Claude API → StreamEvents                              │
│  3. Process events, emit outputs                                        │
│  4. Presenters persist to DB                                            │
│                                                                          │
│  File operations: /mnt/juicefs/agent_123/project/                       │
│  (Transparent - tools don't know it's distributed)                      │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  PostgreSQL   │  │    Redis      │  │      R2       │
│  (Sessions)   │  │  (JuiceFS)    │  │   (Files)     │
└───────────────┘  └───────────────┘  └───────────────┘
```

### What Gets Stored Where

| Data Type            | Storage          | Example                    |
| -------------------- | ---------------- | -------------------------- |
| **Message History**  | PostgreSQL       | User/Assistant messages    |
| **Agent State**      | PostgreSQL       | Current conversation state |
| **Turn Statistics**  | PostgreSQL       | Cost, tokens, duration     |
| **Project Files**    | R2 (via JuiceFS) | Source code, configs       |
| **JuiceFS Metadata** | Redis            | File tree, permissions     |

## Constraints

### Single Request Constraint

```
❌ Cannot do:
─────────────────────────────────────────────────────────
Request starts on Engine A → Engine A crashes → Engine B takes over

Why: Claude API stream is bound to Engine A's process

✅ Can do:
─────────────────────────────────────────────────────────
Request 1 → Engine A (completes)
Request 2 → Engine B (new request, same agentId)

Why: Business data is in DB, Engine B reads from DB
```

This is acceptable because:

1. Single requests are short-lived (seconds to minutes)
2. If Engine crashes, user retries the request
3. No data loss - messages already persisted by Presenters

## Deployment Modes

### Desktop Mode

```typescript
const engine = new AgentEngine({
  driver: claudeDriver,
  presenters: [createMessagePresenter((id, e) => localDB.saveMessage(id, e.data))],
});

// Tools use local filesystem
const projectPath = "/Users/sean/my-project";
```

### Cloud Mode

```typescript
const engine = new AgentEngine({
  driver: claudeDriver,
  presenters: [
    createMessagePresenter((id, e) => postgres.saveMessage(id, e.data)),
    createStreamPresenter((id, e) => sseManager.send(id, e)),
  ],
});

// Tools use JuiceFS (same code!)
const projectPath = "/mnt/juicefs/agent_123/project";
```

**Key**: Same Engine code, different configuration.

## Implementation Plan

### Phase 1: Database Stores (TODO)

1. [ ] Create `SessionStore` interface
2. [ ] Implement PostgreSQL SessionStore
3. [ ] Create `StatisticsStore` interface
4. [ ] Implement PostgreSQL StatisticsStore
5. [ ] Update Presenters to use stores

### Phase 2: JuiceFS Integration (TODO)

1. [ ] Set up JuiceFS with R2 backend
2. [ ] Configure Redis metadata store
3. [ ] Create mount scripts for cloud deployment
4. [ ] Test tool operations on JuiceFS
5. [ ] Performance benchmarking

### Phase 3: Multi-Instance Deployment (TODO)

1. [ ] Docker image with JuiceFS client
2. [ ] Kubernetes deployment config
3. [ ] Load balancer setup
4. [ ] Health check endpoints
5. [ ] Horizontal Pod Autoscaler config

### Phase 4: Desktop/Cloud Parity (TODO)

1. [ ] Abstract file path configuration
2. [ ] Environment-based store selection
3. [ ] Single codebase, dual deployment
4. [ ] Integration tests for both modes

## Store Interfaces

```typescript
// packages/agentx-core/src/stores/SessionStore.ts
interface SessionStore {
  getMessages(agentId: string): Promise<Message[]>;
  addMessage(agentId: string, message: Message): Promise<void>;
  clearMessages(agentId: string): Promise<void>;
}

// packages/agentx-core/src/stores/StatisticsStore.ts
interface StatisticsStore {
  getTotalCost(agentId: string): Promise<number>;
  getTotalTokens(agentId: string): Promise<TokenUsage>;
  addTurn(agentId: string, turn: TurnData): Promise<void>;
}

// packages/agentx-core/src/stores/StateStore.ts
interface StateStore {
  getState(agentId: string): Promise<AgentState>;
  setState(agentId: string, state: AgentState): Promise<void>;
}
```

## Success Criteria

- [ ] Multiple Engine instances can handle same agentId
- [ ] Message history persisted across Engine restarts
- [ ] Tool file operations work on JuiceFS
- [ ] Cost < $20/month for 10 active agents
- [ ] Same codebase deploys to desktop and cloud
- [ ] No data loss when Engine instance crashes mid-request

## References

- [JuiceFS Documentation](https://juicefs.com/docs/)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [Upstash Redis](https://upstash.com/)
- [Neon Serverless PostgreSQL](https://neon.tech/)
- Issue 010: Engine Stateless Architecture
