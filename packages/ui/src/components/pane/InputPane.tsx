/**
 * InputPane - Full-height input area (WeChat style)
 *
 * A pure UI component where the entire pane is an input area:
 * - Toolbar at the top
 * - Full-height textarea filling the space
 * - Send button at bottom right corner
 *
 * @example
 * ```tsx
 * <InputPane
 *   onSend={(text) => handleSend(text)}
 *   placeholder="Type a message..."
 *   toolbarItems={[
 *     { id: 'emoji', icon: <Smile />, label: 'Emoji' },
 *     { id: 'attach', icon: <Paperclip />, label: 'Attach' },
 *   ]}
 * />
 * ```
 */

import * as React from "react";
import { Send, Square } from "lucide-react";
import { cn } from "~/utils/utils";
import { InputToolBar, type ToolBarItem } from "./InputToolBar";
import { EmojiPicker, type Emoji } from "../element/EmojiPicker";

export interface InputPaneProps {
  /**
   * Callback when user sends a message
   */
  onSend?: (text: string) => void;
  /**
   * Callback when stop button is clicked (during loading)
   */
  onStop?: () => void;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * Whether currently loading/processing
   */
  isLoading?: boolean;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Toolbar items (left side)
   */
  toolbarItems?: ToolBarItem[];
  /**
   * Toolbar items (right side)
   */
  toolbarRightItems?: ToolBarItem[];
  /**
   * Callback when a toolbar item is clicked
   */
  onToolbarItemClick?: (id: string) => void;
  /**
   * Show toolbar
   * @default true when toolbarItems provided
   */
  showToolbar?: boolean;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Enable built-in emoji picker for toolbar item with id='emoji'
   * @default true
   */
  enableEmojiPicker?: boolean;
}

/**
 * InputPane component - WeChat style full-height input
 */
export const InputPane = React.forwardRef<HTMLDivElement, InputPaneProps>(
  (
    {
      onSend,
      onStop,
      disabled = false,
      isLoading = false,
      placeholder = "Type a message...",
      toolbarItems,
      toolbarRightItems,
      onToolbarItemClick,
      showToolbar,
      className,
      enableEmojiPicker = true,
    },
    ref
  ) => {
    const [text, setText] = React.useState("");
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const emojiPickerRef = React.useRef<HTMLDivElement>(null);

    // Close emoji picker when clicking outside
    React.useEffect(() => {
      if (!showEmojiPicker) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
          setShowEmojiPicker(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowEmojiPicker(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }, [showEmojiPicker]);

    const handleSend = () => {
      if (!text.trim() || disabled || isLoading) return;
      onSend?.(text.trim());
      setText("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send, Shift+Enter for new line
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    };

    const handleEmojiSelect = (emoji: Emoji) => {
      setText((prev) => prev + emoji.native);
      setShowEmojiPicker(false);
      textareaRef.current?.focus();
    };

    const handleToolbarItemClick = (id: string) => {
      if (id === "emoji" && enableEmojiPicker) {
        setShowEmojiPicker((prev) => !prev);
      }
      onToolbarItemClick?.(id);
    };

    // Check if toolbar has emoji item
    const hasEmojiItem =
      toolbarItems?.some((item) => item.id === "emoji") ||
      toolbarRightItems?.some((item) => item.id === "emoji");

    const shouldShowToolbar = showToolbar ?? (toolbarItems && toolbarItems.length > 0);

    const canSend = text.trim().length > 0 && !disabled && !isLoading;

    return (
      <div
        ref={ref}
        className={cn("flex flex-col h-full border-t border-border bg-muted/30", className)}
      >
        {/* Toolbar at top */}
        {shouldShowToolbar && (
          <div className="flex-shrink-0 border-b border-border relative">
            <InputToolBar
              items={toolbarItems || []}
              rightItems={toolbarRightItems}
              onItemClick={handleToolbarItemClick}
            />
            {/* Emoji Picker Popover */}
            {enableEmojiPicker && hasEmojiItem && showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute left-0 bottom-full z-50 mb-1">
                <div
                  className="bg-popover rounded-lg shadow-lg border border-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} theme="auto" perLine={8} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full-height textarea area */}
        <div className="flex-1 relative min-h-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full h-full resize-none bg-transparent",
              "px-3 py-3 pr-14 text-sm",
              "placeholder:text-muted-foreground",
              "focus:outline-none",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "overflow-y-auto"
            )}
          />

          {/* Send/Stop button at bottom right */}
          <div className="absolute bottom-3 right-3">
            {isLoading && onStop ? (
              <button
                type="button"
                onClick={onStop}
                className={cn(
                  "p-2 rounded-lg transition-all duration-150",
                  "bg-destructive text-destructive-foreground",
                  "hover:bg-destructive/90",
                  "active:scale-95"
                )}
                title="Stop"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "p-2 rounded-lg transition-all duration-150",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                title="Send (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

InputPane.displayName = "InputPane";
