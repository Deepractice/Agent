/**
 * Image Part
 *
 * Image content in a message.
 */
export interface ImagePart {
  /** Content type discriminator */
  type: "image";

  /** Image data (base64-encoded string or URL) */
  data: string;

  /** Image MIME type */
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";

  /** Optional image name/filename */
  name?: string;
}
