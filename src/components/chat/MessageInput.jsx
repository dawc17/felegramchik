import React, { useState, useEffect } from 'react';
import { account, databases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID_MESSAGES } from '../../lib/appwrite';
import { ID, Permission, Role } from 'appwrite';

const MessageInput = ({ chatId, participants }) => {
  const [message, setMessage] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !chatId || !currentUser) return;

    try {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID_MESSAGES,
        ID.unique(),
        {
          text: message,
          chatId: chatId,
          senderId: currentUser.$id,
        },
        [
            Permission.read(Role.user(participants[0])),
            Permission.read(Role.user(participants[1])),
        ]
      );
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="p-4 bg-white">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full px-3 py-2 border rounded-md"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={!chatId}
        />
      </form>
    </div>
  );
};

export default MessageInput;
