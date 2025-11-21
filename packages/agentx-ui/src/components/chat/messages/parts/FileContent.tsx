export interface FileContentProps {
  /**
   * File data (base64-encoded string or URL)
   */
  data: string;

  /**
   * File MIME type (IANA media type)
   */
  mediaType: string;

  /**
   * Optional filename
   */
  filename?: string;
}

/**
 * FileContent - Render file attachment with download
 *
 * @example
 * ```tsx
 * <FileContent data="data:application/pdf;base64,..." mediaType="application/pdf" filename="document.pdf" />
 * <FileContent data="https://example.com/file.xlsx" mediaType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" filename="data.xlsx" />
 * ```
 */
export function FileContent({ data, mediaType, filename }: FileContentProps) {
  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith("application/pdf")) return "📄";
    if (mimeType.startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml"))
      return "📊";
    if (mimeType.startsWith("application/vnd.openxmlformats-officedocument.wordprocessingml"))
      return "📝";
    if (mimeType.startsWith("application/vnd.openxmlformats-officedocument.presentationml"))
      return "📽️";
    if (mimeType.includes("zip") || mimeType.includes("compressed")) return "🗜️";
    if (mimeType.startsWith("text/")) return "📃";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType.startsWith("audio/")) return "🎵";
    return "📎";
  };

  // Get file extension from filename or MIME type
  const getFileExtension = (): string => {
    if (filename) {
      const ext = filename.split(".").pop();
      if (ext && ext !== filename) return ext.toUpperCase();
    }

    // Fallback to MIME type
    const mimeMap: Record<string, string> = {
      "application/pdf": "PDF",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
      "application/zip": "ZIP",
      "text/plain": "TXT",
      "text/csv": "CSV",
      "application/json": "JSON",
    };

    return mimeMap[mediaType] || "FILE";
  };

  // Handle download
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = data;
    link.download = filename || `file.${getFileExtension().toLowerCase()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format file size (if we can detect it from base64)
  const getFileSize = (): string | null => {
    if (data.startsWith("data:")) {
      try {
        const base64Data = data.split(",")[1];
        if (!base64Data) return null;

        const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);

        if (sizeInBytes < 1024) return `${sizeInBytes} B`;
        if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
        return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
      } catch {
        return null;
      }
    }
    return null;
  };

  const icon = getFileIcon(mediaType);
  const extension = getFileExtension();
  const size = getFileSize();

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        {/* File icon */}
        <div className="text-3xl flex-shrink-0">{icon}</div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {filename || `file.${extension.toLowerCase()}`}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <span>{extension}</span>
            {size && (
              <>
                <span>•</span>
                <span>{size}</span>
              </>
            )}
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-600 dark:border-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
        >
          Download
        </button>
      </div>
    </div>
  );
}
