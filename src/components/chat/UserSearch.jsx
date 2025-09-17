import React, { useState, useEffect } from "react";
import {
  account,
  searchUsers,
  getAvatarUrl,
} from "../../lib/appwrite";

const UserSearch = ({ onSelectUser }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }
    try {
      setError(null);
      const results = await searchUsers(searchQuery, currentUser?.$id);
      setSearchResults(results);
    } catch (err) {
      setError(err.message);
      console.error("Failed to search users:", err);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
        />
      </form>

      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          {error}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {searchResults.map((user) => (
            <div
              key={user.$id}
              onClick={() => onSelectUser(user)}
              className="flex items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors touch-manipulation"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3 flex-shrink-0">
                {user.displaynameId?.charAt(0).toUpperCase() || user.usernameId?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {user.displaynameId || user.usernameId}
                </p>
                {user.displaynameId && user.usernameId && user.displaynameId !== user.usernameId && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    @{user.usernameId}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {searchQuery && searchResults.length === 0 && !error && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-6">
          <p className="text-sm">No users found</p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
};

export default UserSearch;
