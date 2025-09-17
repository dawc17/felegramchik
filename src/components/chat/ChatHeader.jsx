import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    getUserById,
    getAvatarUrl,
    clearChatHistory,
    clearGroupHistory,
    deleteChat,
    deleteGroup,
    APPWRITE_DATABASE_ID,
    APPWRITE_COLLECTION_ID_MESSAGES,
    databases
} from "../../lib/appwrite";
import { Query } from "appwrite";
import GroupProfile from "./GroupProfile";

const ChatHeader = ({
    chatId,
    groupId,
    isGroup,
    chatData,
    onUserProfileClick,
    onGroupProfileClick,
    onChatDelete,
    onScrollToMessage,
    currentUserId
}) => {
    const [otherUser, setOtherUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showGroupProfile, setShowGroupProfile] = useState(false);
    const menuRef = useRef(null);
    const searchRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Cleanup search timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Close search when chatId changes (user switches to different chat)
    useEffect(() => {
        // Reset search state when chat changes
        setIsSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        setIsSearching(false);

        // Close dropdown menu as well
        setIsMenuOpen(false);

        // Clear any pending search timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
    }, [chatId]);

    // Get other user data from chat participants or skip for groups
    useEffect(() => {
        if (chatData && currentUserId) {
            // Skip loading other user for groups
            if (isGroup) {
                setOtherUser(null);
                return;
            }

            // For 1:1 chats, load the other user
            if (chatData.participants) {
                const otherUserId = chatData.participants.find(id => id !== currentUserId);
                if (otherUserId) {
                    getUserById(otherUserId).then(user => {
                        if (user) {
                            setOtherUser(user);
                        }
                    }).catch(error => {
                        console.error("Failed to load other user:", error);
                    });
                }
            }
        }
    }, [chatData, currentUserId, isGroup]);

    const handleMenuToggle = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleSearchToggle = () => {
        setIsSearchOpen(!isSearchOpen);
        if (!isSearchOpen) {
            setSearchQuery("");
            setSearchResults([]);
            // Clear any pending search
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            setIsSearching(false);
        }
    };

    const handleSearch = useCallback(async (query) => {
        setSearchQuery(query);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);

        // Debounce search by 300ms
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                // Get all messages from the chat first
                let queryFilter;
                if (isGroup) {
                    queryFilter = Query.equal("chatId", `group_${groupId}`);
                } else {
                    queryFilter = Query.equal("chatId", chatId);
                }

                const response = await databases.listDocuments(
                    APPWRITE_DATABASE_ID,
                    APPWRITE_COLLECTION_ID_MESSAGES,
                    [
                        queryFilter,
                        Query.orderDesc("$createdAt"),
                        Query.limit(500) // Increase limit to get more messages for search
                    ]
                );

                // Filter messages locally with case-insensitive search
                const filteredMessages = response.documents.filter(message =>
                    message.text && message.text.toLowerCase().includes(query.toLowerCase().trim())
                );

                // Sort results by relevance (exact matches first, then partial matches)
                const sortedResults = filteredMessages.sort((a, b) => {
                    const aText = a.text.toLowerCase();
                    const bText = b.text.toLowerCase();
                    const queryLower = query.toLowerCase().trim();

                    // Exact word matches get priority
                    const aExactMatch = aText.split(' ').some(word => word === queryLower);
                    const bExactMatch = bText.split(' ').some(word => word === queryLower);

                    if (aExactMatch && !bExactMatch) return -1;
                    if (!aExactMatch && bExactMatch) return 1;

                    // Then by creation date (newer first)
                    return new Date(b.$createdAt) - new Date(a.$createdAt);
                });

                setSearchResults(sortedResults);
            } catch (error) {
                console.error("Search failed:", error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 300);
    }, [chatId]);

    const handleViewProfile = () => {
        if (isGroup) {
            setShowGroupProfile(true);
        } else if (otherUser && onUserProfileClick) {
            onUserProfileClick(otherUser);
        }
        setIsMenuOpen(false);
    };

    const handleClearHistory = async () => {
        const entityType = isGroup ? "group" : "chat";
        if (window.confirm(`Are you sure you want to clear ${entityType} history? This action cannot be undone.`)) {
            try {
                if (isGroup) {
                    await clearGroupHistory(groupId);
                } else {
                    await clearChatHistory(chatId);
                }
                alert(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} history cleared`);
            } catch (error) {
                console.error(`Failed to clear ${entityType} history:`, error);
                alert(`Error clearing ${entityType} history`);
            }
        }
        setIsMenuOpen(false);
    };

    const handleDeleteChat = async () => {
        const entityType = isGroup ? "group" : "chat";
        if (window.confirm(`Are you sure you want to delete this ${entityType}? All messages will be lost forever.`)) {
            try {
                if (isGroup) {
                    await deleteGroup(groupId);
                } else {
                    await deleteChat(chatId);
                }
                if (onChatDelete) {
                    onChatDelete(isGroup ? groupId : chatId);
                }
                alert(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} deleted`);
            } catch (error) {
                console.error(`Failed to delete ${entityType}:`, error);
                alert(`Error deleting ${entityType}`);
            }
        }
        setIsMenuOpen(false);
    };

    // Helper function to highlight search query in text
    const highlightText = (text, query) => {
        if (!query || !query.trim()) return text;

        const trimmedQuery = query.trim();
        const regex = new RegExp(`(${trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);

        return parts.map((part, index) => {
            if (part.toLowerCase() === trimmedQuery.toLowerCase()) {
                return <span key={index} className="bg-yellow-200 dark:bg-yellow-500 dark:text-black font-semibold rounded px-1">{part}</span>;
            }
            return part;
        });
    }; const scrollToMessage = (messageId) => {
        if (onScrollToMessage) {
            onScrollToMessage(messageId);
        }
        setIsSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
    };

    // Show loading state
    if (!isGroup && !otherUser) {
        return (
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full animate-pulse"></div>
                    <div>
                        <div className="w-24 h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                        <div className="w-16 h-3 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {/* Main Header */}
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3 flex-1">
                    {/* Avatar */}
                    <div className="relative">
                        {isGroup ? (
                            // Group Avatar
                            <>
                                {chatData.avatarId ? (
                                    <img
                                        src={getAvatarUrl(chatData.avatarId)}
                                        alt={chatData.name}
                                        className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={handleViewProfile}
                                        onError={(e) => {
                                            e.target.style.display = "none";
                                            e.target.nextSibling.style.display = "flex";
                                        }}
                                    />
                                ) : null}
                                <div
                                    className={`w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold cursor-pointer hover:opacity-80 transition-opacity ${chatData.avatarId ? "hidden" : ""}`}
                                    onClick={handleViewProfile}
                                >
                                    {chatData.name?.charAt(0).toUpperCase() || "G"}
                                </div>
                            </>
                        ) : (
                            // User Avatar
                            <>
                                {otherUser?.avatarId ? (
                                    <img
                                        src={getAvatarUrl(otherUser.avatarId)}
                                        alt={otherUser.displaynameId || otherUser.usernameId || "User"}
                                        className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={handleViewProfile}
                                        onError={(e) => {
                                            e.target.style.display = "none";
                                            e.target.nextSibling.style.display = "flex";
                                        }}
                                    />
                                ) : null}
                                <div
                                    className={`w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold cursor-pointer hover:opacity-80 transition-opacity ${otherUser?.avatarId ? "hidden" : ""}`}
                                    onClick={handleViewProfile}
                                >
                                    {(otherUser?.displaynameId?.charAt(0) || otherUser?.usernameId?.charAt(0) || "U").toUpperCase()}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Info */}
                    <div
                        className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleViewProfile}
                    >
                        {isGroup ? (
                            <>
                                <h3 className="font-medium text-gray-900 dark:text-white">{chatData.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {chatData.participants?.length} members • click to view info
                                </p>
                            </>
                        ) : (
                            <>
                                <h3 className="font-medium text-gray-900 dark:text-white">{otherUser?.displaynameId || otherUser?.usernameId}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {otherUser?.lastSeen ? "recently online" : "click to view profile"}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                    {/* Search Button */}
                    <button
                        onClick={handleSearchToggle}
                        className={`p-2 rounded-full transition-colors ${isSearchOpen
                            ? "bg-purple-500 text-white"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                        title="Search messages"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>

                    {/* Menu Button */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={handleMenuToggle}
                            className={`p-2 rounded-full transition-colors ${isMenuOpen
                                ? "bg-purple-500 text-white"
                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                            title="Menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                                <button
                                    onClick={handleViewProfile}
                                    className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>View profile</span>
                                </button>

                                <button
                                    onClick={handleClearHistory}
                                    className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Clear history</span>
                                </button>

                                <button
                                    onClick={handleDeleteChat}
                                    className="w-full px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Delete chat</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            {isSearchOpen && (
                <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700" ref={searchRef}>
                    <div className="flex items-center space-x-2 mt-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search messages..."
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                autoFocus
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setIsSearchOpen(false)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                        <div className="mt-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">
                                Found {searchResults.length} message{searchResults.length !== 1 ? 's' : ''}
                            </div>
                            <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg">
                                {searchResults.map((message) => (
                                    <div
                                        key={message.$id}
                                        onClick={() => scrollToMessage(message.$id)}
                                        className="p-3 hover:bg-white dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors"
                                    >
                                        <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                            {highlightText(message.text, searchQuery)}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {new Date(message.$createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {searchQuery && searchResults.length === 0 && !isSearching && (
                        <div className="mt-3 p-4 text-center text-gray-500 dark:text-gray-400">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p>No messages found for "{searchQuery}"</p>
                            <p className="text-xs mt-1">Try searching with different keywords</p>
                        </div>
                    )}

                    {isSearching && searchQuery && (
                        <div className="mt-3 p-4 text-center text-gray-500 dark:text-gray-400">
                            <div className="inline-flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                <span>Searching messages...</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Group Profile Modal */}
            {isGroup && (
                <GroupProfile
                    group={chatData}
                    isOpen={showGroupProfile}
                    onClose={() => {
                        console.log("GroupProfile onClose called");
                        setShowGroupProfile(false);
                    }}
                    currentUser={{ $id: currentUserId }}
                    onUpdate={() => {
                        // Refresh chat data if needed
                        if (onGroupProfileClick) onGroupProfileClick();
                    }}
                    onDelete={() => {
                        if (onChatDelete) onChatDelete(groupId);
                    }}
                />
            )}
        </div>
    );
};

export default ChatHeader;