# File Upload Feature Documentation

## Overview

The chat application now supports file uploads and attachments. Users can attach various types of files to their messages and view them inline.

## Supported File Types

- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, WebM, OGG
- **Audio**: MP3, WAV, OGG, MPEG
- **Documents**: PDF
- **Text Files**: Plain text, CSV
- **Archives**: ZIP, RAR (download only)

## File Size Limits

- Maximum file size: 10MB per file
- Multiple files can be attached to a single message

## How to Use

### Sending Files

1. Click the attachment (📎) button in the message input area
2. Select one or more files from your device
3. Preview selected files before sending
4. Remove unwanted files by clicking the X button
5. Add optional text message
6. Click send to upload and share

### Viewing Files

- **Images**: Display as previews with click-to-download
- **Videos**: Embedded video player with controls
- **Audio**: Embedded audio player with controls
- **Documents/Other**: File icon with download button

### Downloading Files

- Click on any attachment to download it
- Images and media can be viewed inline before downloading

## Technical Implementation

### Backend (Appwrite)

- Files stored in Appwrite Storage bucket
- File metadata stored in message documents
- Permissions configured for user access

### Frontend Components

- `MessageInput.jsx`: File selection and upload UI
- `FileAttachment.jsx`: File display and download
- `ChatView.jsx`: Message rendering with attachments

### Error Handling

- File type validation
- File size limits
- Upload failure recovery
- Network error handling
- Permission error messages

## Security Features

- File type validation
- Size limits to prevent abuse
- Secure file URLs with access control
- Input sanitization

## Future Enhancements

- Progress bars for large uploads
- Drag & drop file upload
- Image compression
- More file type support
- File preview without download
