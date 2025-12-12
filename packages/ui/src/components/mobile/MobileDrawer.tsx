/**
 * MobileDrawer - Mobile drawer component using vaul
 *
 * A slide-out drawer for mobile navigation, following Claude App's minimalist design.
 * Supports swipe gestures and provides smooth animations.
 */

import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "~/utils/utils";

export interface MobileDrawerProps {
  /**
   * Whether the drawer is open
   */
  open: boolean;
  /**
   * Callback when drawer open state changes
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Drawer content
   */
  children: React.ReactNode;
  /**
   * Additional class name for drawer content
   */
  className?: string;
}

/**
 * MobileDrawer Component
 *
 * A left-side drawer for mobile navigation using vaul library.
 * Provides gesture support and smooth animations.
 */
export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  open,
  onOpenChange,
  children,
  className,
}) => {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="left" handleOnly={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content
          className={cn(
            "fixed left-0 top-0 bottom-0 z-50",
            "w-[280px] bg-background",
            "flex flex-col",
            "outline-none",
            className
          )}
          style={{ backgroundColor: "hsl(var(--background))" }}
        >
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

MobileDrawer.displayName = "MobileDrawer";
