import { useState } from "react";

export interface ImageContentProps {
  /**
   * Image data (base64-encoded string or URL)
   */
  data: string;

  /**
   * Image MIME type
   */
  mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";

  /**
   * Optional image name/filename
   */
  name?: string;

  /**
   * Optional max width (CSS value)
   */
  maxWidth?: string;

  /**
   * Optional max height (CSS value)
   */
  maxHeight?: string;
}

/**
 * ImageContent - Render image with preview and modal
 *
 * @example
 * ```tsx
 * <ImageContent data="data:image/png;base64,..." mediaType="image/png" />
 * <ImageContent data="https://example.com/image.jpg" mediaType="image/jpeg" name="screenshot.jpg" />
 * ```
 */
export function ImageContent({
  data,
  mediaType: _mediaType,
  name,
  maxWidth = "400px",
  maxHeight = "300px",
}: ImageContentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Build image source URL
  const src = data.startsWith("data:") ? data : data;

  return (
    <>
      {/* Thumbnail */}
      <div className="w-full">
        <div
          className="relative inline-block rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setIsModalOpen(true)}
          style={{ maxWidth, maxHeight }}
        >
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            </div>
          )}

          {hasError ? (
            <div className="flex flex-col items-center justify-center p-8 text-red-600 dark:text-red-400">
              <span className="text-4xl mb-2">⚠️</span>
              <span className="text-sm">Failed to load image</span>
              {name && <span className="text-xs mt-1">{name}</span>}
            </div>
          ) : (
            <img
              src={src}
              alt={name || "Image"}
              className="max-w-full max-h-full object-contain"
              style={{ maxWidth, maxHeight }}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          )}
        </div>

        {/* Image info */}
        {name && !hasError && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">📷 {name}</div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && !hasError && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            {/* Close button */}
            <button
              className="absolute -top-10 right-0 text-white hover:text-gray-300 text-xl"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>

            {/* Full-size image */}
            <img
              src={src}
              alt={name || "Image"}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image info */}
            {name && <div className="absolute -bottom-8 left-0 text-white text-sm">{name}</div>}
          </div>
        </div>
      )}
    </>
  );
}
