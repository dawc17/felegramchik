import React, { useState, useEffect } from "react";
import { X, Users, Plus, Check } from "lucide-react";
import {
    searchUsers,
    createGroup,
    addGroupParticipant,
    storage,
    account,
    APPWRITE_BUCKET_ID_AVATARS
} from "../../lib/appwrite";
import { ID } from "appwrite";

const CreateGroup = ({ isOpen, onClose, onGroupCreated }) => {
    const [groupName, setGroupName] = useState("");
    const [groupDescription, setGroupDescription] = useState("");
    const [groupAvatar, setGroupAvatar] = useState(null);
    const [groupAvatarFile, setGroupAvatarFile] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if (isOpen) {
            const getAccount = async () => {
                try {
                    const user = await account.get();
                    setCurrentUser(user);
                } catch (error) {
                    console.error("Failed to get account:", error);
                }
            };
            getAccount();
        }
    }, [isOpen]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const users = await searchUsers(searchQuery);
            // Filter out current user and already selected users
            const filteredUsers = users.filter(
                (user) =>
                    user.$id !== currentUser?.$id &&
                    !selectedUsers.some((selected) => selected.$id === user.$id)
            );
            setSearchResults(filteredUsers);
        } catch (error) {
            console.error("Search failed:", error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectUser = (user) => {
        setSelectedUsers((prev) => [...prev, user]);
        setSearchResults((prev) => prev.filter((u) => u.$id !== user.$id));
        setSearchQuery("");
    };

    const handleRemoveUser = (userId) => {
        setSelectedUsers((prev) => prev.filter((user) => user.$id !== userId));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setGroupAvatarFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setGroupAvatar(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim() || selectedUsers.length === 0) {
            alert("Enter group name and select participants");
            return;
        }

        setIsLoading(true);
        try {
            let avatarId = null;

            // Upload avatar if selected
            if (groupAvatarFile) {
                const avatarResponse = await storage.createFile(
                    APPWRITE_BUCKET_ID_AVATARS,
                    ID.unique(),
                    groupAvatarFile
                );
                avatarId = avatarResponse.$id;
            }

            // Create group
            const group = await createGroup({
                name: groupName.trim(),
                description: groupDescription.trim(),
                avatarId,
                createdBy: currentUser.$id,
            });

            // Добавляем выбранных участников
            for (const user of selectedUsers) {
                await addGroupParticipant(group.$id, user.$id);
            }

            // Уведомляем родительский компонент
            if (onGroupCreated) {
                onGroupCreated(group);
            }

            // Закрываем модал и очищаем форму
            handleClose();
        } catch (error) {
            console.error("Failed to create group:", error);
            alert("Error creating group");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setGroupName("");
        setGroupDescription("");
        setGroupAvatar(null);
        setGroupAvatarFile(null);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedUsers([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <Users className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                        Create Group
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar scrollbar-thumb-slate-400 scrollbar-track-slate-100 dark:scrollbar-thumb-slate-700 dark:scrollbar-track-gray-800">
                    {/* Group Avatar */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center overflow-hidden">
                                {groupAvatar ? (
                                    <img
                                        src={groupAvatar}
                                        alt="Group avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-700 transition-colors">
                                <Plus className="w-3 h-3 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Group Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Group Name
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Enter group name"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            maxLength={50}
                        />
                    </div>

                    {/* Group Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            placeholder="Enter group description"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                            maxLength={200}
                        />
                    </div>

                    {/* Add Members */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Add Members
                        </label>

                        {/* Selected Users */}
                        {selectedUsers.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {selectedUsers.map((user) => (
                                    <div
                                        key={user.$id}
                                        className="flex items-center bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm"
                                    >
                                        <span className="truncate max-w-[120px]">
                                            {user.displaynameId || user.usernameId || user.email}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveUser(user.$id)}
                                            className="ml-2 hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search Input */}
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                                {searchResults.map((user) => (
                                    <button
                                        key={user.$id}
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center space-x-3"
                                    >
                                        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                                            {(user.displaynameId || user.usernameId || user.email || "U").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {user.displaynameId || user.usernameId || "No name"}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {user.email || user.usernameId}
                                            </p>
                                        </div>
                                        <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {isSearching && (
                            <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                Searching...
                            </div>
                        )}

                        {searchQuery && !isSearching && searchResults.length === 0 && (
                            <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                No users found
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-3">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateGroup}
                            disabled={!groupName.trim() || selectedUsers.length === 0 || isLoading}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Create
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateGroup;