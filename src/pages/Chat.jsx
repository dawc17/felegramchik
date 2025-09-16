import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  databases,
  deleteChat,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_ID_CHATS,
} from "../lib/appwrite";
import ChatList from "../components/chat/ChatList";
import ChatView from "../components/chat/ChatView";
import MessageInput from "../components/chat/MessageInput";
import { Query, ID, Permission, Role } from "appwrite";

const Chat = () => {
  const navigate = useNavigate();
  const { user: currentUser, logout } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [refreshChatList, setRefreshChatList] = useState(0);

  // Debug activeChat changes
  useEffect(() => {
    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.log("Chat.jsx: activeChat changed to:", activeChat);
    }
  }, [activeChat]);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        navigate("/login");
      }
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleSelectUser = async (user) => {
    if (!currentUser) return;

    // Prevent creating a chat with yourself
    if (user.$id === currentUser.$id || user.userId === currentUser.$id) {
      console.error("Cannot create chat with yourself");
      return;
    }

    const participants = [currentUser.$id, user.$id].sort();

    try {
      // Get all chats and find exact participants match
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID_CHATS
      );

      // Find chat with exact participants match
      const existingChat = response.documents.find((chat) => {
        const chatParticipants = chat.participants.sort();
        const targetParticipants = participants.sort();
        return (
          JSON.stringify(chatParticipants) ===
          JSON.stringify(targetParticipants)
        );
      });

      if (existingChat) {
        setActiveChat(existingChat);
      } else {
        // Create a new chat
        const newChat = await databases.createDocument(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID_CHATS,
          ID.unique(),
          {
            participants: participants,
          },
          [Permission.read(Role.users()), Permission.write(Role.users())]
        );
        setActiveChat(newChat);
      }

      // Обновить список чатов
      setRefreshChatList((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to select or create chat:", error);
    }
  };

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
  };

  const handleDeleteChat = async (chatId) => {
    if (!chatId) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to delete this chat? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await deleteChat(chatId);

      // If the deleted chat was active, clear active chat
      if (activeChat && activeChat.$id === chatId) {
        setActiveChat(null);
      }

      // Refresh chat list
      setRefreshChatList((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      alert("Failed to delete chat. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between p-4 bg-secondary text-on-secondary">
        <h1 className="text-xl font-bold">Felegramchik</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate("/profile")}
            className="p-2 hover:bg-secondary-variant rounded-full transition-colors"
            title="Profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium bg-primary text-on-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex flex-1">
        <ChatList
          onSelectUser={handleSelectUser}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          activeChat={activeChat}
          refreshTrigger={refreshChatList}
        />
        <div className="flex flex-col flex-1">
          {activeChat ? (
            <>
              <ChatView chatId={activeChat.$id} />
              <MessageInput
                chatId={activeChat.$id}
                participants={activeChat.participants}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-surface">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-primary"
                  >
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                  </svg>
                </div>
                <p className="text-on-surface/60 text-lg">
                  Select a chat to start messaging
                </p>
                <p className="text-on-surface/40 text-sm mt-2">
                  Click + in chat list to find a user
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Chat;
