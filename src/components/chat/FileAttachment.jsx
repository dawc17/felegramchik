import React from "react";
import {
  getAttachmentUrl,
  getAttachmentDownloadUrl,
  getAttachmentPreview,
  formatFileSize,
  getFileType,
} from "../../lib/appwrite";

const FileAttachment = ({ attachment, onLoad = null }) => {
  if (!attachment || !attachment.fileId) return null;

  const fileType = getFileType(attachment.mimeType);
  const fileName = attachment.fileName || "Unknown file";
  const fileSize = attachment.fileSize
    ? formatFileSize(attachment.fileSize)
    : "";

  const handleDownload = () => {
    try {
      const downloadUrl = getAttachmentDownloadUrl(attachment.fileId);
      if (downloadUrl) {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        link.target = "_blank"; // Open in new tab as fallback
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error("Could not get download URL");
        alert("Failed to download file. Please try again.");
      }
    } catch (error) {
      console.error("Failed to download file:", error);
      alert("Failed to download file. Please try again.");
    }
  };

  const handleLoad = () => {
    if (onLoad) onLoad();
  };

  // Render different components based on file type
  const renderFileContent = () => {
    switch (fileType) {
      case "image":
        return (
          <div className="max-w-xs sm:max-w-sm">
            <img
              src={getAttachmentPreview(attachment.fileId, 400, 300)}
              alt={fileName}
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleDownload}
              onLoad={handleLoad}
              onError={(e) => {
                console.error("Failed to load image preview for:", fileName);
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "block";
              }}
            />
            <div className="hidden">{renderGenericFile()}</div>
            <p className="text-xs text-gray-500 mt-1 text-center">{fileName}</p>
          </div>
        );

      case "video":
        return (
          <div className="max-w-xs sm:max-w-sm">
            <video
              controls
              className="rounded-lg max-w-full h-auto"
              preload="metadata"
              onLoadedMetadata={handleLoad}
            >
              <source
                src={getAttachmentUrl(attachment.fileId)}
                type={attachment.mimeType}
              />
              Your browser does not support the video tag.
            </video>
            <p className="text-xs text-gray-500 mt-1">{fileName}</p>
          </div>
        );

      case "audio":
        return (
          <div className="max-w-xs sm:max-w-sm">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center mb-2">
                <svg
                  className="w-6 h-6 text-blue-500 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                  <p className="text-xs text-gray-500">{fileSize}</p>
                </div>
              </div>
              <audio
                controls
                className="w-full"
                preload="metadata"
                onLoadedMetadata={handleLoad}
              >
                <source
                  src={getAttachmentUrl(attachment.fileId)}
                  type={attachment.mimeType}
                />
                Your browser does not support the audio tag.
              </audio>
            </div>
          </div>
        );

      default:
        return renderGenericFile();
    }
  };

  const renderGenericFile = () => {
    const getFileIcon = () => {
      switch (fileType) {
        case "pdf":
          return (
            <svg
              className="w-8 h-8 text-red-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12.186 14.552c-.617 0-.977.587-.977 1.373 0 .791.371 1.35.983 1.35.617 0 .971-.588.971-1.374 0-.726-.348-1.349-.977-1.349z" />
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M13.5 3.5L18 8h-4.5V3.5z" />
            </svg>
          );
        case "document":
          return (
            <svg
              className="w-8 h-8 text-blue-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M13.5 3.5L18 8h-4.5V3.5z" />
              <path d="M9 13h6M9 17h6M9 9h1" />
            </svg>
          );
        case "spreadsheet":
          return (
            <svg
              className="w-8 h-8 text-green-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M13.5 3.5L18 8h-4.5V3.5z" />
              <path d="M7 13h3v3H7zM14 13h3v3h-3zM7 9h3v3H7zM14 9h3v3h-3z" />
            </svg>
          );
        case "presentation":
          return (
            <svg
              className="w-8 h-8 text-orange-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M13.5 3.5L18 8h-4.5V3.5z" />
              <path d="M8 12h8M8 16h5" />
            </svg>
          );
        case "archive":
          return (
            <svg
              className="w-8 h-8 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M13.5 3.5L18 8h-4.5V3.5z" />
              <path d="M10 12v4l2-1 2 1v-4" />
            </svg>
          );
        case "text":
          return (
            <svg
              className="w-8 h-8 text-gray-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M13.5 3.5L18 8h-4.5V3.5z" />
              <path d="M9 13h6M9 17h6M9 9h6" />
            </svg>
          );
        default:
          return (
            <svg
              className="w-8 h-8 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M13.5 3.5L18 8h-4.5V3.5z" />
            </svg>
          );
      }
    };

    return (
      <div
        className="max-w-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={handleDownload}
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">{getFileIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {fileName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {fileSize}
            </p>
          </div>
          <div className="flex-shrink-0">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M12 18l4-4h-3V9h-2v5H8l4 4z" />
            </svg>
          </div>
        </div>
      </div>
    );
  };

  return <div className="my-2">{renderFileContent()}</div>;
};

export default FileAttachment;
