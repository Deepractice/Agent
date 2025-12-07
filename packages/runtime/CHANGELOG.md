# @agentxjs/runtime

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
