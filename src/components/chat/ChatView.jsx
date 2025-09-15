import React, { useState, useEffect } from 'react';
import { client, databases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID_MESSAGES } from '../../lib/appwrite';
import { Query } from 'appwrite';

const ChatView = ({ chatId }) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!chatId) return;

    const getMessages = async () => {
      try {
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          APPWRITE_COLLECTION_ID_MESSAGES,
          [Query.equal('chatId', chatId), Query.orderAsc('$createdAt')]
        );
        setMessages(response.documents);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    getMessages();

    const unsubscribe = client.subscribe(
      `databases.${APPWRITE_DATABASE_ID}.collections.${APPWRITE_COLLECTION_ID_MESSAGES}.documents`,
      (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
            if (response.payload.chatId === chatId) {
                setMessages((prevMessages) => [...prevMessages, response.payload]);
            }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [chatId]);

  return (
    <div className="flex-1 p-4">
      {messages.map((message) => (
        <div key={message.$id} className="mb-2">
          {message.text}
        </div>
      ))}
    </div>
  );
};

export default ChatView;
