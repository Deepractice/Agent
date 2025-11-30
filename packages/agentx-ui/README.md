# @deepractice-ai/agentx-ui

React component library for building AI agent interfaces.

## Features

- React components optimized for AI agent UIs
- TypeScript support with full type definitions
- Tailwind CSS for styling with custom design tokens
- Storybook for component development and documentation
- Tree-shakeable ESM exports

## Installation

```bash
pnpm add @deepractice-ai/agentx-ui
```

## Usage

```tsx
import { Button } from "@deepractice-ai/agentx-ui";
import "@deepractice-ai/agentx-ui/styles.css";

function App() {
  return <Button>Click me</Button>;
}
```

## Development

```bash
# Install dependencies
pnpm install

# Run Storybook
pnpm storybook

# Build the library
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Architecture

This package follows a layered architecture:

- `src/api/` - Public API (skin layer)
- `src/types/` - Public type definitions
- `src/components/` - React components
- `src/styles/` - Global styles and design tokens
- `src/utils/` - Utility functions

## Design System

The component library uses a semantic token system based on Tailwind CSS:

- **Primary**: Computational intelligence (Blue)
- **Secondary**: Generative creativity (Amber)
- **Accent**: Interactive highlights (Orange)
- **Success/Warning/Error**: Feedback states

Dark mode is supported via CSS custom properties.

## Related Packages

- **[@deepractice-ai/agentx](../agentx)** - Platform API (createAgentX, defineAgent)
- **[@deepractice-ai/agentx-types](../agentx-types)** - Message and event type definitions
- **[@deepractice-ai/agentx-agent](../agentx-agent)** - Agent runtime

## License

MIT
