# TurnId: 统一事件关联标识

## 背景

在 Code Review 过程中发现 `ClaudeReceptor` 输出的 `DriveableEvent` 中 `requestId` 是空字符串：

```typescript
// ClaudeReceptor.ts:80
const requestId = ""; // TODO: Implement requestId tracking
```

这导致无法正确路由事件到对应的 Agent。

## 问题分析

### 当前状态

1. **EnvironmentEvent** 定义了 `requestId`，用于路由事件
2. **RuntimeEvent (TurnEvent)** 定义了 `turnId`，用于关联一个回合的事件
3. 两者实际上是同一个概念，但命名不同，且没有贯穿机制

### 核心洞察

**Turn 的定义**（来自 `types/src/ecosystem/event/runtime/agent/turn/index.ts`）：

> A turn = one user message + assistant response cycle.

这正是我们需要关联的单元：

- 一条用户消息
- 触发的所有 AI 响应事件（stream）
- 包含的 tool_call / tool_result 循环
- 直到响应结束

### 类比理解

这个 ID 本质是 **Agent 主体视角的时序标识**：

- **人类**：一个一个感知外界刺激，顺序处理
- **CPU**：一条一条执行指令，顺序处理
- **Agent**：一个一个接收输入（turn），顺序处理

```
Agent 时间线：
─────────────────────────────────────────────────►
    │           │           │           │
    ▼           ▼           ▼           ▼
  turn₁      turn₂      turn₃      turn₄
```

## 方案

### 统一使用 `turnId`

将 `EnvironmentEvent` 的 `requestId` 改为 `turnId`，与 `RuntimeEvent` 统一。

### 事件流

```
┌─────────────────────────────────────────────────────────────┐
│                    Turn 生命周期 (turnId: "turn_xxx")        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Agent              Effector              Receptor          │
│    │                   │                     │              │
│    │ 1. 生成 turnId    │                     │              │
│    │──────────────────►│                     │              │
│    │ user_message      │                     │              │
│    │ {turnId}          │                     │              │
│    │                   │ 2. → Claude SDK     │              │
│    │                   │─────────────────────►              │
│    │                   │ (携带 turnId)       │              │
│    │                   │                     │              │
│    │◄────────────────────────────────────────│ 3. 响应      │
│    │                   │                     │ message_start│
│    │◄────────────────────────────────────────│ {turnId}     │
│    │                   │                     │ text_delta   │
│    │◄────────────────────────────────────────│ {turnId}     │
│    │                   │                     │              │
└─────────────────────────────────────────────────────────────┘
```

### 改动点

1. **types/EnvironmentEvent.ts**: `requestId` → `turnId`
2. **types/DriveableEvent.ts**: 所有事件的 `requestId` → `turnId`
3. **ClaudeReceptor**: 接收 `turnId`，附加到输出事件
4. **ClaudeEffector**: 从 `user_message` 事件获取 `turnId`，传递给 Receptor

### Effector → Receptor 传递机制

需要设计 Effector 如何将 `turnId` 传递给 Receptor：

**方案 A**: Receptor 构造时注入 callback，Effector 调用设置当前 turnId
**方案 B**: 共享 context 对象
**方案 C**: Effector 和 Receptor 合并为一个类（ClaudeEnvironment 内部管理）

推荐方案 C，因为 Effector 和 Receptor 本就是紧密耦合的（一个发请求，一个收响应）。

## 多智能体场景

在多智能体场景下：

```
Human → Agent A → Agent B → LLM
       └─ turnA ─┘
                 └─ turnB ─┘
```

每个 Agent 有自己的 turn，各自独立。Agent A 调用 Agent B 时，对 Agent B 来说就是一个新的 turn。

## 状态

- [ ] 更新 types 定义
- [ ] 更新 ClaudeEnvironment 实现
- [ ] 更新 Mirror 包（如需要）
- [ ] 更新测试

## 相关

- `packages/types/src/ecosystem/event/environment/EnvironmentEvent.ts`
- `packages/types/src/ecosystem/event/runtime/agent/turn/index.ts`
- `packages/node-ecosystem/src/environment/ClaudeReceptor.ts`
- `packages/node-ecosystem/src/environment/ClaudeEffector.ts`
