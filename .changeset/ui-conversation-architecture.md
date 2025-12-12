---
"@agentxjs/ui": minor
---

Refactor UI to conversation-first, block-based architecture

**Breaking Changes:**

- Removed `MessageRenderer`, `MessageHandler`, `createMessageChain`
- Removed individual message stories (AssistantMessage, UserMessage, ToolMessage, UnknownMessage)
- `useAgent` hook now returns `conversations` instead of `messages`

**New Architecture:**

- **Conversation-first design**: User/Assistant/Error conversations as top-level units
- **Block-based content**: AssistantConversation contains blocks (TextBlock, ToolBlock, ImageBlock)
- **Unified state management**: Single reducer pattern with stable IDs

**New Components:**

- `UserEntry`, `AssistantEntry`, `ErrorEntry` - conversation-level components
- `TextBlock`, `ToolBlock` - content block components

**New Features:**

- Tool planning status: Shows "Planning..." when AI is generating tool input
- Proper text preservation: Text no longer disappears when tool calls start
- Streaming text block support with cursor animation

**Bug Fixes:**

- Fixed text disappearing during tool call loops
- Fixed history messages being overwritten by new messages
