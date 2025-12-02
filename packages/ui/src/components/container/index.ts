/**
 * Container Components - Pure UI Panes
 *
 * Part of UI-Backend API Consistency design (see index.ts ADR #5):
 * - These are pure UI components (presentational)
 * - For integration, use Studio from ~/components/studio
 */

// ContainerView - Pure UI layout component
export { ContainerView } from "./ContainerView";
export type { ContainerViewProps, ContainerViewRenderProps } from "./ContainerView";

// Pure UI Panes
export { DefinitionPane } from "./DefinitionPane";
export type { DefinitionPaneProps } from "./DefinitionPane";

export { SessionPane } from "./SessionPane";
export type { SessionPaneProps } from "./SessionPane";

export { AgentPane } from "./AgentPane";
export type { AgentPaneProps } from "./AgentPane";

export { MessagePane } from "./MessagePane";
export type { MessagePaneProps } from "./MessagePane";

export { InputPane } from "./InputPane";
export type { InputPaneProps } from "./InputPane";

export { InputToolBar } from "./InputToolBar";
export type { InputToolBarProps } from "./InputToolBar";

// Types
export type { SessionItem, AgentDefinitionItem } from "./types";
