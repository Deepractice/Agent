import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";

export interface ChatInputProps {
  /**
   * Callback when user sends a message
   */
  onSend: (text: string) => void;

  /**
   * Whether the input is disabled (e.g., while AI is responding)
   */
  disabled?: boolean;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Initial value
   */
  defaultValue?: string;

  /**
   * Callback when user attaches images (optional)
   */
  onImageAttach?: (files: File[]) => void;

  /**
   * Show image attachment button
   */
  showImageButton?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * ChatInput - Auto-resizing textarea with send button
 *
 * Features:
 * - Auto-resize textarea (up to max height)
 * - Enter to send, Shift+Enter for new line
 * - Send button (disabled when empty or loading)
 * - Optional image attachment button
 * - Hint text showing keyboard shortcuts
 *
 * @example
 * ```tsx
 * <ChatInput
 *   onSend={(text) => console.log('Send:', text)}
 *   disabled={isLoading}
 * />
 * ```
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type a message or ask Agent anything...",
  defaultValue = "",
  onImageAttach,
  showImageButton = true,
  className = "",
}: ChatInputProps) {
  const [input, setInput] = useState(defaultValue);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;

    // Check if expanded (more than 2 lines)
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
    setIsExpanded(textarea.scrollHeight > lineHeight * 2);
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || disabled) return;

    onSend(input.trim());
    setInput("");

    // Reset height
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      setIsExpanded(false);
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to submit (unless Shift+Enter for new line)
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length > 0 && onImageAttach) {
      onImageAttach(imageFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      {/* Input container */}
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-200 overflow-hidden ${
          isExpanded ? "ring-2 ring-blue-500" : ""
        }`}
      >
        {/* Hidden file input */}
        {showImageButton && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="block w-full pl-12 pr-20 sm:pr-40 py-1.5 sm:py-4 bg-transparent rounded-2xl focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none min-h-[50px] sm:min-h-[80px] max-h-[40vh] sm:max-h-[300px] overflow-y-auto text-sm sm:text-base leading-[21px] sm:leading-6 transition-all duration-200"
          style={{ height: "50px" }}
        />

        {/* Image upload button */}
        {showImageButton && (
          <button
            type="button"
            onClick={handleImageClick}
            disabled={disabled}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Attach images"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        )}

        {/* Send button */}
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-gray-800"
        >
          <svg
            className="w-5 h-5 text-white transform rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>

        {/* Hint text - desktop only */}
        <div className="absolute bottom-1 left-12 right-14 sm:right-40 text-xs text-gray-400 dark:text-gray-500 pointer-events-none hidden sm:block">
          Enter to send • Shift+Enter for new line • Tab to change modes • / for slash commands
        </div>

        {/* Hint text - mobile (hidden by default, shows on focus) */}
        <div className="absolute bottom-1 left-12 right-14 text-xs text-gray-400 dark:text-gray-500 pointer-events-none sm:hidden opacity-0">
          Enter to send • Tab for modes • / for commands
        </div>
      </div>
    </form>
  );
}
