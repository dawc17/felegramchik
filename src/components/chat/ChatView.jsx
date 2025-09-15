import React, { useState, useEffect, useRef } from 'react';
import { client, databases, account, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID_MESSAGES, getUserById, getAvatarUrl } from '../../lib/appwrite';
import { Query } from 'appwrite';

const ChatView = ({ chatId }) => {
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [messageUsers, setMessageUsers] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const getAccount = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to get current user:', err);
      }
    };
    getAccount();
  }, []);

  useEffect(() => {
    if (!chatId) return;

    // Очистить данные при смене чата
    setMessages([]);
    setMessageUsers({});

    const getMessages = async () => {
      try {
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID_MESSAGES,
          [Query.equal('chatId', chatId), Query.orderAsc('$createdAt')]
        );
        setMessages(response.documents);

        // Load user info for messages
        const userIds = [...new Set(response.documents.map(msg => msg.senderId))];
        const usersData = {};

        for (const userId of userIds) {
          try {
            const user = await getUserById(userId);
            if (user) {
              usersData[userId] = user;
            }
          } catch (error) {
            console.error('Failed to load user:', userId, error);
          }
        }

        setMessageUsers(usersData);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    getMessages();

    const unsubscribe = client.subscribe(
      `databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_COLLECTION_ID_MESSAGES}.documents`,
      async (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          if (response.payload.chatId === chatId) {
            setMessages((prevMessages) => [...prevMessages, response.payload]);

            // Load user info for new message
            const senderId = response.payload.senderId;
            setMessageUsers(prevUsers => {
              if (!prevUsers[senderId]) {
                // Асинхронно загрузить данные пользователя
                getUserById(senderId).then(user => {
                  if (user) {
                    setMessageUsers(prev => ({
                      ...prev,
                      [senderId]: user
                    }));
                  }
                }).catch(error => {
                  console.error('Failed to load user for new message:', senderId, error);
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
  }, [chatId]);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }; if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <p className="text-on-surface/60">Select a chat to view messages</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-on-surface/60">No messages yet</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = currentUser && message.senderId === currentUser.$id;
            const sender = messageUsers[message.senderId];

            return (
              <div
                key={message.$id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
              >
                {!isOwn && (
                  <div className="flex-shrink-0 mr-2">
                    {sender && sender.avatarId ? (
                      <img
                        src={getAvatarUrl(sender.avatarId)}
                        alt={sender.name}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          // Fallback to initial if image fails to load
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-on-secondary text-xs font-semibold ${sender && sender.avatarId ? 'hidden' : ''
                        }`}
                    >
                      {sender ? sender.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwn
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-variant text-on-surface'
                    }`}
                >
                  {!isOwn && (
                    <p className="text-xs font-medium mb-1 text-primary">
                      {sender ? sender.name : 'Loading...'}
                    </p>
                  )}
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-on-primary/70' : 'text-on-surface/60'
                    }`}>
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
};

export default ChatView;
