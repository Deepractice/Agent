# SystemBus Producer/Consumer 重构计划

## 目标

将 SystemBus 改造成有向的 Producer/Consumer 架构，解决：

1. 发送端收到自己消息的问题
2. BusDriver 的竞态条件问题
3. 代码职责不清晰的问题

**重要：这是内部重构，不影响外部 API**

## 架构变更

### 当前架构（无向）

```
SystemBus (无向总线)
    ↕ emit + on (所有组件都能读写)
    │
┌───┼─────┬─────┬──────┬─────┐
│   │     │     │      │     │
Agent  Effector Receptor Container Session
```

**问题：**

- ❌ 组件会收到自己发的消息
- ❌ emit 和 on 时序导致竞态条件
- ❌ 职责不清（哪些是生产者？哪些是消费者？）

### 新架构（有向）

```
SystemBus (有向总线)
    ↓ asProducer() → SystemBusProducer (只能 emit)
    ↓ asConsumer() → SystemBusConsumer (只能 on)
    │
┌───┼─────────────────────────────┐
│   │                             │
│ Producer (只发送)    Consumer (只接收)
│   │                             │
│ Receptor             Effector   │
│ Container            BusDriver  │
│ Session                         │
│ RuntimeAgent                    │
└─────────────────────────────────┘
```

**优势：**

- ✅ Producer 只能 emit，不会收到消息
- ✅ Consumer 只能 on，不会发送消息
- ✅ 职责清晰，编译时检查
- ✅ 避免事件循环

## 组件重构计划

### 1. 纯生产者（只需要 SystemBusProducer）

| 组件                          | 当前        | 改为                | 发送事件                                                                     |
| ----------------------------- | ----------- | ------------------- | ---------------------------------------------------------------------------- |
| **ClaudeReceptor**            | `SystemBus` | `SystemBusProducer` | message_start, text_delta, message_stop, interrupted                         |
| **RuntimeContainer**          | `SystemBus` | `SystemBusProducer` | container_created, container_destroyed, agent_registered, agent_unregistered |
| **RuntimeSession**            | `SystemBus` | `SystemBusProducer` | session_created, message_persisted                                           |
| **RuntimeAgent/BusPresenter** | `SystemBus` | `SystemBusProducer` | interrupted, session_resumed, session_destroyed                              |
| **BaseEventHandler**          | `SystemBus` | `SystemBusProducer` | system_error                                                                 |

### 2. 纯消费者（只需要 SystemBusConsumer）

| 组件               | 当前        | 改为                | 订阅事件                |
| ------------------ | ----------- | ------------------- | ----------------------- |
| **ClaudeEffector** | `SystemBus` | `SystemBusConsumer` | user_message, interrupt |

### 3. 双向组件（需要两个参数）

| 组件               | 当前        | 改为                                                           | 原因                                              |
| ------------------ | ----------- | -------------------------------------------------------------- | ------------------------------------------------- |
| **BusDriver**      | `SystemBus` | `producer: SystemBusProducer`<br>`consumer: SystemBusConsumer` | 需要 emit user_message，也需要 on DriveableEvents |
| **CommandHandler** | `SystemBus` | `producer: SystemBusProducer`<br>`consumer: SystemBusConsumer` | 需要 on _\_request，也需要 emit _\_response       |

### 4. 创建组件（保持完整 SystemBus）

| 组件            | 当前        | 改为        | 原因                                  |
| --------------- | ----------- | ----------- | ------------------------------------- |
| **RuntimeImpl** | `SystemBus` | `SystemBus` | 需要创建 producer/consumer 传给子组件 |

## 实施步骤

### Phase 1: 接口定义 ✅ 已完成

- [x] 创建 `SystemBusProducer` 接口
- [x] 创建 `SystemBusConsumer` 接口
- [x] 在 `SystemBus` 中添加 `asProducer()` 和 `asConsumer()` 方法
- [x] 在 `SystemBusImpl` 中实现 `asProducer()` 和 `asConsumer()`

### Phase 2: 纯生产者重构

#### 2.1 ClaudeReceptor

**修改文件：** `packages/runtime/src/environment/ClaudeReceptor.ts`

