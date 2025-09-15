import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { account, databases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID_CHATS } from '../lib/appwrite';
import ChatList from '../components/chat/ChatList';
import ChatView from '../components/chat/ChatView';
import MessageInput from '../components/chat/MessageInput';
import { Query, ID, Permission, Role } from 'appwrite';

const Chat = () => {
  const navigate = useNavigate();
  const [activeChat, setActiveChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const getAccount = async () => {
        try {
            const user = await account.get();
            setCurrentUser(user);
        } catch (err) {
            console.error(err);
        }
    }
    getAccount();
  }, []);

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleSelectUser = async (user) => {
    if (!currentUser) return;

    // Prevent creating a chat with yourself
    if (user.$id === currentUser.$id || user.userId === currentUser.$id) {
      console.error('Cannot create chat with yourself');
      return;
    }

    const participants = [currentUser.$id, user.$id].sort();

    try {
      // Check if a chat already exists
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID_CHATS,
        [Query.equal('participants', participants)]
      );

      if (response.documents.length > 0) {
        setActiveChat(response.documents[0]);
      } else {
        // Create a new chat
        const newChat = await databases.createDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID_CHATS,
          ID.unique(),
          {
            participants: participants,
          },
          [
            Permission.read(Role.user(participants[0])),
            Permission.read(Role.user(participants[1])),
          ]
        );
        setActiveChat(newChat);
      }
    } catch (error) {
      console.error('Failed to select or create chat:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between p-4 bg-secondary text-white">
        <h1 className="text-xl font-bold">Chat</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-black bg-accent border border-transparent rounded-md shadow-sm hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
        >
          Logout
        </button>
      </header>
      <main className="flex flex-1">
        <ChatList onSelectUser={handleSelectUser} />
        <div className="flex flex-col flex-1">
          {activeChat ? (
            <>
              <ChatView chatId={activeChat.$id} />
              <MessageInput chatId={activeChat.$id} participants={activeChat.participants} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a user to start chatting.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Chat;
