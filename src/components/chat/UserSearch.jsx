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
    <div>
      <form onSubmit={handleSearch} className="mb-3">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md bg-surface text-on-surface placeholder-on-surface/60 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </form>

      {error && (
        <div className="text-error text-sm mb-3 p-2 bg-error/10 rounded-md">
          {error}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-1">
          {searchResults.map((user) => (
            <div
              key={user.$id}
              onClick={() => onSelectUser(user)}
              className="flex items-center p-3 cursor-pointer hover:bg-surface-variant rounded-md transition-colors"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-on-primary text-sm font-semibold mr-3">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-on-surface">{user.name}</p>
                {user.email && (
                  <p className="text-sm text-on-surface/60">{user.email}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {searchQuery && searchResults.length === 0 && !error && (
        <div className="text-center text-on-surface/60 py-4">
          <p>No users found</p>
        </div>
      )}
    </div>
  );
};

export default UserSearch;
