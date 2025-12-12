---
"@agentxjs/ui": minor
---

Add interrupt functionality with ESC key support and AssistantToolbar

- Add AssistantToolbar component with action buttons (copy, regenerate, like, dislike)
- Show "esc to stop" hint during streaming/thinking states
- Show action buttons when conversation is completed
- Add ESC key listener in Chat component to interrupt ongoing conversations
- Pass onStop callback to AssistantEntry for toolbar click handling
