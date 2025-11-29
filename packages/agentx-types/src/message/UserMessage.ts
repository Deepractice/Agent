import type { TextPart } from "./parts/TextPart";
import type { ImagePart } from "./parts/ImagePart";
import type { FilePart } from "./parts/FilePart";

/**
 * User Message
 *
 * Message sent by the user.
 * Can contain simple text or rich content (text, images, files).
 */
export interface UserMessage {
  /** Unique identifier */
  id: string;

  /** Message role */
  role: "user";

  /** Message subtype for serialization */
  subtype: "user";

  /** Message content - can be simple string or array of parts */
  content: string | Array<TextPart | ImagePart | FilePart>;

  /** When this message was created (Unix timestamp in milliseconds) */
  timestamp: number;

  /** Parent message ID for threading (optional) */
  parentId?: string;
}
