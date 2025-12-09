---
"@agentxjs/ui": minor
"@agentxjs/runtime": patch
---

refactor(ui): unify assistant message lifecycle with single component

**Major Changes:**

- Consolidated `ThinkingMessage` and `StreamingMessage` into a single `AssistantMessage` component that handles all lifecycle states
- Added message-level status types: `UserMessageStatus` and `AssistantMessageStatus`
- Implemented complete status flow: `queued → thinking → responding → success`
- Created comprehensive Stories for `AssistantMessage` and `ToolMessage` components

**Technical Improvements:**

- Applied single responsibility principle - one component manages all assistant message states
- Added `useAgent` hook to manage assistant message status transitions automatically
- Improved Chat component with unified message rendering logic
- Fixed `RuntimeOperations.getImageMessages` type signature to use proper `Message[]` type

**UI Enhancements:**

- `queued` state: "Queue..." with animated dots
- `thinking` state: "Thinking..." with animated dots
- `responding` state: Streaming text with cursor animation
- `success` state: Complete rendered message

This refactoring significantly improves code maintainability and provides a clearer mental model for message lifecycle management.
