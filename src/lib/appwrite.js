import { Client, Account, Databases, Storage } from "appwrite";
import { Query, ID } from "appwrite";

// Проверяем наличие всех необходимых переменных окружения
const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (!ENDPOINT) {
    throw new Error('VITE_APPWRITE_ENDPOINT is not defined in environment variables');
}

if (!PROJECT_ID) {
    throw new Error('VITE_APPWRITE_PROJECT_ID is not defined in environment variables');
}

export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const APPWRITE_COLLECTION_ID_MESSAGES = import.meta.env.VITE_APPWRITE_COLLECTION_ID_MESSAGES;
export const APPWRITE_COLLECTION_ID_USERS = import.meta.env.VITE_APPWRITE_COLLECTION_ID_USERS;
export const APPWRITE_COLLECTION_ID_CHATS = import.meta.env.VITE_APPWRITE_COLLECTION_ID_CHATS;
export const APPWRITE_COLLECTION_ID_GROUPS = import.meta.env.VITE_APPWRITE_COLLECTION_ID_GROUPS;
export const APPWRITE_BUCKET_ID_AVATARS = import.meta.env.VITE_APPWRITE_BUCKET_ID_AVATARS;
export const APPWRITE_BUCKET_ID_ATTACHMENTS = import.meta.env.VITE_APPWRITE_BUCKET_ID_ATTACHMENTS;

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

export { client };
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Get user's chats
export const getUserChats = async (userId) => {
    try {
        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_CHATS,
            [Query.search('participants', userId), Query.orderDesc('$updatedAt')]
        );
        return response.documents;
    } catch (error) {
        console.error('Failed to get user chats:', error);
        throw error;
    }
};

// Get last message for a chat or group
export const getLastMessage = async (chatId = null, groupId = null) => {
    try {
        let query = [];

        if (chatId) {
            query.push(Query.equal('chatId', chatId));
        } else if (groupId) {
            // Временно используем chatId для групп с префиксом
            const groupChatId = `group_${groupId}`;
            console.log('Looking for messages with chatId:', groupChatId);
            query.push(Query.equal('chatId', groupChatId));
        } else {
            return null;
        }

        query.push(Query.orderDesc('$createdAt'));
        query.push(Query.limit(1));

        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_MESSAGES,
            query
        );

        console.log('Query result for', chatId || `group_${groupId}`, ':', response.documents.length, 'messages');
        if (response.documents.length > 0) {
            console.log('Last message:', response.documents[0]);
        }

        return response.documents[0] || null;
    } catch (error) {
        console.error('Failed to get last message:', error);
        return null;
    }
};

// Cache for user data
const userCache = new Map();

// Clear user cache (useful when user profile is updated)
export const clearUserCache = () => {
    userCache.clear();
};

// Get user info by ID
export const getUserById = async (userId) => {
    // Check cache first
    if (userCache.has(userId)) {
        return userCache.get(userId);
    }

    try {
        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_USERS,
            [Query.equal('userId', userId)]
        );
        const user = response.documents[0] || null;

        // Cache the result
        if (user) {
            userCache.set(userId, user);
        }

        return user;
    } catch (error) {
        console.error('Failed to get user by ID:', error);
        return null;
    }
};

// Delete chat and all its messages
export const deleteChat = async (chatId) => {
    try {
        // First, delete all messages in the chat
        const messagesResponse = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_MESSAGES,
            [Query.equal('chatId', [chatId])]
        );

        // Delete all messages
        for (const message of messagesResponse.documents) {
            await databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ID_MESSAGES,
                message.$id
            );
        }

        // Then delete the chat itself
        await databases.deleteDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_CHATS,
            chatId
        );

        return true;
    } catch (error) {
        console.error('Failed to delete chat:', error);
        throw error;
    }
};

// Clear chat history (delete all messages but keep the chat)
export const clearChatHistory = async (chatId) => {
    try {
        // Get all messages in the chat
        const messagesResponse = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_MESSAGES,
            [Query.equal('chatId', [chatId])]
        );

        // Delete all messages
        for (const message of messagesResponse.documents) {
            await databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ID_MESSAGES,
                message.$id
            );
        }

        console.log('Chat history cleared successfully');
        return true;
    } catch (error) {
        console.error('Failed to clear chat history:', error);
        throw error;
    }
};

// Avatar/Profile functions
export const uploadAvatar = async (file) => {
    try {
        const result = await storage.createFile(
            APPWRITE_BUCKET_ID_AVATARS,
            ID.unique(),
            file
        );
        return result;
    } catch (error) {
        console.error('Failed to upload avatar:', error);
        throw error;
    }
};

export const getAvatarUrl = (fileId) => {
    if (!fileId) return null;
    return storage.getFileView(APPWRITE_BUCKET_ID_AVATARS, fileId);
};

export const deleteAvatar = async (fileId) => {
    try {
        await storage.deleteFile(APPWRITE_BUCKET_ID_AVATARS, fileId);
        return true;
    } catch (error) {
        console.error('Failed to delete avatar:', error);
        throw error;
    }
};

