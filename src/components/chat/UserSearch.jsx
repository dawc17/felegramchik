import React, { useState, useEffect } from 'react';
import { account, databases, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID_USERS } from '../../lib/appwrite';
import { Query } from 'appwrite';

const UserSearch = ({ onSelectUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    try {
      setError(null);
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID_USERS,
        [Query.search('name', searchQuery)]
      );
      
      // Filter out the current user from search results
      const filteredResults = response.documents.filter(user => {
        // Check both possible ID fields to be safe
        return currentUser && 
               user.userId !== currentUser.$id && 
               user.$id !== currentUser.$id;
      });
      
      setSearchResults(filteredResults);
    } catch (err) {
      setError(err.message);
      console.error('Failed to search users:', err);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search for users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
        />
      </form>
      {error && <p className="text-red-500">{error}</p>}
      <ul className="mt-4">
        {searchResults.map((user) => (
          <li
            key={user.$id}
            onClick={() => onSelectUser(user)}
            className="p-2 cursor-pointer hover:bg-gray-200"
          >
            {user.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserSearch;
