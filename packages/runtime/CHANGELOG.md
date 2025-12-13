# @agentxjs/runtime

## 1.1.0

### Patch Changes

- 5749112: refactor(ui): unify assistant message lifecycle with single component

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

## 1.0.2

## 1.0.1

## 1.0.0

## 0.1.9

## 0.1.8

## 0.1.7

### Patch Changes

- da67096: fix(runtime): pass sandbox workdir path as cwd to Claude SDK

  Previously, the cwd parameter was not being passed from RuntimeAgent to ClaudeEnvironment, causing the Claude SDK to run in the default working directory instead of the agent's isolated sandbox workdir. This fix ensures each agent operates within its designated working directory at `~/.agentx/containers/{containerId}/workdirs/{agentId}/`.

## 0.1.6

### Patch Changes

- 2474559: fix: properly configure SDK subprocess environment
  - Properly copy process.env to ensure PATH is available for SDK subprocess
  - Add stderr callback for debugging SDK subprocess errors

## 0.1.5

### Patch Changes

- 275f120: fix: correct Claude Agent SDK options configuration
  - Remove incorrect `executable` option (was passing process.execPath instead of 'node'/'bun'/'deno')
  - Add required `allowDangerouslySkipPermissions: true` when using `bypassPermissions` mode

## 0.1.4

### Patch Changes

- faa35d4: fix: remove private packages from npm dependencies
  - Move internal packages to devDependencies
  - Bundle via tsup noExternal config
  - Fixes npm install errors for end users

## 0.1.3

### Patch Changes

- 02171e5: fix: remove private packages from published dependencies

  Move @agentxjs/types, @agentxjs/common, @agentxjs/agent from dependencies
  to devDependencies. These packages are bundled via tsup noExternal config
  and should not appear in the published package.json dependencies.

## 0.1.2

### Patch Changes

- 0fa60d4: fix: bundle internal packages to avoid npm dependency issues
  - Configure tsup to bundle @agentxjs/types, @agentxjs/common, @agentxjs/agent
  - Remove @agentxjs/types dependency from portagent
  - These private packages are now bundled instead of being external dependencies

## 0.1.1

### Patch Changes

- aa60143: test: verify CI publish workflow
