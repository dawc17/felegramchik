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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Debug activeChat changes
  useEffect(() => {
    // Only log in development
    if (process.env.NODE_ENV === "development") {
      console.log("Chat.jsx: activeChat changed to:", activeChat);
    }
  }, [activeChat]);

  // Close mobile menu when chat is selected
  useEffect(() => {
    if (activeChat) {
      setIsMobileMenuOpen(false);
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

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleBackToChats = () => {
    setActiveChat(null);
    setShowChatList(true);
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
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-secondary text-on-secondary shadow-sm">
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 hover:bg-secondary-variant rounded-lg transition-colors mr-3"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
            </svg>
          </button>

          {/* Back button on mobile when chat is active */}
          {activeChat && (
            <button
              onClick={handleBackToChats}
              className="md:hidden p-2 hover:bg-secondary-variant rounded-lg transition-colors mr-3"
              aria-label="Back to chats"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
              </svg>
            </button>
          )}

          <h1 className="text-lg sm:text-xl font-bold">Felegramchik</h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
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
            className="px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium bg-primary text-on-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex flex-1 relative">
        {/* Chat List - Desktop: always visible, Mobile: slide-in menu */}
        <div
          className={`
          md:block md:w-80 lg:w-96 bg-surface border-r border-border h-full
          ${
            isMobileMenuOpen
              ? "fixed inset-y-0 left-0 w-80 z-50 transform translate-x-0"
              : "hidden md:block md:relative"
          }
          transition-transform duration-300 ease-in-out
        `}
        >
          <ChatList
            onSelectUser={handleSelectUser}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            activeChat={activeChat}
            refreshTrigger={refreshChatList}
          />
        </div>

        {/* Chat Content */}
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
            <div className="flex items-center justify-center h-full bg-surface p-6">
              <div className="text-center max-w-sm">
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
                <p className="text-on-surface/60 text-lg mb-2">
                  Select a chat to start messaging
                </p>
                <p className="text-on-surface/40 text-sm">
                  Click <span className="md:hidden">the menu button</span>
                  <span className="hidden md:inline">+</span> to find a user
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