export const updateUserProfile = async (userId, data) => {
    try {
        const result = await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_USERS,
            userId,
            data
        );

        // Clear entire user cache when profile is updated so all components refresh
        clearUserCache();
        return result;
    } catch (error) {
        console.error('Failed to update user profile:', error);
        throw error;
    }
};

// File attachment functions
export const uploadAttachment = async (file, onProgress = null) => {
    try {
        const result = await storage.createFile(
            APPWRITE_BUCKET_ID_ATTACHMENTS,
            ID.unique(),
            file
        );
        return result;
    } catch (error) {
        console.error('Failed to upload attachment:', error);
        throw error;
    }
};

export const getAttachmentUrl = (fileId) => {
    if (!fileId) return null;
    return storage.getFileView(APPWRITE_BUCKET_ID_ATTACHMENTS, fileId);
};

export const getAttachmentDownloadUrl = (fileId) => {
    if (!fileId) return null;
    return storage.getFileDownload(APPWRITE_BUCKET_ID_ATTACHMENTS, fileId);
};

export const getAttachmentPreview = (fileId, width = 400, height = 400) => {
    if (!fileId) return null;
    try {
        return storage.getFilePreview(APPWRITE_BUCKET_ID_ATTACHMENTS, fileId, width, height);
    } catch (error) {
        console.error('Failed to get attachment preview:', error);
        return null;
    }
};

export const deleteAttachment = async (fileId) => {
    try {
        await storage.deleteFile(APPWRITE_BUCKET_ID_ATTACHMENTS, fileId);
        return true;
    } catch (error) {
        console.error('Failed to delete attachment:', error);
        throw error;
    }
};

export const getAttachmentInfo = async (fileId) => {
    try {
        const result = await storage.getFile(APPWRITE_BUCKET_ID_ATTACHMENTS, fileId);
        return result;
    } catch (error) {
        console.error('Failed to get attachment info:', error);
        throw error;
    }
};

// Utility functions for file handling
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileType = (mimeType) => {
    if (!mimeType) return 'unknown';

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.includes('text/')) return 'text';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';

    return 'file';
};

// Search users by displaynameId and usernameId
export const searchUsers = async (query, excludeUserId = null) => {
    try {
        if (!query.trim()) {
            return [];
        }

        // Get all users first
        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_USERS,
            [Query.limit(100)]
        );

        // Filter users locally with case-insensitive search on both fields
        const filteredUsers = response.documents.filter(user => {
            // Exclude current user if specified
            if (excludeUserId && user.userId === excludeUserId) {
                return false;
            }

            const queryLower = query.toLowerCase().trim();
            const displaynameMatch = user.displaynameId && user.displaynameId.toLowerCase().includes(queryLower);
            const usernameMatch = user.usernameId && user.usernameId.toLowerCase().includes(queryLower);

            return displaynameMatch || usernameMatch;
        });

        // Sort results by relevance (exact matches first, then partial matches)
        const sortedResults = filteredUsers.sort((a, b) => {
            const queryLower = query.toLowerCase().trim();

            // Check for exact matches
            const aExactDisplay = a.displaynameId && a.displaynameId.toLowerCase() === queryLower;
            const bExactDisplay = b.displaynameId && b.displaynameId.toLowerCase() === queryLower;
            const aExactUsername = a.usernameId && a.usernameId.toLowerCase() === queryLower;
            const bExactUsername = b.usernameId && b.usernameId.toLowerCase() === queryLower;

            const aExact = aExactDisplay || aExactUsername;
            const bExact = bExactDisplay || bExactUsername;

            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            // Then by displaynameId alphabetically
            return (a.displaynameId || '').localeCompare(b.displaynameId || '');
        });

        return sortedResults;
    } catch (error) {
        console.error('Failed to search users:', error);
        throw error;
    }
};

// Check if username is available
export const checkUsernameAvailability = async (username, currentUserId = null) => {
    try {
        if (!username || username.trim().length === 0) {
            return { available: false, message: "Username cannot be empty" };
        }

        // Basic validation for username format
        const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
        if (!usernameRegex.test(username)) {
            return { available: false, message: "Username can only contain letters, numbers, dots, underscores, and hyphens" };
        }

        if (username.length < 3) {
            return { available: false, message: "Username must be at least 3 characters long" };
        }

        if (username.length > 30) {
            return { available: false, message: "Username must be less than 30 characters" };
        }

        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_USERS,
            [Query.equal('usernameId', username.trim().toLowerCase())]
        );

        // If user found and it's not the current user, username is taken
        if (response.documents.length > 0) {
            const existingUser = response.documents[0];
            if (!currentUserId || existingUser.$id !== currentUserId) {
                return { available: false, message: "Username is already taken" };
            }
        }

        return { available: true, message: "Username is available" };
    } catch (error) {
        console.error('Failed to check username availability:', error);
        return { available: false, message: "Error checking username availability" };
    }
};

