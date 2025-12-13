---
"@agentxjs/ui": minor
---

feat(ui): add collapsible sidebar to Studio component

- Add collapse button (ChevronsLeft) to ListPane header
- Move "+" new button to search bar area
- Add `collapsible` prop to Studio (default: true)
- Add `showCollapseButton` and `onCollapse` props to ListPane and AgentList
- When collapsed, sidebar shows only an expand button (ChevronsRight)
- Smooth transition animation for sidebar collapse/expand
