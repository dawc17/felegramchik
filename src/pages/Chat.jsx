import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  databases,
  deleteChat,
  clearChatHistory,
  getAvatarUrl,
  markMessagesAsRead,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_ID_CHATS,
} from "../lib/appwrite";
import ChatList from "../components/chat/ChatList";
import ChatView from "../components/chat/ChatView";
import ChatHeader from "../components/chat/ChatHeader";
import UserProfile from "../components/chat/UserProfile";
import PersonalProfile from "../components/chat/PersonalProfile";
import MessageInput from "../components/chat/MessageInput";
import { Query, ID, Permission, Role } from "appwrite";

const Chat = () => {
  const navigate = useNavigate();
  const { user: currentUser, userProfile, logout, refreshUser } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [refreshChatList, setRefreshChatList] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isPersonalProfileOpen, setIsPersonalProfileOpen] = useState(false);
  const chatViewRef = useRef(null);

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
        // Mark messages as read when opening existing chat
        if (currentUser) {
          await markMessagesAsRead(existingChat.$id, null, currentUser.$id);
        }
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
      setIsMobileMenuOpen(false); // Close mobile menu when new chat is created
    } catch (error) {
      console.error("Failed to select or create chat:", error);
    }
  };

  const handleSelectChat = async (chat) => {
    setActiveChat(chat);
    setIsMobileMenuOpen(false); // Close mobile menu when chat is selected

    // Mark messages as read when opening a chat
    if (currentUser) {
      await markMessagesAsRead(chat.$id, null, currentUser.$id);
      // Trigger refresh to update unread counts
      setRefreshChatList((prev) => prev + 1);
    }
  };

  const handleSelectGroup = async (group) => {
    setActiveChat(group);
    setIsMobileMenuOpen(false); // Close mobile menu when group is selected

    // Mark messages as read when opening a group
    if (currentUser) {
      await markMessagesAsRead(null, group.$id, currentUser.$id);
      // Trigger refresh to update unread counts
      setRefreshChatList((prev) => prev + 1);
    }
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

  const handleUserProfileClick = (user) => {
    setSelectedUserProfile(user);
    setIsUserProfileOpen(true);
  };

  const handleCloseUserProfile = () => {
    setIsUserProfileOpen(false);
    setSelectedUserProfile(null);
  };

  const handleOpenPersonalProfile = () => {
    setIsPersonalProfileOpen(true);
  };

  const handleClosePersonalProfile = () => {
    setIsPersonalProfileOpen(false);
  };

  const handlePersonalProfileUpdate = async () => {
    // Refresh user data from Appwrite
    try {
      await refreshUser();
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  const handleClearHistoryFromProfile = async () => {
    if (!activeChat) return;

    try {
      await clearChatHistory(activeChat.$id);
      // Refresh the chat to reflect changes
      setRefreshChatList((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      alert("Error clearing history");
    }
  };

  const handleDeleteChatFromProfile = async () => {
    if (!activeChat) return;

    try {
      await deleteChat(activeChat.$id);
      setActiveChat(null);
      setRefreshChatList((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      alert("Error deleting chat");
    }
  };

  const handleScrollToMessage = (messageId) => {
    if (chatViewRef.current && chatViewRef.current.scrollToMessage) {
      chatViewRef.current.scrollToMessage(messageId);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-purple-600 text-white shadow-sm h-16">
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 hover:bg-purple-700 rounded-lg transition-colors mr-3"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />
            </svg>
          </button>

          <h1 className="text-lg sm:text-xl font-bold">Felegramchik</h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={handleOpenPersonalProfile}
            className="relative p-1 hover:bg-purple-700 rounded-full transition-colors"
            title="My Profile"
          >
            {userProfile?.avatarId ? (
              <>
                <img
                  src={getAvatarUrl(userProfile.avatarId)}
                  alt="My Profile"
                  className="w-8 h-8 rounded-full object-cover border-2 border-purple-300"
                  onError={(e) => {
                    // Fallback to initial if image fails to load
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
                <div
                  className="w-8 h-8 bg-purple-300 rounded-full flex items-center justify-center border-2 border-purple-300 hidden"
                >
                  <span className="text-purple-800 font-semibold text-sm">
                    {userProfile?.name?.charAt(0)?.toUpperCase() || currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </>
            ) : (
              <div className="w-8 h-8 bg-purple-300 rounded-full flex items-center justify-center border-2 border-purple-300">
                <span className="text-purple-800 font-semibold text-sm">
                  {userProfile?.name?.charAt(0)?.toUpperCase() || currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </button>
        </div>
      </header>      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed top-16 left-0 right-0 bottom-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex flex-1 relative overflow-hidden">
        {/* Chat List - Desktop: always visible, Mobile: slide-in menu */}
        <div
          className={`
          md:block md:w-80 lg:w-96 bg-white border-r border-gray-200 h-full
          ${isMobileMenuOpen
              ? "fixed top-16 left-0 right-0 bottom-0 z-50 w-full"
              : "hidden md:block md:relative"
            }
          transition-transform duration-300 ease-in-out
        `}
        >
          <ChatList
            onSelectUser={handleSelectUser}
            onSelectChat={handleSelectChat}
            onSelectGroup={handleSelectGroup}
            activeChat={activeChat}
            refreshTrigger={refreshChatList}
          />
        </div>

        {/* Chat Content */}
        <div className={`flex flex-col flex-1 ${isMobileMenuOpen ? "hidden md:flex" : ""}`}>
          {activeChat ? (
            <>
              <ChatHeader
                chatId={activeChat && activeChat.participants && activeChat.participants.length === 2 ? activeChat.$id : null}
                groupId={activeChat && activeChat.name ? activeChat.$id : null}
                isGroup={!!activeChat?.name}
                chatData={activeChat}
                onUserProfileClick={handleUserProfileClick}
                onGroupProfileClick={() => {
                  // Refresh if needed
                  setRefreshChatList((prev) => prev + 1);
                }}
                onChatDelete={(chatId) => {
                  setActiveChat(null);
                  setRefreshChatList((prev) => prev + 1);
                }}
                onScrollToMessage={handleScrollToMessage}
                currentUserId={currentUser?.$id}
              />
              <ChatView
                chatId={activeChat && activeChat.participants && activeChat.participants.length === 2 ? activeChat.$id : null}
                groupId={activeChat && activeChat.name ? activeChat.$id : null}
                ref={chatViewRef}
              />
              <MessageInput
                chatId={activeChat && activeChat.participants && activeChat.participants.length === 2 ? activeChat.$id : null}
                groupId={activeChat && activeChat.name ? activeChat.$id : null}
                participants={activeChat?.participants || []}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-white p-6">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-purple-600"
                  >
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg mb-2">
                  Select a chat to start messaging
                </p>
                <p className="text-gray-400 text-sm">
                  Click <span className="md:hidden">the menu button</span>
                  <span className="hidden md:inline">+</span> to find a user
                </p>
              </div>
            </div>
          )}
        </div>
      </main>      {/* User Profile Modal */}
      <UserProfile
        user={selectedUserProfile}
        isOpen={isUserProfileOpen}
        onClose={handleCloseUserProfile}
        onClearHistory={handleClearHistoryFromProfile}
        onDeleteChat={handleDeleteChatFromProfile}
      />

      {/* Personal Profile Modal */}
      <PersonalProfile
        user={userProfile || currentUser}
        isOpen={isPersonalProfileOpen}
        onClose={handleClosePersonalProfile}
        onUpdate={handlePersonalProfileUpdate}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default Chat;