```diff
- constructor(private readonly bus: SystemBus) {}
+ constructor(private readonly producer: SystemBusProducer) {}

  private handleEvent(event: SomeEvent) {
-   this.bus.emit({ type: 'text_delta', ... });
+   this.producer.emit({ type: 'text_delta', ... });
  }
```

**调用处修改：** `packages/runtime/src/environment/ClaudeEnvironment.ts`

```diff
  constructor(bus: SystemBus, config: ClaudeEnvironmentConfig) {
-   this.receptor = new ClaudeReceptor(bus);
+   this.receptor = new ClaudeReceptor(bus.asProducer());
  }
```

#### 2.2 RuntimeContainer

**修改文件：** `packages/runtime/src/internal/RuntimeContainer.ts`

```diff
- constructor(bus: SystemBus, ...) {}
+ constructor(producer: SystemBusProducer, ...) {}

  async create(config: AgentConfig) {
-   this.bus.emit({ type: 'container_created', ... });
+   this.producer.emit({ type: 'container_created', ... });
  }
```

#### 2.3 RuntimeSession

**修改文件：** `packages/runtime/src/internal/RuntimeSession.ts`

```diff
- constructor(bus: SystemBus, ...) {}
+ constructor(producer: SystemBusProducer, ...) {}

  async addMessage(message: Message) {
-   this.bus.emit({ type: 'message_persisted', ... });
+   this.producer.emit({ type: 'message_persisted', ... });
  }
```

#### 2.4 RuntimeAgent/BusPresenter

**修改文件：** `packages/runtime/src/internal/RuntimeAgent.ts`

```diff
  class BusPresenter implements AgentPresenter {
-   constructor(private readonly bus: SystemBus, ...) {}
+   constructor(private readonly producer: SystemBusProducer, ...) {}

    present(agentId: string, output: AgentOutput): void {
-     this.bus.emit(systemEvent);
+     this.producer.emit(systemEvent);
    }
  }

  constructor(config: RuntimeAgentConfig) {
-   const presenter = new BusPresenter(config.bus, ...);
+   const presenter = new BusPresenter(config.bus.asProducer(), ...);
  }
```

#### 2.5 BaseEventHandler

**修改文件：** `packages/runtime/src/internal/BaseEventHandler.ts`

```diff
- constructor(protected readonly bus: SystemBus) {}
+ constructor(protected readonly producer: SystemBusProducer) {}

  protected safeHandle(handler: () => void, errorContext: ErrorContext) {
    try {
      handler();
    } catch (error) {
-     this.bus.emit({ type: 'system_error', ... });
+     this.producer.emit({ type: 'system_error', ... });
    }
  }
```

### Phase 3: 纯消费者重构

#### 3.1 ClaudeEffector

**修改文件：** `packages/runtime/src/environment/ClaudeEffector.ts`

```diff
- constructor(private readonly bus: SystemBus, ...) {}
+ constructor(private readonly consumer: SystemBusConsumer, ...) {}

  start() {
-   this.bus.on('user_message', (event) => { ... });
+   this.consumer.on('user_message', (event) => { ... });
-   this.bus.on('interrupt', (event) => { ... });
+   this.consumer.on('interrupt', (event) => { ... });
  }
```

**调用处修改：** `packages/runtime/src/environment/ClaudeEnvironment.ts`

```diff
  constructor(bus: SystemBus, config: ClaudeEnvironmentConfig) {
-   this.effector = new ClaudeEffector(bus, ...);
+   this.effector = new ClaudeEffector(bus.asConsumer(), ...);
  }
```

### Phase 4: 双向组件重构

#### 4.1 BusDriver（重要！解决竞态条件）

**修改文件：** `packages/runtime/src/internal/BusDriver.ts`

```diff
  export class BusDriver implements AgentDriver {
-   constructor(bus: SystemBus, config: BusDriverConfig) {
-     this.bus = bus;
+   constructor(
+     consumer: SystemBusConsumer,
+     producer: SystemBusProducer,
+     config: BusDriverConfig
+   ) {
+     this.consumer = consumer;
+     this.producer = producer;
      this.config = config;
    }

    async *receive(message: UserMessage): AsyncIterable<StreamEvent> {
      // 使用 AsyncQueue 解决竞态条件
      const queue = new AsyncQueue<DriveableEvent>();

-     const unsubscribe = this.bus.onAny((event) => {
+     const unsubscribe = this.consumer.onAny((event) => {
        if (!this.isDriveableEvent(event)) return;
        queue.push(event);
        if (event.type === "message_stop") {
          queue.close();
        }
      });

      // 发送用户消息
-     this.bus.emit({ type: "user_message", data: message } as never);
+     this.producer.emit({ type: "user_message", data: message } as never);

      // 从队列读取（无竞态条件）
      try {
        for await (const event of queue) {
          yield this.toStreamEvent(event);
        }
      } finally {
        unsubscribe();
      }
    }

    interrupt(): void {
-     this.bus.emit({ type: "interrupt", ... } as never);
+     this.producer.emit({ type: "interrupt", ... } as never);
    }
  }
```

**AsyncQueue 实现：** 需要创建 `packages/runtime/src/internal/AsyncQueue.ts`

```typescript
export class AsyncQueue<T> {
  private buffer: T[] = [];
  private waiting: ((value: IteratorResult<T>) => void)[] = [];
  private closed = false;

  push(item: T): void {
    if (this.closed) return;

    // 关键：有等待者直接交付，没有则入队
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      resolve({ done: false, value: item });
    } else {
      this.buffer.push(item);
    }
  }

  close(): void {
    this.closed = true;
    for (const resolve of this.waiting) {
      resolve({ done: true, value: undefined as any });
    }
    this.waiting = [];
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    while (true) {
      if (this.buffer.length > 0) {
        yield this.buffer.shift()!;
      } else if (this.closed) {
        break;
      } else {
        const result = await new Promise<IteratorResult<T>>((resolve) => {
          this.waiting.push(resolve);
        });
        if (result.done) break;
        yield result.value;
      }
    }
  }
}
```

**调用处修改：** `packages/runtime/src/internal/RuntimeAgent.ts`

```diff
  constructor(config: RuntimeAgentConfig) {
-   this.driver = new BusDriver(config.bus, { agentId: this.agentId });
+   this.driver = new BusDriver(
+     config.bus.asConsumer(),
+     config.bus.asProducer(),
+     { agentId: this.agentId }
+   );
  }
```

#### 4.2 CommandHandler

**修改文件：** `packages/runtime/src/internal/CommandHandler.ts`

```diff
  export class CommandHandler {
-   constructor(private readonly bus: SystemBus, ...) {}
+   constructor(
+     private readonly consumer: SystemBusConsumer,
+     private readonly producer: SystemBusProducer,
+     ...
+   ) {}

    start() {
-     this.bus.on('container_create_request', async (event) => {
+     this.consumer.on('container_create_request', async (event) => {
        const result = await this.handleContainerCreate(event);
-       this.bus.emit({ type: 'container_create_response', data: result });
+       this.producer.emit({ type: 'container_create_response', data: result });
      });
    }
  }
```

**调用处修改：** `packages/runtime/src/RuntimeImpl.ts`

```diff
  constructor(config: RuntimeConfig) {
-   this.commandHandler = new CommandHandler(this.bus, ...);
+   this.commandHandler = new CommandHandler(
+     this.bus.asConsumer(),
+     this.bus.asProducer(),
+     ...
+   );
  }
```

### Phase 5: 测试验证

创建测试验证 Producer/Consumer 分离：

```typescript
// packages/runtime/tests/SystemBus.test.ts
describe('SystemBus Producer/Consumer', () => {
  it('Producer 只能 emit，不能 on', () => {
    const bus = new SystemBusImpl();
    const producer = bus.asProducer();

    // ✅ 可以 emit
    producer.emit({ type: 'test', ... });

    // ❌ 不能 on（TypeScript 编译错误）
    // producer.on('test', () => {});  // 编译失败
  });

  it('Consumer 只能 on，不能 emit', () => {
    const bus = new SystemBusImpl();
    const consumer = bus.asConsumer();

    // ✅ 可以 on
    consumer.on('test', () => {});

    // ❌ 不能 emit（TypeScript 编译错误）
    // consumer.emit({ type: 'test', ... });  // 编译失败
  });

  it('解决竞态条件问题', async () => {
    const bus = new SystemBusImpl();
    const consumer = bus.asConsumer();
    const producer = bus.asProducer();

    const events: SystemEvent[] = [];
    const queue = new AsyncQueue<SystemEvent>();

    // 1. 先订阅
    consumer.onAny((event) => {
      events.push(event);
      queue.push(event);
    });

    // 2. 再发送
    producer.emit({ type: 'test1', ... });
    producer.emit({ type: 'test2', ... });
    queue.close();

    // 3. 验证所有事件都收到了
    const collected = [];
    for await (const event of queue) {
      collected.push(event);
    }

    expect(collected).toHaveLength(2);
    expect(events).toEqual(collected);
  });
});
```

## 影响范围

### 修改文件列表（共 9 个）

| 文件                   | 类型      | 工作量                |
| ---------------------- | --------- | --------------------- |
| `SystemBus.ts`         | ✅ 已完成 | 添加接口              |
| `SystemBusProducer.ts` | ✅ 已完成 | 新增接口              |
| `SystemBusConsumer.ts` | ✅ 已完成 | 新增接口              |
| `SystemBusImpl.ts`     | ✅ 已完成 | 实现方法              |
| `BusDriver.ts`         | 🔄 待修改 | 大（需要 AsyncQueue） |
| `ClaudeReceptor.ts`    | 🔄 待修改 | 小                    |
| `ClaudeEffector.ts`    | 🔄 待修改 | 小                    |
| `ClaudeEnvironment.ts` | 🔄 待修改 | 小（调用处）          |
| `RuntimeAgent.ts`      | 🔄 待修改 | 小                    |
| `RuntimeContainer.ts`  | 🔄 待修改 | 小                    |
| `RuntimeSession.ts`    | 🔄 待修改 | 小                    |
| `CommandHandler.ts`    | 🔄 待修改 | 中                    |
| `BaseEventHandler.ts`  | 🔄 待修改 | 小                    |
| `RuntimeImpl.ts`       | 🔄 待修改 | 小（调用处）          |
| `AsyncQueue.ts`        | ✅ 待创建 | 中（新增工具类）      |

### 外部 API 影响

**完全无影响！**

```typescript
// 用户代码（完全不变）
const runtime = createRuntime({ persistence });

// ✅ Runtime 仍然实现 SystemBus 接口
runtime.on('text_delta', (e) => console.log(e.data.text));

// ✅ request 方法仍然可用
await runtime.request('agent_run_request', { ... });
```

## 预期收益

1. **✅ 解决发送端循环问题**
   - Producer 只能 emit，TypeScript 编译时阻止 on

2. **✅ 解决 BusDriver 竞态条件**
   - 使用 AsyncQueue 正确处理 push/pull 时序

3. **✅ 代码职责清晰**
   - 一眼看出谁是生产者，谁是消费者

4. **✅ 更好的类型安全**
   - TypeScript 编译时检查，防止误用

5. **✅ 向 main 分支架构靠拢**
   - 保持与主线架构一致

## 风险评估

| 风险         | 等级 | 缓解措施                       |
| ------------ | ---- | ------------------------------ |
| 组件修改量大 | 低   | 每个组件改动都很小，模式统一   |
| 引入新 bug   | 低   | AsyncQueue 有完整测试          |
| 破坏外部 API | 无   | 纯内部重构                     |
| 性能影响     | 无   | asProducer/asConsumer 是缓存的 |

## 执行时间表

| 阶段                  | 时间      | 负责人 |
| --------------------- | --------- | ------ |
| Phase 1: 接口定义     | ✅ 已完成 | Claude |
| Phase 2: 纯生产者重构 | 2小时     | 待定   |
| Phase 3: 纯消费者重构 | 1小时     | 待定   |
| Phase 4: 双向组件重构 | 3小时     | 待定   |
| Phase 5: 测试验证     | 2小时     | 待定   |
| **总计**              | **8小时** |        |

## 结论

这是一个**内部重构**，完全不影响外部 API。通过引入 Producer/Consumer 分离：

1. ✅ 从根本上解决了事件循环问题
2. ✅ 彻底修复了 BusDriver 的竞态条件
3. ✅ 提高了代码可维护性和类型安全
4. ✅ 向 main 分支架构对齐

风险低，收益高，建议立即执行。
