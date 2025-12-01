<div align="center">
  <h1>AgentX · Docker 风格的 Agent 运行时</h1>
  <p>
    <strong>像管理容器一样管理 AI Agent - 支持对话的提交、恢复、分支</strong>
  </p>
  <p>
    <strong>亮点：</strong>Docker 风格生命周期 | 4 层事件系统 | 同构架构
  </p>

  <hr/>

  <p>
    <a href="https://github.com/Deepractice/Agent"><img src="https://img.shields.io/github/stars/Deepractice/Agent?style=social" alt="Stars"/></a>
    <img src="https://komarev.com/ghpvc/?username=Agent&label=views&color=0e75b6&style=flat&abbreviated=true" alt="Views"/>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/Deepractice/Agent?color=blue" alt="License"/></a>
    <a href="https://www.npmjs.com/package/@deepractice-ai/agentx"><img src="https://img.shields.io/npm/v/@deepractice-ai/agentx?color=cb3837&logo=npm" alt="npm"/></a>
  </p>

  <p>
    <a href="README.md">English</a> |
    <a href="README.zh-CN.md"><strong>简体中文</strong></a>
  </p>
</div>

---

## AgentX 是什么？

AgentX 是一个 **AI Agent 运行时框架**，将 Docker 风格的生命周期管理带入 AI Agent 领域。

```typescript
import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
import { runtime } from "@deepractice-ai/agentx-node";

// 1. 定义你的 Agent（类似 Dockerfile）
const TranslatorAgent = defineAgent({
  name: "Translator",
  systemPrompt: "你是一个专业翻译。",
});

// 2. 创建平台实例
const agentx = createAgentX(runtime);

// 3. 注册并运行
agentx.definitions.register(TranslatorAgent);
const image = await agentx.images.getMetaImage("Translator");
const session = await agentx.sessions.create(image.imageId, "user-1");
const agent = await session.resume();

// 4. 订阅事件并对话
agent.react({
  onTextDelta: (e) => process.stdout.write(e.data.text),
  onAssistantMessage: (e) => console.log("\n[完成]"),
});

await agent.receive("把 'Hello' 翻译成日语");
```

---

## 为什么选择 AgentX？

| 挑战                      | AgentX 解决方案                                 |
| ------------------------- | ----------------------------------------------- |
| Agent 状态转瞬即逝        | **Docker 风格镜像** - 提交、恢复、分支对话      |
| Server/Browser 代码不一致 | **同构架构** - 同一套 API 到处运行              |
| 流式事件难以追踪          | **4 层事件系统** - Stream、State、Message、Turn |
| 异步状态管理复杂          | **Mealy Machine** - 纯函数式事件处理            |

---

## 核心概念

### Docker 风格生命周期

```text
AgentDefinition ──register──▶ MetaImage ──create──▶ Session + Agent
      │                           │                        │
   (源码)                      (创世镜像)                (运行中)
                                  │                        │
                                  │◀──────commit───────────┘
                                  │
                            DerivedImage ──fork──▶ New Session
                              (快照)
```

| Docker          | AgentX                       | 说明               |
| --------------- | ---------------------------- | ------------------ |
| Dockerfile      | `defineAgent()`              | 源码模板           |
| Image           | `MetaImage` / `DerivedImage` | 构建产物，冻结状态 |
| Container       | `Session` + `Agent`          | 运行实例           |
| `docker commit` | `session.commit()`           | 保存当前状态       |
| `docker run`    | `session.resume()`           | 从镜像启动         |

### 4 层事件架构

```text
Driver.receive()
       │ yields
       ▼
┌─────────────────────────────────────────────────────────┐
│ L1: Stream 层（实时增量）                                │
│ message_start → text_delta* → tool_call → message_stop  │
└────────────────────────┬────────────────────────────────┘
                         │ Mealy Machine
                         ▼
┌─────────────────────────────────────────────────────────┐
│ L2: State 层（状态转换）                                 │
│ thinking → responding → tool_executing → conversation_end│
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ L3: Message 层（完整消息）                               │
│ user_message, assistant_message, tool_call_message      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ L4: Turn 层（分析统计）                                  │
│ turn_request → turn_response { duration, tokens, cost } │
└─────────────────────────────────────────────────────────┘
```

每层服务不同的消费者：

| 层级    | 消费者   | 用途                 |
| ------- | -------- | -------------------- |
| Stream  | UI       | 打字机效果、实时显示 |
| State   | 状态机   | 加载指示器、进度追踪 |
| Message | 聊天历史 | 持久化、对话展示     |
| Turn    | 分析系统 | 计费、用量统计、性能 |

### 同构架构

同一套业务代码运行在 Server 和 Browser：

```text
┌─────────────────────────────────────────────────────────┐
│              应用代码（完全相同）                         │
│   const agentx = createAgentX(runtime);                 │
│   agentx.definitions.register(MyAgent);                 │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│   Server Runtime    │       │   Browser Runtime   │
│   SQLiteRepository  │       │   RemoteRepository  │
│   ClaudeDriver      │       │   SSEDriver         │
└─────────────────────┘       └─────────────────────┘
```

---

## 安装

