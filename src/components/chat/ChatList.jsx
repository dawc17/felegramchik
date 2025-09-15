import React from 'react';
import UserSearch from './UserSearch';

const ChatList = ({ onSelectUser }) => {
  return (
    <div className="w-1/4 bg-gray-100 p-4">
      <h2 className="text-xl font-bold mb-4">Chats</h2>
      <UserSearch onSelectUser={onSelectUser} />
      {/* Placeholder for chat list items */}
    </div>
  );
};

export default ChatList;
