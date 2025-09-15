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
export const APPWRITE_BUCKET_ID_AVATARS = import.meta.env.VITE_APPWRITE_BUCKET_ID_AVATARS;

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

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

// Get last message for a chat
export const getLastMessage = async (chatId) => {
    try {
        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_MESSAGES,
            [Query.equal('chatId', chatId), Query.orderDesc('$createdAt'), Query.limit(1)]
        );
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
};// Avatar/Profile functions
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

export { client, account, databases, storage };