// Group functions
export const createGroup = async (groupData) => {
    try {
        const group = await databases.createDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_GROUPS,
            ID.unique(),
            {
                name: groupData.name,
                description: groupData.description || '',
                createdBy: groupData.createdBy,
                participants: [groupData.createdBy], // Creator is automatically added
                avatarId: groupData.avatarId || null,
                isActive: true
            }
        );
        return group;
    } catch (error) {
        console.error('Failed to create group:', error);
        throw error;
    }
};

export const getUserGroups = async (userId) => {
    try {
        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_GROUPS,
            [
                Query.search('participants', userId),
                Query.equal('isActive', true),
                Query.orderDesc('$updatedAt')
            ]
        );
        return response.documents;
    } catch (error) {
        console.error('Failed to get user groups:', error);
        throw error;
    }
};

export const getGroupById = async (groupId) => {
    try {
        const group = await databases.getDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_GROUPS,
            groupId
        );
        return group;
    } catch (error) {
        console.error('Failed to get group:', error);
        throw error;
    }
};

export const updateGroup = async (groupId, updates) => {
    try {
        const group = await databases.updateDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_GROUPS,
            groupId,
            updates
        );
        return group;
    } catch (error) {
        console.error('Failed to update group:', error);
        throw error;
    }
};

export const addGroupParticipant = async (groupId, userId) => {
    try {
        const group = await getGroupById(groupId);
        if (!group.participants.includes(userId)) {
            const updatedParticipants = [...group.participants, userId];
            return await updateGroup(groupId, { participants: updatedParticipants });
        }
        return group;
    } catch (error) {
        console.error('Failed to add group participant:', error);
        throw error;
    }
};

export const removeGroupParticipant = async (groupId, userId) => {
    try {
        const group = await getGroupById(groupId);
        const updatedParticipants = group.participants.filter(id => id !== userId);
        return await updateGroup(groupId, { participants: updatedParticipants });
    } catch (error) {
        console.error('Failed to remove group participant:', error);
        throw error;
    }
};

export const deleteGroup = async (groupId) => {
    try {
        // Mark group as inactive instead of deleting
        await updateGroup(groupId, { isActive: false });

        // Optionally, delete all group messages
        const messagesResponse = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_MESSAGES,
            [Query.equal('groupId', [groupId])]
        );

        for (const message of messagesResponse.documents) {
            await databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ID_MESSAGES,
                message.$id
            );
        }

        return true;
    } catch (error) {
        console.error('Failed to delete group:', error);
        throw error;
    }
};

export const clearGroupHistory = async (groupId) => {
    try {
        const messagesResponse = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_MESSAGES,
            [Query.equal('groupId', [groupId])]
        );

        for (const message of messagesResponse.documents) {
            await databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ID_MESSAGES,
                message.$id
            );
        }

        console.log('Group history cleared successfully');
        return true;
    } catch (error) {
        console.error('Failed to clear group history:', error);
        throw error;
    }
};

// Get unread message count for chat or group
export const getUnreadCount = async (chatId = null, groupId = null, userId) => {
    try {
        let query = [];

        if (chatId) {
            query.push(Query.equal('chatId', chatId));
        } else if (groupId) {
            query.push(Query.equal('chatId', `group_${groupId}`));
        } else {
            return 0;
        }

        // Get user's last seen timestamp (we'll need to implement this)
        // For now, we'll count messages from other users in the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        query.push(Query.greaterThan('$createdAt', yesterday.toISOString()));
        query.push(Query.notEqual('senderId', userId)); // Messages not from current user

        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_MESSAGES,
            query
        );

        return response.total;
    } catch (error) {
        console.error('Failed to get unread count:', error);
        return 0;
    }
};

// Mark messages as read for a chat or group
export const markMessagesAsRead = async (chatId = null, groupId = null, userId) => {
    try {
        // For now, we'll store the last read timestamp in localStorage
        // In a production app, this should be stored in the database
        const key = chatId ? `lastRead_${chatId}` : `lastRead_group_${groupId}`;
        const timestamp = new Date().toISOString();
        localStorage.setItem(key, timestamp);

        return true;
    } catch (error) {
        console.error('Failed to mark messages as read:', error);
        return false;
    }
};

// Get improved unread count using localStorage timestamps
export const getUnreadCountImproved = async (chatId = null, groupId = null, userId) => {
    try {
        let query = [];

        if (chatId) {
            query.push(Query.equal('chatId', chatId));
        } else if (groupId) {
            query.push(Query.equal('chatId', `group_${groupId}`));
        } else {
            return 0;
        }

        // Get last read timestamp from localStorage
        const key = chatId ? `lastRead_${chatId}` : `lastRead_group_${groupId}`;
        const lastReadTimestamp = localStorage.getItem(key);

        if (lastReadTimestamp) {
            query.push(Query.greaterThan('$createdAt', lastReadTimestamp));
        }

        query.push(Query.notEqual('senderId', userId)); // Messages not from current user

        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_MESSAGES,
            query
        );

        return response.total;
    } catch (error) {
        console.error('Failed to get unread count:', error);
        return 0;
    }
};
