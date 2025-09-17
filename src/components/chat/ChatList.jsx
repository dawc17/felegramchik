import React, { useState, useEffect, useMemo } from "react";
import {
  account,
  getUserChats,
  getUserGroups,
  getLastMessage,
  getUnreadCountImproved,
  getUserById,
  getAvatarUrl,
  clearUserCache,
} from "../../lib/appwrite";
import UserSearch from "./UserSearch";
import CreateGroup from "./CreateGroup";

const ChatList = ({
  onSelectUser,
  onSelectChat,
  onSelectGroup,
  activeChat,
  refreshTrigger,
}) => {
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [chatUsers, setChatUsers] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [lastMessageSenders, setLastMessageSenders] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Function to update unread count for a specific chat/group
  const updateUnreadCount = async (chatId = null, groupId = null) => {
    if (!currentUser) return;

    try {
      const unreadCount = await getUnreadCountImproved(chatId, groupId, currentUser.$id);
      const key = chatId || `group_${groupId}`;
      setUnreadCounts((prev) => ({
        ...prev,
        [key]: unreadCount,
      }));

      // Also update last message and sender for groups
      if (groupId) {
        const lastMessage = await getLastMessage(null, groupId);
        setLastMessages((prev) => ({
          ...prev,
          [`group_${groupId}`]: lastMessage,
        }));

        // Get sender info for last message if it exists
        if (lastMessage && lastMessage.senderId) {
          try {
            const sender = await getUserById(lastMessage.senderId);
            setLastMessageSenders((prev) => ({
              ...prev,
              [`group_${groupId}`]: sender,
            }));
          } catch (error) {
            console.error('Failed to get sender info:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update unread count:', error);
    }
  };

  useEffect(() => {
    const getAccount = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);
        // Clear cache and load chats when component mounts
        clearUserCache();
        console.log('Loading chats and groups for user:', user.$id);
        loadChats(user.$id);
        loadGroups(user.$id);
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
      loadGroups(currentUser.$id);
    }
  }, [refreshTrigger, currentUser]);

  // Update unread count when active chat changes
  useEffect(() => {
    if (activeChat && currentUser) {
      // Small delay to allow markMessagesAsRead to complete
      setTimeout(() => {
        if (activeChat.participants) {
          // It's a group
          updateUnreadCount(null, activeChat.$id);
        } else {
          // It's a regular chat
          updateUnreadCount(activeChat.$id, null);
        }
      }, 500);
    }
  }, [activeChat, currentUser]);

  const loadChats = async (userId) => {
    try {
      const userChats = await getUserChats(userId);

      // Load other users and last messages for chats
      const chatData = [];
      for (const chat of userChats) {
        const otherUserId = chat.participants.find((id) => id !== userId);

        if (otherUserId) {
          // Load other user data if not already cached
          if (!chatUsers[chat.$id]) {
            const otherUser = await getUserById(otherUserId);
            setChatUsers((prev) => ({
              ...prev,
              [chat.$id]: otherUser,
            }));
          }
        }

        const lastMessage = await getLastMessage(chat.$id);
        setLastMessages((prev) => ({
          ...prev,
          [chat.$id]: lastMessage,
        }));

        // Get unread count for chat
        const unreadCount = await getUnreadCountImproved(chat.$id, null, userId);
        setUnreadCounts((prev) => ({
          ...prev,
          [chat.$id]: unreadCount,
        }));

        chatData.push({
          ...chat,
          lastMessageTime: lastMessage?.$createdAt || chat.$createdAt,
        });
      }

      // Sort chats by last message time (most recent first)
      chatData.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      setChats(chatData);
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  };

  const loadGroups = async (userId) => {
    try {
      console.log('Loading groups for user:', userId);
      const userGroups = await getUserGroups(userId);
      console.log('Found groups:', userGroups.length);

      // Load last messages and unread counts for groups
      const groupData = [];
      for (const group of userGroups) {
        console.log('Processing group:', group.name, 'ID:', group.$id);
        const lastMessage = await getLastMessage(null, group.$id);
        console.log('Last message for group', group.name, ':', lastMessage);

        setLastMessages((prev) => ({
          ...prev,
          [`group_${group.$id}`]: lastMessage,
        }));

        // Get sender info for last message if it exists
        if (lastMessage && lastMessage.senderId) {
          console.log('Loading sender for group:', group.name, 'senderId:', lastMessage.senderId);
          try {
            const sender = await getUserById(lastMessage.senderId);
            console.log('Sender loaded:', sender);
            setLastMessageSenders((prev) => ({
              ...prev,
              [`group_${group.$id}`]: sender,
            }));
          } catch (error) {
            console.error('Failed to get sender info:', error);
          }
        } else {
          console.log('No last message or senderId for group:', group.name);
        }

        // Get unread count for group
        const unreadCount = await getUnreadCountImproved(null, group.$id, userId);
        setUnreadCounts((prev) => ({
          ...prev,
          [`group_${group.$id}`]: unreadCount,
        }));

        groupData.push({
          ...group,
          lastMessageTime: lastMessage?.$createdAt || group.$createdAt,
        });
      }

      // Sort groups by last message time (most recent first)
      groupData.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      setGroups(groupData);
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  };

  const handleNewChat = () => {
    setShowSearch(!showSearch);
  };

  const handleUserSelect = (user) => {
    onSelectUser(user);
    setShowSearch(false);
  };

  const handleGroupCreated = (group) => {
    setGroups(prev => [group, ...prev]);
    setShowCreateGroup(false);
  };

  const handleGroupSelect = (group) => {
    if (onSelectGroup) {
      onSelectGroup(group);
    }
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

  // Combine and sort all chats and groups by last message time
  const getAllConversations = useMemo(() => {
    const conversations = [];

    // Add chats
    chats.forEach(chat => {
      conversations.push({
        ...chat,
        type: 'chat',
        lastMessageTime: lastMessages[chat.$id]?.$createdAt || chat.$createdAt,
      });
    });

    // Add groups
    groups.forEach(group => {
      conversations.push({
        ...group,
        type: 'group',
        lastMessageTime: lastMessages[`group_${group.$id}`]?.$createdAt || group.$createdAt,
      });
    });

    // Sort by last message time (most recent first)
    return conversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
  }, [chats, groups, lastMessages]);

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            Chats
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handleNewChat}
              className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors touch-manipulation"
              title="New chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </button>

            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors touch-manipulation"
              title="Create group"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-1c0-1.38 2.24-2.5 5-2.5.34 0 .68.02 1 .07.05-.39.12-.77.22-1.13-.41-.05-.82-.08-1.22-.08C5.48 13.36 2 14.84 2 17v2h8.5c-.11-.31-.17-.65-.17-1H4zM9 12c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM19 17h-2v-2c0-.55-.45-1-1-1s-1 .45-1 1v2h-2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1z" />
              </svg>
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="border-t border-gray-200 pt-4">
            <UserSearch onSelectUser={handleUserSelect} />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar scrollbar-thumb-slate-400 scrollbar-track-slate-100 dark:scrollbar-thumb-slate-700 dark:scrollbar-track-gray-800">
        {getAllConversations.map((conversation) => {
          if (conversation.type === 'chat') {
            const otherUser = chatUsers[conversation.$id];
            const lastMessage = lastMessages[conversation.$id];
            const unreadCount = unreadCounts[conversation.$id] || 0;
            const isActive = activeChat && activeChat.$id === conversation.$id;

            return (
              <div
                key={conversation.$id}
                onClick={() => onSelectChat(conversation)}
                className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${isActive ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700" : ""
                  }`}
              >
                <div className="flex items-center space-x-3">
                  {/* User avatar */}
                  {otherUser && otherUser.avatarId ? (
                    <img
                      src={getAvatarUrl(otherUser.avatarId)}
                      alt={otherUser.displaynameId || otherUser.usernameId || "User"}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        // Fallback to initial if image fails to load
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold ${otherUser && otherUser.avatarId ? "hidden" : ""
                      }`}
                  >
                    {otherUser ? (otherUser.displaynameId?.charAt(0) || otherUser.usernameId?.charAt(0) || "U").toUpperCase() : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {otherUser ? (otherUser.displaynameId || otherUser.usernameId) : "Loading..."}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {lastMessage && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(lastMessage.$createdAt)}
                          </span>
                        )}
                        {unreadCount > 0 && (
                          <div className="bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                    {lastMessage && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate flex items-center">
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
              </div>
            );
          } else {
            // Group conversation
            const lastMessage = lastMessages[`group_${conversation.$id}`];
            const lastMessageSender = lastMessageSenders[`group_${conversation.$id}`];
            const unreadCount = unreadCounts[`group_${conversation.$id}`] || 0;
            const isActive = activeChat && activeChat.$id === conversation.$id && !activeChat.participants;

            return (
              <div
                key={`group_${conversation.$id}`}
                onClick={() => handleGroupSelect(conversation)}
                className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 touch-manipulation ${isActive ? "bg-green-50 dark:bg-green-900/20" : ""
                  }`}
              >
                <div className="flex items-center">
                  {conversation.avatarId ? (
                    <img
                      src={getAvatarUrl(conversation.avatarId)}
                      alt={conversation.name}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold ${conversation.avatarId ? "hidden" : ""}`}
                  >
                    {conversation.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {conversation.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {lastMessage && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(lastMessage.$createdAt)}
                          </span>
                        )}
                        {unreadCount > 0 && (
                          <div className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {lastMessage ? (
                          <>
                            {lastMessageSender ? (
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {lastMessage.senderId === currentUser?.$id
                                  ? "Вы"
                                  : (lastMessageSender.displaynameId || lastMessageSender.usernameId)
                                }:
                              </span>
                            ) : lastMessage.senderId === currentUser?.$id ? (
                              <span className="font-medium text-gray-800 dark:text-gray-200">Вы: </span>
                            ) : null}
                            <span className={lastMessageSender || lastMessage.senderId === currentUser?.$id ? "ml-1" : ""}>
                              {lastMessage.text ? lastMessage.text : "📎 Attachment"}
                            </span>
                          </>
                        ) : (
                          "No messages"
                        )}
                      </p>
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{conversation.participants.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
        })}

        {chats.length === 0 && groups.length === 0 && !showSearch && (
          <div className="p-4 text-center text-gray-500">
            <p>No chats or groups</p>
            <p className="text-sm mt-1">Click + to start a new chat or create a group</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroup
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        currentUser={currentUser}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
};

export default ChatList;