import React, { useState, useEffect } from "react";
import {
  account,
  getUserChats,
  getLastMessage,
  getUserById,
  getAvatarUrl,
  clearUserCache,
} from "../../lib/appwrite";
import UserSearch from "./UserSearch";

const ChatList = ({
  onSelectUser,
  onSelectChat,
  activeChat,
  refreshTrigger,
  onDeleteChat,
}) => {
  const [chats, setChats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatUsers, setChatUsers] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const getAccount = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);
        // Clear cache and load chats when component mounts
        clearUserCache();
        loadChats(user.$id);
      } catch (error) {
        console.error("Failed to get account:", error);
      }
    };
    getAccount();
  }, []);

  // Обновляем чаты когда приходит сигнал обновления
  useEffect(() => {
    if (currentUser && refreshTrigger > 0) {
      // Clear user cache to ensure fresh data
      clearUserCache();
      loadChats(currentUser.$id);
    }
  }, [refreshTrigger, currentUser]);

  const loadChats = async (userId) => {
    try {
      const userChats = await getUserChats(userId);
      setChats(userChats);

      // Load user info and last messages for each chat
      for (const chat of userChats) {
        // Find the other participant
        const otherUserId = chat.participants.find((id) => id !== userId);
        if (otherUserId) {
          const otherUser = await getUserById(otherUserId);
          console.log("Loaded user for chat:", otherUser); // Debug log
          setChatUsers((prev) => ({
            ...prev,
            [chat.$id]: otherUser,
          }));
        }

        // Get last message
        const lastMessage = await getLastMessage(chat.$id);
        setLastMessages((prev) => ({
          ...prev,
          [chat.$id]: lastMessage,
        }));
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  };

  const handleNewChat = () => {
    setShowSearch(!showSearch);
  };

  const handleUserSelect = (user) => {
    onSelectUser(user);
    setShowSearch(false);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  return (
    <div className="w-full md:w-1/4 lg:w-80 bg-surface border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-on-surface">
            Chats
          </h2>
          <button
            onClick={handleNewChat}
            className="p-2 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors touch-manipulation"
            title="New chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
          </button>
        </div>

        {showSearch && (
          <div className="border-t border-border pt-4">
            <UserSearch onSelectUser={handleUserSelect} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => {
          const otherUser = chatUsers[chat.$id];
          const lastMessage = lastMessages[chat.$id];
          const isActive = activeChat && activeChat.$id === chat.$id;

          return (
            <div
              key={chat.$id}
              className={`group relative p-4 border-b border-border hover:bg-surface-variant transition-colors ${
                isActive ? "bg-primary/10" : ""
              }`}
            >
              <div
                onClick={() => onSelectChat(chat)}
                className="flex items-center space-x-3 cursor-pointer"
              >
                {/* User avatar */}
                {otherUser && otherUser.avatarId ? (
                  <img
                    src={getAvatarUrl(otherUser.avatarId)}
                    alt={otherUser.name}
                    className="w-10 h-10 rounded-full object-cover"
                    onLoad={() =>
                      console.log(
                        "Avatar loaded:",
                        otherUser.name,
                        otherUser.avatarId
                      )
                    }
                    onError={(e) => {
                      console.log(
                        "Avatar failed to load:",
                        otherUser.avatarId,
                        e
                      );
                      // Fallback to initial if image fails to load
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-on-secondary font-semibold ${
                    otherUser && otherUser.avatarId ? "hidden" : ""
                  }`}
                >
                  {otherUser ? otherUser.name.charAt(0).toUpperCase() : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-on-surface truncate">
                      {otherUser ? otherUser.name : "Loading..."}
                    </h3>
                    {lastMessage && (
                      <span className="text-xs text-on-surface/60">
                        {formatTime(lastMessage.$createdAt)}
                      </span>
                    )}
                  </div>
                  {lastMessage && (
                    <p className="text-sm text-on-surface/70 truncate flex items-center">
                      {lastMessage.text ? (
                        lastMessage.text
                      ) : lastMessage.attachments &&
                        lastMessage.attachments.length > 0 ? (
                        <>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="mr-1"
                          >
                            <path d="M16.5,6V17.5A4,4 0 0,1 12.5,21.5A4,4 0 0,1 8.5,17.5V5A2.5,2.5 0 0,1 11,2.5A2.5,2.5 0 0,1 13.5,5V15.5A1,1 0 0,1 12.5,16.5A1,1 0 0,1 11.5,15.5V6H10V15.5A2.5,2.5 0 0,0 12.5,18A2.5,2.5 0 0,0 15,15.5V5A4,4 0 0,0 11,1A4,4 0 0,0 7,5V17.5A5.5,5.5 0 0,0 12.5,23A5.5,5.5 0 0,0 18,17.5V6H16.5Z" />
                          </svg>
                          Attachment
                        </>
                      ) : (
                        ""
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.$id);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-error hover:bg-error/10 rounded transition-all duration-200"
                title="Delete chat"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            </div>
          );
        })}

        {chats.length === 0 && !showSearch && (
          <div className="p-4 text-center text-on-surface/60">
            <p>No chats</p>
            <p className="text-sm mt-1">Click + to start a new chat</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
