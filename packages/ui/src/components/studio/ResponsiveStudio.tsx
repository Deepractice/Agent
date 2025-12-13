/**
 * ResponsiveStudio - Automatically switches between desktop and mobile layouts
 *
 * Uses viewport width to determine which layout to render:
 * - Desktop (>= 768px): Studio with sidebar
 * - Mobile (< 768px): MobileStudio with drawer
 *
 * @example
 * ```tsx
 * import { ResponsiveStudio, useAgentX } from "@agentxjs/ui";
 *
 * function App() {
 *   const agentx = useAgentX("ws://localhost:5200");
 *   return <ResponsiveStudio agentx={agentx} />;
 * }
 * ```
 */

import type { AgentX } from "agentxjs";
import { Studio } from "./Studio";
import { MobileStudio } from "./MobileStudio";
import { useIsMobile, MOBILE_BREAKPOINT } from "~/hooks/useIsMobile";

export interface ResponsiveStudioProps {
  /**
   * AgentX instance
   */
  agentx: AgentX | null;
  /**
   * Container ID for user isolation
   * @default "default"
   */
  containerId?: string;
  /**
   * Breakpoint for mobile/desktop switch
   * @default 768
   */
  breakpoint?: number;
  /**
   * Desktop: Width of the sidebar
   * @default 280
   */
  sidebarWidth?: number;
  /**
   * Desktop: Enable search in AgentList
   * @default true
   */
  searchable?: boolean;
  /**
   * Desktop: Input height ratio
   * @default 0.25
   */
  inputHeightRatio?: number;
  /**
   * Mobile: Input placeholder
   */
  placeholder?: string;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * ResponsiveStudio Component
 *
 * Automatically renders Studio or MobileStudio based on viewport width.
 */
export function ResponsiveStudio({
  agentx,
  containerId = "default",
  breakpoint = MOBILE_BREAKPOINT,
  sidebarWidth = 280,
  searchable = true,
  inputHeightRatio = 0.25,
  placeholder,
  className,
}: ResponsiveStudioProps) {
  const isMobile = useIsMobile(breakpoint);

  if (isMobile) {
    return (
      <MobileStudio
        agentx={agentx}
        containerId={containerId}
        searchable={searchable}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <Studio
      agentx={agentx}
      containerId={containerId}
      sidebarWidth={sidebarWidth}
      searchable={searchable}
      inputHeightRatio={inputHeightRatio}
      className={className}
    />
  );
}
