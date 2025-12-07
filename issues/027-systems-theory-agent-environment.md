# 系统论视角：Agent 与 Environment 的交互模型

## 背景

在重构 Runtime 设计时，我们发现原有的 Driver 概念需要重新审视。通过系统论的视角，我们可以更清晰地定义 Agent、Environment、Receptor、Effector 之间的关系。

## 核心概念

### 系统论基础

在系统论中：

- **系统 (System)**：有边界、有内部状态、有行为的实体
- **环境 (Environment)**：系统边界之外的一切
- **感受器 (Receptor)**：感知环境刺激，将外部信号转换为系统可处理的输入
- **效应器 (Effector)**：接收系统指令，作用于环境

### 映射到 AgentX

```
┌─────────────────────────────────────────────────────────────┐
│                      Ecosystem (生态系统)                    │
│                                                             │
│   ┌───────────────────────────────────────────────────┐    │
│   │                 Environment (环境)                 │    │
│   │                                                    │    │
│   │  ┌──────────────────────────────────────────────┐ │    │
│   │  │           ClaudeEnvironment                  │ │    │
│   │  │                                              │ │    │
│   │  │  - LLM API (Claude, OpenAI, ...)            │ │    │
│   │  │  - Tools (文件系统、网络、数据库...)          │ │    │
│   │  │  - External World (用户输入、外部事件...)     │ │    │
│   │  └──────────────────────────────────────────────┘ │    │
│   │                                                    │    │
│   │  ┌──────────────────────────────────────────────┐ │    │
│   │  │           WebSocketEnvironment               │ │    │
│   │  │                                              │ │    │
│   │  │  - 远程服务器转发的事件                       │ │    │
│   │  │  - 远程工具执行结果                          │ │    │
│   │  └──────────────────────────────────────────────┘ │    │
│   └───────────────────────────────────────────────────┘    │
│                    ▲           │                            │
│                    │           │ Environment Events         │
│                    │           ▼                            │
│              ┌──────────┐ ┌──────────┐                     │
│              │ Effector │ │ Receptor │                     │
│              │ (作用)   │ │ (感知)   │                     │
│              └──────────┘ └──────────┘                     │
│                    ▲           │                            │
│                    │           │ Agent 内部处理             │
│                    │           ▼                            │
│   ┌───────────────────────────────────────────────────┐    │
│   │                   Agent (系统)                     │    │
│   │                                                    │    │
│   │  - 内部状态机 (Mealy Machine)                     │    │
│   │  - 内部事件 (Agent Domain Events)                 │    │
│   │  - 决策逻辑                                       │    │
│   │  - 记忆/上下文                                    │    │
│   └───────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 关键区分

### Agent Events vs Environment Events

这是两套**独立**的事件体系：

| 维度   | Agent Events      | Environment Events       |
| ------ | ----------------- | ------------------------ |
| 归属   | Agent 内部        | Ecosystem 层             |
| 作用   | 驱动 Agent 状态机 | 供外部订阅者感知         |
| 来源   | Agent 内部产生    | Environment 产生         |
| 消费者 | Agent 自己        | UI、日志、监控、其他系统 |

```
Agent 内部事件 (私有)              Environment 事件 (公开)
┌─────────────────────┐           ┌─────────────────────┐
│ - thinking          │           │ - message_start     │
│ - responding        │  ──转换──▶ │ - text_delta       │
│ - tool_executing    │           │ - tool_call         │
│ - ...               │           │ - tool_result       │
└─────────────────────┘           └─────────────────────┘
     Agent 消费                        外部订阅者消费
```

### Driver vs Environment

**原来的理解：** Driver 是 Agent 调用外部 API 的抽象

**现在的理解：** Environment 是 Agent 生存的外部世界

```
原来：
Agent ──调用──▶ Driver ──请求──▶ Claude API
                  │
                  └──返回──▶ Stream Events

现在：
Agent ◀──感知── Receptor ◀──转换── Environment ◀── Claude API
      ──动作──▶ Effector ──作用──▶ Environment ──▶ Tools
```

关键变化：

1. **方向反转**：不是 Agent 主动调用，而是 Agent 被动感知
2. **职责分离**：感知和作用是分开的（Receptor vs Effector）
3. **事件驱动**：Environment 产生事件，Agent 响应事件

## Environment 的实现

### ClaudeEnvironment

负责与 Claude API 交互，产生 Environment Events：

```typescript
interface ClaudeEnvironment extends Environment {
  // 当调用 Claude API 时，产生这些事件：
  // - message_start
  // - text_delta
  // - tool_call
  // - tool_result
  // - message_stop
}
```

### WebSocketEnvironment

负责接收远程服务器转发的事件：

```typescript
interface WebSocketEnvironment extends Environment {
  // 通过 WebSocket 接收 Environment Events
  // 和 ClaudeEnvironment 产生同样类型的事件
  // 对 Agent 来说是透明的
}
```

## Receptor 的分类

Receptor 按**事件类型**分类，而不是按来源分类：

```
Receptors (按事件类型)
├── StreamReceptor      → message_start, text_delta, tool_call, tool_result...
├── ConversationReceptor → conversation_start, thinking, responding, end...
├── AgentReceptor       → agent_started, agent_ready, agent_destroyed
├── ToolReceptor        → tool_planned, tool_executing, tool_completed, tool_failed
├── SessionReceptor     → session_created, session_updated, session_deleted
├── TransportReceptor   → heartbeat, connection_established
└── ErrorReceptor       → error events
```

这是**横切**的关系：

```
                    Environment Events (统一类型)
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
   ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
   │ StreamReceptor │ │ ToolReceptor   │ │ConversationR.  │
   │ (感知流事件)    │ │ (感知工具事件)  │ │(感知会话状态)   │
   └────────────────┘ └────────────────┘ └────────────────┘
