/**
 * Text Part
 *
 * Plain text content in a message.
 */
export interface TextPart {
  /** Content type discriminator */
  type: "text";

  /** The text content (supports Markdown) */
  text: string;
}
