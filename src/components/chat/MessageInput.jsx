import React, { useState, useEffect } from 'react';
import { account, databases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID_MESSAGES } from '../../lib/appwrite';
import { ID, Permission, Role } from 'appwrite';

const MessageInput = ({ chatId, participants }) => {
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (!message.trim() || !chatId || !currentUser || isLoading) return;

    setIsLoading(true);
    try {
      await databases.createDocument(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID_MESSAGES,
        ID.unique(),
        {
          text: message.trim(),
          chatId: chatId,
          senderId: currentUser.$id,
        },
        [
          Permission.read(Role.users()),
          Permission.write(Role.users()),
        ]
      );
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 bg-surface border-t border-border">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-border rounded-full bg-surface-variant text-on-surface placeholder-on-surface/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!chatId || isLoading}
        />
        <button
          type="submit"
          disabled={!message.trim() || !chatId || isLoading}
          className="p-2 bg-primary text-on-primary rounded-full hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity="0.25" />
              <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
