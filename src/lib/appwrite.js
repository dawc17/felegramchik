import { Client, Account, Databases } from "appwrite";
import { Query } from "appwrite";

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

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

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
        console.log('Deleting chat with ID:', chatId);

        // First, delete all messages in the chat
        console.log('Fetching messages for chat...');
        const messagesResponse = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_MESSAGES,
            [Query.equal('chatId', [chatId])]
        );

        console.log(`Found ${messagesResponse.documents.length} messages to delete`);

        // Delete all messages
        for (const message of messagesResponse.documents) {
            console.log('Deleting message:', message.$id);
            await databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ID_MESSAGES,
                message.$id
            );
        }

        // Then delete the chat itself
        console.log('Deleting chat document...');
        await databases.deleteDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID_CHATS,
            chatId
        );

        console.log('Chat deleted successfully');
        return true;
    } catch (error) {
        console.error('Failed to delete chat:', error);
        throw error;
    }
};

export { client, account, databases };
