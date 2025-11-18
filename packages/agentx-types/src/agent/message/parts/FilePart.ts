/**
 * File Part
 *
 * File attachment in a message (PDF, documents, etc.).
 */
export interface FilePart {
  /** Content type discriminator */
  type: "file";

  /** File data (base64-encoded string or URL) */
  data: string;

  /** File MIME type (IANA media type) */
  mediaType: string;

  /** Optional filename */
  filename?: string;
}
