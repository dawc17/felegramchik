import React, { useState, useEffect, useRef } from "react";
import {
  account,
  databases,
  uploadAttachment,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_ID_MESSAGES,
} from "../../lib/appwrite";
import { ID, Permission, Role } from "appwrite";

const MessageInput = ({ chatId, participants }) => {
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // File upload constraints
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/ogg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/mpeg",
    "application/pdf",
    "text/plain",
    "text/csv",
  ];

  useEffect(() => {
    const getAccount = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);
      } catch (err) {
        console.error(err);
      }
    };
    getAccount();
  }, []);

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `File size must be less than ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB`
      );
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(`File type "${file.type}" is not supported`);
    }
    return true;
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = [];
    const errors = [];

    if (files.length === 0) return;

    files.forEach((file) => {
      try {
        validateFile(file);
        validFiles.push(file);
      } catch (error) {
        errors.push(`${file.name}: ${error.message}`);
      }
    });

    if (errors.length > 0) {
      alert(
        `Some files were rejected:\n${errors.join("\n")}\n\nSupported types: Images, Videos, Audio, PDF, Text files`
      );
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files) => {
    const uploadedFiles = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log(`Uploading ${file.name}...`);
        const result = await uploadAttachment(file);

        uploadedFiles.push({
          fileId: result.$id,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        });

        console.log(`Successfully uploaded ${file.name}`);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Provide more user-friendly error messages
        let errorMessage = `Failed to upload ${file.name}`;
        if (error.message?.includes("permission")) {
          errorMessage +=
            " - Permission denied. Please check bucket permissions.";
        } else if (error.message?.includes("size")) {
          errorMessage += " - File too large.";
        } else if (error.message?.includes("network")) {
          errorMessage += " - Network error. Please check your connection.";
        }
        throw new Error(errorMessage);
      }
    }

    return uploadedFiles;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasMessage = message.trim();
    const hasFiles = selectedFiles.length > 0;

    if (!hasMessage && !hasFiles) return;
    if (!chatId || !currentUser) return;
    if (isLoading || isUploading) return;

    setIsLoading(true);
    setIsUploading(hasFiles);

    try {
      let attachments = [];

      // Upload files if any
      if (hasFiles) {
        attachments = await uploadFiles(selectedFiles);
      }

      // Create message data
      const messageData = {
        chatId: chatId,
        senderId: currentUser.$id,
      };

      // Add text if provided
      if (hasMessage) {
        messageData.text = message.trim();
      }

      // Add attachments if any - store as an array of file IDs
      if (attachments.length > 0) {
        messageData.attachments = attachments.map((file) => file.fileId);
      }

      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID_MESSAGES,
        ID.unique(),
        messageData,
        [Permission.read(Role.users()), Permission.write(Role.users())]
      );

      // Clear form
      setMessage("");
      setSelectedFiles([]);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-3 sm:p-4 bg-surface border-t border-border">
      {/* File preview area */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 p-3 bg-surface-variant rounded-lg">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="relative bg-background p-2 rounded border border-border"
              >
                <div className="flex items-center space-x-2 max-w-48">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-xs text-on-surface/60">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-surface rounded"
                    disabled={isUploading}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end space-x-2 sm:space-x-3"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_FILE_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {/* Attach file button */}
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={!chatId || isUploading}
          className="p-3 text-on-surface hover:bg-surface-variant rounded-full focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Attach file"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5,6V17.5A4,4 0 0,1 12.5,21.5A4,4 0 0,1 8.5,17.5V5A2.5,2.5 0 0,1 11,2.5A2.5,2.5 0 0,1 13.5,5V15.5A1,1 0 0,1 12.5,16.5A1,1 0 0,1 11.5,15.5V6H10V15.5A2.5,2.5 0 0,0 12.5,18A2.5,2.5 0 0,0 15,15.5V5A4,4 0 0,0 11,1A4,4 0 0,0 7,5V17.5A5.5,5.5 0 0,0 12.5,23A5.5,5.5 0 0,0 18,17.5V6H16.5Z" />
          </svg>
        </button>

        {/* Message input */}
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-4 py-3 border border-border rounded-full bg-surface-variant text-on-surface placeholder-on-surface/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!chatId || isUploading}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={
            (!message.trim() && selectedFiles.length === 0) ||
            !chatId ||
            isLoading ||
            isUploading
          }
          className="p-3 bg-primary text-on-primary rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
        >
          {isLoading || isUploading ? (
            <svg
              className="w-5 h-5 animate-spin"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
                opacity="0.25"
              />
              <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