```

## Runtime 的职责

Runtime 的职责是**实现所有 Receptor**，把各种外部来源的数据转成对应的 Environment Events：

### node-runtime

```
node-runtime 实现：
├── StreamReceptor    ← 调用 Claude SDK，转换 stream events
├── ToolReceptor      ← 执行工具，emit 工具状态事件
├── ConversationReceptor ← 跟踪会话状态，emit 状态事件
├── AgentReceptor     ← 跟踪 Agent 生命周期
├── SessionReceptor   ← SQLite 操作触发 session 事件
└── ErrorReceptor     ← 捕获错误

特点：主动产出事件（调用 Claude SDK、执行工具、操作数据库）
```

### remote-runtime

```
remote-runtime 实现：
├── StreamReceptor    ← WebSocket 接收 stream events
├── ToolReceptor      ← WebSocket 接收 tool events（server 转发）
├── ConversationReceptor ← WebSocket 接收
├── AgentReceptor     ← WebSocket 接收
├── SessionReceptor   ← HTTP API + WebSocket
├── TransportReceptor ← WebSocket 连接状态
└── ErrorReceptor     ← 捕获错误

特点：被动接收事件（通过 WebSocket 接收 server 转发的事件）
```

## 数据流

### node-runtime 数据流

```
Claude API
    │
    ▼
ClaudeEnvironment ──产生──▶ Environment Events
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             StreamReceptor  ToolReceptor  ConversationReceptor
                    │              │              │
                    └──────────────┼──────────────┘
                                   ▼
                              Agent (感知)
                                   │
                                   ▼
                              内部处理
                                   │
                                   ▼
                              Effector (动作)
                                   │
                                   ▼
                            Environment (作用)
```

### remote-runtime 数据流

```
WebSocket
    │
    ▼
WebSocketEnvironment ──还原──▶ Environment Events
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
             StreamReceptor  ToolReceptor  TransportReceptor
                    │              │              │
                    └──────────────┼──────────────┘
                                   ▼
                              Agent (感知)
                                   │
                              (只读镜像，不产生动作)
```

## 与现有代码的关系

### Driver → Environment

```typescript
// 现在
class ClaudeDriver implements RuntimeDriver {
  async *run(messages): AsyncIterable<StreamEvent> { ... }
}

// 重构后
class ClaudeEnvironment implements Environment {
  // 不再是 Agent 调用的 Driver
  // 而是产生 Environment Events 的环境
  start(emit: (event: EnvironmentEvent) => void): void { ... }
  stop(): void { ... }
}
```

### 保留 Agent 内部的 Stream 处理

Agent 内部仍然有自己的 Stream 处理逻辑，但这是 Agent 的**内部实现**，不暴露给 Ecosystem：

```typescript
// Agent 内部
class Agent {
  private handleStreamEvent(event: AgentStreamEvent) {
    // Agent 内部的状态机逻辑
  }
}

// Ecosystem 层
class StreamReceptor implements Receptor<RuntimeStreamEvent> {
  start(emit) {
    // 从 Environment 感知事件，转换后 emit
    this.environment.on((event) => {
      emit(this.toRuntimeStreamEvent(event));
    });
  }
}
```

## 实现计划

1. **定义 Environment 接口**
   - `packages/types/src/ecosystem/Environment.ts`

2. **实现 ClaudeEnvironment**
   - `packages/node-runtime/src/environment/ClaudeEnvironment.ts`
   - 封装 Claude SDK 调用，产生 Environment Events

3. **实现各 Receptor**
   - `packages/node-runtime/src/receptors/`
   - 从 Environment 感知事件，转换为 Receptor 特定类型

4. **重构 NodeRuntime**
   - 组装 Environment + Receptors
   - 移除 Driver 概念（或保留为 Environment 的内部实现）

5. **实现 WebSocketEnvironment**
   - `packages/remote-runtime/src/environment/WebSocketEnvironment.ts`
   - 接收 WebSocket 事件，还原为 Environment Events

## 总结

1. **Agent = 系统**：有边界、有内部状态、有行为的实体
2. **Environment = 环境**：Agent 外部的一切（LLM API、Tools、外部世界）
3. **Receptor = 感受器**：感知 Environment Events，喂给 Agent
4. **Effector = 效应器**：接收 Agent 动作，作用于 Environment
5. **Driver → Environment**：从"Agent 调用的工具"变为"Agent 生存的世界"
6. **两套事件体系**：Agent Events（内部）和 Environment Events（外部）是独立的

这个系统论视角让架构更加清晰：Agent 是生活在 Ecosystem 中的系统，Environment 是它的外部世界，通过 Receptor/Effector 进行交互。

## 相关文档

- issues/024-environment-events-architecture.md - Environment Events 设计
- issues/025-agentx-is-environment.md - AgentX = Environment 的同构视角
- issues/026-three-layer-architecture.md - 三层架构设计
