import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  client,
  databases,
  account,
  APPWRITE_DATABASE_ID,
  APPWRITE_COLLECTION_ID_MESSAGES,
  getUserById,
  getAvatarUrl,
} from "../../lib/appwrite";
import { Query } from "appwrite";
import FileAttachment from "./FileAttachment";

const ChatView = forwardRef(({ chatId, groupId }, ref) => {
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageUsers, setMessageUsers] = useState({});
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToMessage = (messageId) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight the message briefly
      messageElement.style.backgroundColor = "rgba(var(--primary-rgb), 0.2)";
      setTimeout(() => {
        messageElement.style.backgroundColor = "";
      }, 2000);
    }
  };

  // Expose scrollToMessage function to parent
  useImperativeHandle(ref, () => ({
    scrollToMessage
  }), []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const getAccount = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to get current user:", err);
      }
    };
    getAccount();
  }, []);

  useEffect(() => {
    if (!chatId && !groupId) return;

    // Очистить данные при смене чата
    setMessages([]);
    setMessageUsers({});

    const getMessages = async () => {
      try {
        let query = [];

        if (chatId) {
          query.push(Query.equal("chatId", chatId));
        } else if (groupId) {
          // Временно используем chatId для групп с префиксом
          query.push(Query.equal("chatId", `group_${groupId}`));
        }

        query.push(Query.orderAsc("$createdAt"));

        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID_MESSAGES,
          query
        );
        setMessages(response.documents);

        // Load user info for messages
        const userIds = [
          ...new Set(response.documents.map((msg) => msg.senderId)),
        ];
        const usersData = {};

        for (const userId of userIds) {
          try {
            const user = await getUserById(userId);
            if (user) {
              usersData[userId] = user;
            }
          } catch (error) {
            console.error("Failed to load user:", userId, error);
          }
        }

        setMessageUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    getMessages();
  }, [chatId, groupId]);

  // Подписка на real-time обновления сообщений
  useEffect(() => {
    if (!chatId && !groupId) return;

    const unsubscribe = client.subscribe(
      `databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_COLLECTION_ID_MESSAGES}.documents`,
      async (response) => {
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create"
          )
        ) {
          // Проверяем, что сообщение относится к нашему чату или группе
          const isRelevant = (chatId && response.payload.chatId === chatId) ||
            (groupId && response.payload.chatId === `group_${groupId}`);

          if (isRelevant) {
            setMessages((prevMessages) => [...prevMessages, response.payload]);

            // Load user info for new message
            const senderId = response.payload.senderId;
            setMessageUsers((prevUsers) => {
              if (!prevUsers[senderId]) {
                // Асинхронно загрузить данные пользователя
                getUserById(senderId)
                  .then((user) => {
                    if (user) {
                      setMessageUsers((prev) => ({
                        ...prev,
                        [senderId]: user,
                      }));
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "Failed to load user for new message:",
                      senderId,
                      error
                    );
                  });
              }
              return prevUsers;
            });
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [chatId, groupId]);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  if (!chatId && !groupId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-gray-500">Выберите чат или группу для просмотра сообщений</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center px-4">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = currentUser && message.senderId === currentUser.$id;
            const sender = messageUsers[message.senderId];

            return (
              <div
                key={message.$id}
                ref={(el) => (messageRefs.current[message.$id] = el)}
                className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3 sm:mb-4 transition-colors duration-500`}
              >
                {!isOwn && (
                  <div className="flex-shrink-0 mr-2 sm:mr-3">
                    {sender && sender.avatarId ? (
                      <img
                        src={getAvatarUrl(sender.avatarId)}
                        alt={sender.displaynameId || sender.usernameId || "User"}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold ${sender && sender.avatarId ? "hidden" : ""
                        }`}
                    >
                      {sender ? (sender.displaynameId?.charAt(0) || sender.usernameId?.charAt(0) || "U").toUpperCase() : "?"}
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-3 py-2 sm:px-4 sm:py-3 rounded-lg ${isOwn
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-900"
                    }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-medium mb-1 text-purple-600">
                      {sender ? (sender.displaynameId || sender.usernameId) : "Loading..."}
                    </p>
                  )}                  {/* Display attachments if they exist */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mb-2">
                      {message.attachments.map((fileId, index) => (
                        <FileAttachment key={index} attachment={{ fileId }} />
                      ))}
                    </div>
                  )}

                  {/* Display text message if it exists */}
                  {message.text && (
                    <p className="text-sm sm:text-base break-words">
                      {message.text}
                    </p>
                  )}

                  <p
                    className={`text-xs mt-1 ${isOwn ? "text-white/70" : "text-gray-500"
                      }`}
                  >
                    {formatTime(message.$createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});

ChatView.displayName = 'ChatView';

export default ChatView;
