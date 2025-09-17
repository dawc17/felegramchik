import React, { useState, useEffect } from "react";
import {
    getGroupById,
    getUserById,
    getAvatarUrl,
    updateGroup,
    uploadAvatar,
    deleteAvatar,
    addGroupParticipant,
    removeGroupParticipant,
    deleteGroup,
    clearGroupHistory,
    searchUsers
} from "../../lib/appwrite";

const GroupProfile = ({ group, isOpen, onClose, currentUser, onUpdate, onDelete }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [groupData, setGroupData] = useState(group);
    const [participants, setParticipants] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(group?.name || "");
    const [editDescription, setEditDescription] = useState(group?.description || "");
    const [showAddMember, setShowAddMember] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
        if (isOpen && group) {
            loadParticipants();
            setEditName(group.name);
            setEditDescription(group.description || "");
        }
    }, [isOpen, group]);

    const loadParticipants = async () => {
        try {
            const participantData = await Promise.all(
                group.participants.map(async (participantId) => {
                    return await getUserById(participantId);
                })
            );
            setParticipants(participantData.filter(Boolean));
        } catch (error) {
            console.error("Failed to load participants:", error);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);
        try {
            // Delete old avatar if exists
            if (groupData.avatarId) {
                await deleteAvatar(groupData.avatarId);
            }

            // Upload new avatar
            const result = await uploadAvatar(file);
            await updateGroup(group.$id, { avatarId: result.$id });

            setGroupData(prev => ({ ...prev, avatarId: result.$id }));
            alert("Group avatar updated successfully!");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update group avatar:", error);
            alert("Failed to update group avatar. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        if (!groupData.avatarId) return;

        setIsLoading(true);
        try {
            await deleteAvatar(groupData.avatarId);
            await updateGroup(group.$id, { avatarId: null });

            setGroupData(prev => ({ ...prev, avatarId: null }));
            alert("Group avatar removed successfully!");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to remove group avatar:", error);
            alert("Failed to remove group avatar. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!editName.trim()) {
            alert("Group name cannot be empty");
            return;
        }

        setIsLoading(true);
        try {
            await updateGroup(group.$id, {
                name: editName.trim(),
                description: editDescription.trim()
            });

            setGroupData(prev => ({
                ...prev,
                name: editName.trim(),
                description: editDescription.trim()
            }));

            setIsEditing(false);
            alert("Group updated successfully!");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update group:", error);
            alert("Failed to update group. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchUsers = async (query) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const results = await searchUsers(query, currentUser.$id);
            // Filter out users who are already participants
            const filteredResults = results.filter(user =>
                !group.participants.includes(user.$id)
            );
            setSearchResults(filteredResults);
        } catch (error) {
            console.error("Failed to search users:", error);
        }
    };

    const handleAddMember = async (user) => {
        setIsLoading(true);
        try {
            await addGroupParticipant(group.$id, user.$id);
            setParticipants(prev => [...prev, user]);
            setSearchResults([]);
            setSearchQuery("");
            setShowAddMember(false);
            alert(`${user.displaynameId || user.usernameId} added to group!`);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to add member:", error);
            alert("Failed to add member. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveMember = async (user) => {
        if (!window.confirm(`Remove ${user.displaynameId || user.usernameId} from group?`)) {
            return;
        }

        setIsLoading(true);
        try {
            await removeGroupParticipant(group.$id, user.$id);
            setParticipants(prev => prev.filter(p => p.$id !== user.$id));
            alert(`${user.displaynameId || user.usernameId} removed from group!`);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to remove member:", error);
            alert("Failed to remove member. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm("Are you sure you want to leave this group?")) return;

        setIsLoading(true);
        try {
            await removeGroupParticipant(group.$id, currentUser.$id);
            alert("You have left the group");
            onClose();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to leave group:", error);
            alert("Failed to leave group. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;

        setIsLoading(true);
        try {
            await deleteGroup(group.$id);
            alert("Group deleted successfully");
            onClose();
            if (onDelete) onDelete();
        } catch (error) {
            console.error("Failed to delete group:", error);
            alert("Failed to delete group. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!window.confirm("Are you sure you want to clear group history? This action cannot be undone.")) return;

        setIsLoading(true);
        try {
            await clearGroupHistory(group.$id);
            alert("Group history cleared successfully");
        } catch (error) {
            console.error("Failed to clear history:", error);
            alert("Failed to clear history. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (!isOpen || !group) return null;

    const isCreator = group.createdBy === currentUser.$id;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Group Info</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        disabled={isLoading}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Group Info */}
                <div className="p-6 space-y-6 flex-1 overflow-y-auto scrollbar scrollbar-thumb-slate-400 scrollbar-track-slate-100 dark:scrollbar-thumb-slate-700 dark:scrollbar-track-gray-800">
                    {/* Avatar and Basic Info */}
                    <div className="flex flex-col items-center space-y-4">
                        <div className="relative">
                            {groupData.avatarId ? (
                                <img
                                    src={getAvatarUrl(groupData.avatarId)}
                                    alt={groupData.name}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-green-200"
                                />
                            ) : (
                                <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center border-4 border-green-200">
                                    <span className="text-white text-2xl font-bold">
                                        {groupData.name?.charAt(0).toUpperCase() || 'G'}
                                    </span>
                                </div>
                            )}

                            {/* Loading overlay */}
                            {isLoading && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        {/* Avatar Controls - Only for creator */}
                        {isCreator && !isEditing && (
                            <div className="flex space-x-2">
                                <label className="cursor-pointer px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors">
                                    Change Photo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        className="hidden"
                                        disabled={isLoading}
                                    />
                                </label>
                                {groupData.avatarId && (
                                    <button
                                        onClick={handleRemoveAvatar}
                                        className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                                        disabled={isLoading}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Group Name and Description */}
                        {isEditing ? (
                            <div className="w-full space-y-3">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                    placeholder="Group name"
                                    disabled={isLoading}
                                />
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none placeholder-gray-400 dark:placeholder-gray-500"
                                    placeholder="Group description"
                                    rows={3}
                                    disabled={isLoading}
                                />
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleSaveChanges}
                                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                        disabled={isLoading}
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        disabled={isLoading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{groupData.name}</h3>
                                {groupData.description && (
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">{groupData.description}</p>
                                )}
                                <p className="text-gray-500 dark:text-gray-400 text-sm">{participants.length} members</p>
                                {isCreator && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm"
                                    >
                                        Edit Group Info
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Members Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 dark:text-white">Members ({participants.length})</h4>
                            <button
                                onClick={() => setShowAddMember(!showAddMember)}
                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm"
                            >
                                Add Member
                            </button>
                        </div>

                        {/* Add Member Section */}
                        {showAddMember && (
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        handleSearchUsers(e.target.value);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-400 dark:placeholder-gray-500"
                                    placeholder="Search users to add..."
                                />
                                {searchResults.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto space-y-1">
                                        {searchResults.map(user => (
                                            <div
                                                key={user.$id}
                                                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                                                        {(user.displaynameId?.charAt(0) || user.usernameId?.charAt(0) || 'U').toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-gray-900 dark:text-white">{user.displaynameId || user.usernameId}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleAddMember(user)}
                                                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm"
                                                    disabled={isLoading}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Members List */}
                        <div className="space-y-2">
                            {participants.map(participant => (
                                <div key={participant.$id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                                    <div className="flex items-center space-x-3">
                                        {participant.avatarId ? (
                                            <img
                                                src={getAvatarUrl(participant.avatarId)}
                                                alt={participant.displaynameId || participant.usernameId}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                                                {(participant.displaynameId?.charAt(0) || participant.usernameId?.charAt(0) || 'U').toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {participant.displaynameId || participant.usernameId}
                                            </p>
                                            {participant.usernameId && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">@{participant.usernameId}</p>
                                            )}
                                            {participant.$id === group.createdBy && (
                                                <p className="text-xs text-green-600 dark:text-green-400">Group Creator</p>
                                            )}
                                        </div>
                                    </div>
                                    {isCreator && participant.$id !== currentUser.$id && (
                                        <button
                                            onClick={() => handleRemoveMember(participant)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                                            disabled={isLoading}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Group Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Group Details</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                                <span className="text-gray-900 dark:text-white">{formatDate(group.$createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Creator:</span>
                                <span className="text-gray-900 dark:text-white">
                                    {participants.find(p => p.$id === group.createdBy)?.displaynameId ||
                                        participants.find(p => p.$id === group.createdBy)?.usernameId ||
                                        'Unknown'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={handleClearHistory}
                            className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            disabled={isLoading}
                        >
                            Clear Group History
                        </button>

                        <button
                            onClick={handleLeaveGroup}
                            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            disabled={isLoading}
                        >
                            Leave Group
                        </button>

                        {isCreator && (
                            <button
                                onClick={handleDeleteGroup}
                                className="w-full px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors"
                                disabled={isLoading}
                            >
                                Delete Group
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupProfile;