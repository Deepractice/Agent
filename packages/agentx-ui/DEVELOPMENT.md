# AgentX UI Development Guide

## 🎯 Philosophy: Real-World Testing

**We develop UI components in a REAL environment, not with mocked data.**

This means:
- ✅ Real WebSocket connections to actual Claude API
- ✅ Real streaming responses
- ✅ Real error handling
- ✅ Real latency and network conditions
- ❌ No mocks, no fake data, no simulations

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         Browser (Storybook)                     │
│  ┌──────────────────────────────────────────┐  │
│  │  Story Component                          │  │
│  │  ↓                                        │  │
│  │  agentx-browser (WebSocket Client)       │  │
│  └────────────────┬─────────────────────────┘  │
└─────────────────────┼─────────────────────────┘
                     │
                     │ ws://localhost:5200/ws
                     │
┌────────────────────┼──────────────────────────┐
│                    ▼                          │
│  agentx-node (WebSocket Server)              │
│  ↓                                            │
│  Claude API (Real AI responses)              │
└───────────────────────────────────────────────┘
```

## 🚀 Development Workflow

### Step 1: Start Development Server

The dev server provides a real WebSocket endpoint connected to Claude API with hot-reload:

```bash
cd packages/agentx-ui
pnpm dev:server
```

This starts:
- WebSocket Server on `ws://localhost:5200/ws`
- Connected to real Claude API
- With logging enabled for debugging
- 🔥 **Auto-reload**: Watches agentx-node changes, rebuilds and restarts automatically
- WebSocket clients auto-reconnect on restart

**Output:**
```
🚀 Starting AgentX Development Server...

✅ WebSocket Server Started
   URL: ws://0.0.0.0:5200/ws

📦 Agent Info:
   ID: agent-xxx
   Session: session-xxx

💡 Ready for UI development!
   Run 'pnpm storybook' in another terminal
```

### Step 2: Start Storybook

In another terminal:

```bash
cd packages/agentx-ui
pnpm storybook
```

This starts:
- Storybook on `http://localhost:6006`
- Hot Module Replacement (HMR) enabled
- All components available for testing

### Step 3: Run Both Together (Recommended)

Use the combined command:

```bash
cd packages/agentx-ui
pnpm dev:full
```

This runs both server and Storybook concurrently.

## 📝 Writing Stories with Real Data

### Basic Pattern

```typescript
// MyComponent.stories.tsx
import { createAgent } from '@deepractice-ai/agentx-browser'
import { useEffect, useState } from 'react'
import { MyComponent } from './MyComponent'

export default {
  title: 'Components/MyComponent',
  component: MyComponent,
}

export const WithRealAgent = () => {
  const [agent] = useState(() =>
    createAgent({
      wsUrl: 'ws://localhost:5200/ws',
      sessionId: `story-${Date.now()}`,
    })
  )

  const [messages, setMessages] = useState([])

  useEffect(() => {
    // Listen to real events
    const unsubscribe = agent.on('assistant', (event) => {
      setMessages(prev => [...prev, event.message])
    })

    return () => {
      unsubscribe()
      agent.destroy()
    }
  }, [agent])

  return <MyComponent messages={messages} agent={agent} />
}
```

### Advanced: With Logging

```typescript
export const WithLogging = () => {
  const [agent] = useState(() =>
    createAgent(
      {
        wsUrl: 'ws://localhost:5200/ws',
        sessionId: `story-debug-${Date.now()}`,
      },
      {
        enableLogging: true,
        loggerTag: 'Story',
        logLevel: 'debug',
      }
    )
  )

  // Component implementation...
}
```

### Real Chat Example

```typescript
// ChatInterface.stories.tsx
import { createAgent } from '@deepractice-ai/agentx-browser'
import { useState, useEffect } from 'react'
import { ChatInterface } from './ChatInterface'

export const LiveChat = () => {
  const [agent] = useState(() =>
    createAgent({
      wsUrl: 'ws://localhost:5200/ws',
      sessionId: `chat-${Date.now()}`,
    })
  )

  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Stream chunks
    const unsubStream = agent.on('stream_event', (event) => {
      if (event.delta?.type === 'text_delta') {
        setStreaming(prev => prev + event.delta.text)
      }
    })

    // Complete messages
    const unsubAssistant = agent.on('assistant', (event) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: streaming,
      }])
      setStreaming('')
      setIsLoading(false)
    })

    // User messages
    const unsubUser = agent.on('user', (event) => {
      setMessages(prev => [...prev, event.message])
    })

    return () => {
      unsubStream()
      unsubAssistant()
      unsubUser()
      agent.destroy()
    }
  }, [agent])

  const handleSend = async (text: string) => {
    setIsLoading(true)
    await agent.send(text)
  }

  return (
    <ChatInterface
      messages={messages}
      streaming={streaming}
      isLoading={isLoading}
      onSend={handleSend}
    />
  )
}
```

## 🎨 Benefits of This Approach

### 1. **Real Behavior**
- See actual streaming speed
- Experience real network delays
- Catch edge cases (connection drops, timeouts)
- Test with actual Claude responses (not predictable mocks)

### 2. **Immediate Feedback**
- UI responds to real events
- See actual error messages
- Test loading states naturally
- Validate UX with real data

### 3. **E2E Validation**
- Full stack working together
- WebSocket protocol verified
- Event handling tested
- Integration issues caught early

### 4. **Better Developer Experience**
- No need to maintain mock data
- Stories reflect production behavior
- Easier to debug (real logs)
- Confidence in what you build

## 🔧 Configuration

### Environment Variables

Create `.env.local` in `packages/agentx-ui`:

```bash
ANTHROPIC_API_KEY=sk-ant-xxx
```

### Server Configuration

Edit `dev-tools/server/dev-server.ts` to customize:

```typescript
const agent = createAgent(
  {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-sonnet-4-20250514',
    systemPrompt: 'Custom system prompt for testing',
  },
  {
    enableLogging: true,    // Show request/response logs
    prettyLogs: true,       // Colored output
    logLevel: 'debug',      // Verbose logging
  }
)

const wsServer = createWebSocketServer({
  agent,
  port: 5200,              // WebSocket port
  host: '0.0.0.0',        // Bind address
})
```

## 🐛 Debugging

### View Server Logs

The dev server shows all events:

```
[Agent] User message: "Hello"
[Agent] Assistant thinking...
[Agent] Stream chunk: "Hello! How can I..."
[Agent] Completed (cost: $0.002)
```

### View Browser Logs

Enable logging in your story:

```typescript
const agent = createAgent(config, {
  enableLogging: true,
  logLevel: 'debug',
})
```

Browser console will show:

```
[Agent] Connected to ws://localhost:5200/ws
[Agent] Event: stream_event { delta: "Hello" }
[Agent] Event: result { cost: 0.002 }
```

### Monitor WebSocket Traffic

Use browser DevTools → Network → WS to inspect:
- Connection status
- Message payloads
- Timing information

## 📋 Common Patterns

### 1. Multiple Sessions

Test different scenarios simultaneously:

```typescript
export const MultipleChats = () => {
  const [agent1] = useState(() => createAgent({ wsUrl, sessionId: 'chat-1' }))
  const [agent2] = useState(() => createAgent({ wsUrl, sessionId: 'chat-2' }))

  return (
    <div className="grid grid-cols-2 gap-4">
      <ChatInterface agent={agent1} title="Chat 1" />
      <ChatInterface agent={agent2} title="Chat 2" />
    </div>
  )
}
```

### 2. Error Simulation

Test error handling with real errors:

```typescript
export const WithErrors = () => {
  const [agent] = useState(() => createAgent({
    wsUrl: 'ws://localhost:9999/ws',  // Wrong port → connection error
    sessionId: 'error-test',
  }))

  // Component will receive real connection errors
}
```

### 3. Reconnection Testing

```typescript
export const Reconnection = () => {
  const [agent] = useState(() => createAgent(
    {
      wsUrl: 'ws://localhost:5200/ws',
      sessionId: 'reconnect-test',
    },
    {
      reconnect: true,
      maxReconnectAttempts: 5,
    }
  ))

  // Test: Stop server, restart, watch reconnection
}
```

## 🎯 Best Practices

### DO ✅

1. **Use unique session IDs**: `sessionId: \`story-\${Date.now()}\``
2. **Clean up agents**: Return cleanup function in `useEffect`
3. **Enable logging during development**: Helps debugging
4. **Test edge cases**: Try rapid sends, empty messages, etc.
5. **Monitor costs**: Real API calls cost money

### DON'T ❌

1. **Don't reuse session IDs**: Each story should have unique ID
2. **Don't forget cleanup**: Always destroy agents in unmount
3. **Don't commit API keys**: Use `.env.local` (gitignored)
4. **Don't spam API**: Be mindful of costs during development
5. **Don't mock when testing**: Defeats the purpose

## 💰 Cost Management

Real API testing costs money. To minimize costs:

1. **Use cheaper models for UI testing**:
   ```typescript
   model: 'claude-haiku-3-5-20241022'  // Faster + cheaper
   ```

2. **Limit response length**:
   ```typescript
   systemPrompt: 'Be concise. Max 2 sentences.'
   ```

3. **Test locally**: Use local stories, not deployed Storybook

4. **Monitor usage**: Check Claude dashboard regularly

## 📚 Example Stories

See working examples:

- `src/components/chat/ChatInterface.stories.tsx` - Full chat with real agent
- `src/components/message/MessageList.stories.tsx` - Message rendering
- `src/components/input/ChatInput.stories.tsx` - Input with send

## 🔄 Workflow Summary

```bash
# Terminal 1: Start WebSocket server
cd packages/agentx-ui
pnpm dev:server

# Terminal 2: Start Storybook
pnpm storybook

# OR: Run both together
pnpm dev:full
```

Then:
1. Open http://localhost:6006
2. Navigate to your story
3. Interact with REAL AI
4. See streaming, errors, everything working
5. Iterate quickly with HMR

## 🎉 Why This is Awesome

Traditional approach:
```
Write component → Mock data → Test → Deploy → Find bugs in production
```

Our approach:
```
Write component → Real data → Everything works → Deploy with confidence
```

**You're testing in production-like conditions from day one!**
