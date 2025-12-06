# AgentX API Design

> User-facing API type definitions for agentxjs

## createAgentX

统一的工厂函数，通过配置类型区分 Source 和 Mirror 模式。

### 类型区分

```typescript
createAgentX();                          // Source (无配置)
createAgentX({ apiKey: "..." });         // Source (无 serverUrl)
createAgentX({ serverUrl: "ws://..." }); // Mirror (有 serverUrl)
```

### 配置类型

```typescript
// Server-side
interface SourceConfig {
  apiKey?: string;           // Default: process.env.ANTHROPIC_API_KEY
  model?: string;            // Default: "claude-sonnet-4-20250514"
  baseUrl?: string;          // Default: "https://api.anthropic.com"
  persistence?: Persistence;
}

// Browser-side
interface MirrorConfig {
  serverUrl: string;         // e.g., "ws://localhost:5200"
  token?: string;
  headers?: Record<string, string>;
}

// 联合类型，通过 serverUrl 字段区分
type AgentXConfig = SourceConfig | MirrorConfig;
```

### Type Guards

```typescript
function isMirrorConfig(config: AgentXConfig): config is MirrorConfig;
function isSourceConfig(config: AgentXConfig): config is SourceConfig;
```

### Factory Function Type

```typescript
type CreateAgentX = {
  (): AgentX;
  (config: AgentXConfig): AgentX;
};
```

---

## defineAgent

独立函数，将 AgentDefinition 转换为 AgentConfig。

```typescript
import { defineAgent, createAgentX } from "agentxjs";

const config = defineAgent({
  name: "Assistant",
  systemPrompt: "You are helpful",
});

const agentx = createAgentX();
const container = await agentx.containers.create();
const agent = await agentx.agents.run(container.id, config);
```

### 类型定义

```typescript
// 用户定义（静态描述）
interface AgentDefinition {
  name: string;
  systemPrompt?: string;
  description?: string;
}

// 运行配置（暂定与 AgentDefinition 相同，后续迭代）
interface AgentConfig {
  name: string;
  systemPrompt?: string;
  description?: string;
}

// 转换函数
function defineAgent(definition: AgentDefinition): AgentConfig;
```

---

## AgentX

主接口，通过子 API 操作资源。

```typescript
interface AgentX {
  readonly containers: ContainersAPI;
  readonly agents: AgentsAPI;
  readonly images: ImagesAPI;

  on(type: string, handler: (event: EnvironmentEvent) => void): Unsubscribe;
  onAll(handler: (event: EnvironmentEvent) => void): Unsubscribe;

  dispose(): Promise<void>;
}
```

---

## ContainersAPI

```typescript
interface ContainersAPI {
  create(): Promise<Container>;                    // 内部生成 id
  get(containerId: string): Container | undefined;
  list(): Container[];
}
```

---

## AgentsAPI

```typescript
interface AgentsAPI {
  run(containerId: string, config: AgentConfig): Promise<Agent>;
  get(agentId: string): Agent | undefined;
  list(): Agent[];                                 // 所有 agents
  list(containerId: string): Agent[];              // 指定 container 的 agents
  destroy(agentId: string): Promise<boolean>;
}
```

---

## ImagesAPI

```typescript
interface ImagesAPI {
  snapshot(agentId: string): Promise<AgentImage>;
  get(imageId: string): Promise<AgentImage | null>;
  list(): Promise<AgentImage[]>;
  delete(imageId: string): Promise<void>;
}

interface AgentImage {
  readonly id: string;
  readonly agentId: string;
  // ... 其他属性
  resume(): Promise<Agent>;
}
```

---

## 使用示例

```typescript
import { defineAgent, createAgentX } from "agentxjs";

// 1. 定义 agent
const config = defineAgent({
  name: "Assistant",
  systemPrompt: "You are helpful",
});

// 2. 创建 agentx
const agentx = createAgentX();

// 3. 监听事件
agentx.on("text_delta", (e) => console.log(e.data.text));

// 4. 创建 container
const container = await agentx.containers.create();

// 5. 运行 agent
const agent = await agentx.agents.run(container.id, config);

// 6. 发送消息
await agent.receive("Hello!");

// 7. 快照
const image = await agentx.images.snapshot(agent.id);

// 8. 恢复
const restored = await image.resume();

// 9. 清理
await agentx.dispose();
```
