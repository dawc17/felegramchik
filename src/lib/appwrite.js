import { Client, Account, Databases } from "appwrite";

export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
export const APPWRITE_COLLECTION_ID_MESSAGES = import.meta.env.VITE_APPWRITE_COLLECTION_ID_MESSAGES;
export const APPWRITE_COLLECTION_ID_USERS = import.meta.env.VITE_APPWRITE_COLLECTION_ID_USERS;
export const APPWRITE_COLLECTION_ID_CHATS = import.meta.env.VITE_APPWRITE_COLLECTION_ID_CHATS;

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