```bash
# 核心框架
npm install @deepractice-ai/agentx

# Node.js 运行时（Server）
npm install @deepractice-ai/agentx-node

# React UI 组件（可选）
npm install @deepractice-ai/agentx-ui
```

---

## 快速开始

### 基础用法（Node.js）

```typescript
import { defineAgent, createAgentX } from "@deepractice-ai/agentx";
import { runtime } from "@deepractice-ai/agentx-node";

const agentx = createAgentX(runtime);

// 定义并注册 Agent
const MyAgent = defineAgent({
  name: "Assistant",
  systemPrompt: "你是一个有帮助的助手。",
});
agentx.definitions.register(MyAgent);

// 创建会话并开始对话
const image = await agentx.images.getMetaImage("Assistant");
const session = await agentx.sessions.create(image.imageId, "user-1");
const agent = await session.resume();

// React 风格事件订阅
agent.react({
  onTextDelta: (e) => process.stdout.write(e.data.text),
  onToolCall: (e) => console.log(`工具: ${e.data.name}`),
  onError: (e) => console.error(e.data.message),
});

await agent.receive("你好！");

// 保存对话状态
await session.commit();
```

### 事件订阅模式

```typescript
// 模式 1: React 风格（推荐）
agent.react({
  onTextDelta: (e) => {},
  onAssistantMessage: (e) => {},
  onToolCall: (e) => {},
});

// 模式 2: 类型安全的单事件订阅
agent.on("text_delta", (e) => {
  console.log(e.data.text); // TypeScript 自动推断类型
});

// 模式 3: 批量订阅
agent.on({
  text_delta: (e) => {},
  assistant_message: (e) => {},
  error: (e) => {},
});

// 模式 4: 所有事件
agent.on((event) => {
  console.log(event.type, event.data);
});
```

### 会话管理

```typescript
// 从之前的会话恢复
const session = await agentx.sessions.get(sessionId);
const agent = await session.resume();

// 分支对话（fork）
const forkedSession = await session.fork();
const forkedAgent = await forkedSession.resume();

// 列出用户的会话
const sessions = await agentx.sessions.list({ userId: "user-1" });
```

### 浏览器集成（SSE）

```typescript
// 浏览器客户端连接到 AgentX 服务器
import { createAgentX } from "@deepractice-ai/agentx";
import { sseRuntime } from "@deepractice-ai/agentx/browser";

const agentx = createAgentX(
  sseRuntime({
    serverUrl: "http://localhost:5200",
  })
);

// 和服务端一样的 API！
const session = await agentx.sessions.create(imageId, userId);
const agent = await session.resume();

agent.react({
  onTextDelta: (e) => setStreamingText((prev) => prev + e.data.text),
  onAssistantMessage: (e) => setMessages((prev) => [...prev, e.data]),
});
```

---

## 包列表

| 包                              | 说明                                          |
| ------------------------------- | --------------------------------------------- |
| `@deepractice-ai/agentx-types`  | 类型定义（140+ 文件，零依赖）                 |
| `@deepractice-ai/agentx-adk`    | Agent 开发工具包（defineAgent, defineDriver） |
| `@deepractice-ai/agentx-logger` | SLF4J 风格日志门面                            |
| `@deepractice-ai/agentx-engine` | Mealy Machine 事件处理器                      |
| `@deepractice-ai/agentx-agent`  | Agent 运行时核心                              |
| `@deepractice-ai/agentx`        | 平台 API（统一入口）                          |
| `@deepractice-ai/agentx-node`   | Node.js 运行时（Claude 驱动, SQLite）         |
| `@deepractice-ai/agentx-ui`     | React UI 组件                                 |

---

## 立即体验（Docker）

想看看 AgentX 的实际效果？运行演示：

```bash
docker run -d \
  --name agentx \
  -p 5200:5200 \
  -e ANTHROPIC_API_KEY=sk-ant-xxxxx \
  deepracticexs/agent:latest
```

打开 <http://localhost:5200> - 完整功能的 AI Agent 可视化界面。

---

## 文档

- **[架构指南](./CLAUDE.md)** - 深入了解系统设计
- **[API 参考](./packages/agentx/README.md)** - 平台 API 文档
- **[类型系统](./packages/agentx-types/README.md)** - 完整类型定义

---

## 路线图

- [x] Docker 风格生命周期（Definition → Image → Session）
- [x] 4 层事件系统
- [x] Server/Browser 同构架构
- [x] Claude 驱动
- [ ] OpenAI 驱动
- [ ] 本地 LLM 支持（Ollama）
- [ ] 多 Agent 编排
- [ ] 插件系统

---

## 贡献

```bash
# 克隆并安装
git clone https://github.com/Deepractice/Agent.git
cd Agent
pnpm install

# 开发
pnpm dev

# 构建所有包
pnpm build

# 类型检查
pnpm typecheck
```

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## 许可证

MIT - 见 [LICENSE](./LICENSE)

---

<div align="center">
  <p>
    由 <a href="https://github.com/Deepractice">Deepractice</a> 用心构建
  </p>
  <p>
    <strong>让 AI Agent 开发变得简单</strong>
  </p>
</div>
