import type { UserMessage as UserMessageType } from "@deepractice-ai/agentx-types";
import { MessageAvatar } from "~/components/elements/MessageAvatar";
import { User } from "lucide-react";
import { TextContent } from "./parts/TextContent";
import { ImageContent } from "./parts/ImageContent";
import { FileContent } from "./parts/FileContent";

export interface UserMessageProps {
  /**
   * User message data
   */
  message: UserMessageType;
}

/**
 * UserMessage - Display a user message
 *
 * Features:
 * - User avatar (amber color)
 * - Text content rendering
 * - Image parts support
 * - File parts support
 *
 * @example
 * ```tsx
 * <UserMessage message={{
 *   id: '1',
 *   role: 'user',
 *   content: 'Hello, how are you?',
 *   timestamp: Date.now()
 * }} />
 * ```
 */
export function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="chat-message user">
      <div className="w-full">
        {/* Avatar */}
        <MessageAvatar
          label="You"
          variant="secondary"
          icon={<User className="w-5 h-5 text-white" />}
          size="md"
        />

        {/* Content */}
        <div className="pl-3 sm:pl-0 space-y-2">
          {typeof message.content === "string" ? (
            <TextContent text={message.content} />
          ) : (
            message.content.map((part, idx) => {
              switch (part.type) {
                case "text":
                  return <TextContent key={idx} text={part.text} />;
                case "image":
                  return (
                    <ImageContent
                      key={idx}
                      data={part.data}
                      mediaType={part.mediaType}
                      name={part.name}
                    />
                  );
                case "file":
                  return (
                    <FileContent
                      key={idx}
                      data={part.data}
                      mediaType={part.mediaType}
                      filename={part.filename}
                    />
                  );
                default:
                  return null;
              }
            })
          )}
        </div>
      </div>
    </div>
  );
}
