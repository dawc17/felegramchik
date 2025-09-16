import React, { useState } from "react";
import { getAvatarUrl, uploadAvatar, deleteAvatar, updateUserProfile, checkUsernameAvailability } from "../../lib/appwrite";

const PersonalProfile = ({ user, isOpen, onClose, onUpdate, onLogout }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState(user?.displaynameId || "");
    const [username, setUsername] = useState(user?.usernameId || "");
    const [usernameStatus, setUsernameStatus] = useState({ available: true, message: "" });
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);

    if (!isOpen || !user) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const handleAvatarUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsLoading(true);
        try {
            // Remove old avatar if exists
            if (user.avatarId) {
                await deleteAvatar(user.avatarId);
            }

            // Upload new avatar
            const avatarId = await uploadAvatar(file);

            // Update user profile with new avatar ID
            await updateUserProfile(user.$id, {
                avatarId: avatarId,
            });

            alert("Avatar updated successfully!");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to upload avatar:", error);
            alert("Failed to upload avatar. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        if (!user.avatarId) return;

        setIsLoading(true);
        try {
            await deleteAvatar(user.avatarId);

            // Update user profile to remove avatar ID
            await updateUserProfile(user.$id, {
                avatarId: "", // Use empty string instead of null
            });

            alert("Avatar removed successfully!");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to remove avatar:", error);
            alert("Failed to remove avatar. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleNameUpdate = async () => {
        if (!name.trim()) {
            alert("Name cannot be empty");
            return;
        }

        setIsLoading(true);
        try {
            await updateUserProfile(user.$id, {
                displaynameId: name.trim(),
            });

            alert("Name updated successfully!");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update name:", error);
            alert("Failed to update name. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const checkUsername = async (usernameValue) => {
        if (!usernameValue || usernameValue.trim().length === 0) {
            setUsernameStatus({ available: true, message: "" });
            return;
        }

        if (usernameValue.trim().toLowerCase() === user?.usernameId?.toLowerCase()) {
            setUsernameStatus({ available: true, message: "Current username" });
            return;
        }

        setIsCheckingUsername(true);
        try {
            const result = await checkUsernameAvailability(usernameValue.trim(), user.$id);
            setUsernameStatus(result);
        } catch (error) {
            setUsernameStatus({ available: false, message: "Error checking username" });
        } finally {
            setIsCheckingUsername(false);
        }
    };

    const handleUsernameChange = (e) => {
        const value = e.target.value;
        setUsername(value);

        // Debounce username check
        clearTimeout(window.usernameCheckTimeout);
        window.usernameCheckTimeout = setTimeout(() => {
            checkUsername(value);
        }, 500);
    };

    const handleUsernameUpdate = async () => {
        if (!username.trim()) {
            alert("Username cannot be empty");
            return;
        }

        if (!usernameStatus.available) {
            alert("Please choose a different username");
            return;
        }

        setIsLoading(true);
        try {
            await updateUserProfile(user.$id, {
                usernameId: username.trim().toLowerCase(),
            });

            alert("Username updated successfully!");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Failed to update username:", error);
            alert("Failed to update username. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        if (onLogout) {
            onClose(); // Close modal first
            await onLogout();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">My Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                        disabled={isLoading}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* User Info */}
                <div className="p-6">
                    {/* Avatar and Name */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative mb-4">
                            {user.avatarId ? (
                                <img
                                    src={getAvatarUrl(user.avatarId)}
                                    alt={user.displaynameId || user.usernameId || "User"}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
                                />
                            ) : (
                                <div className="w-24 h-24 bg-purple-500 rounded-full flex items-center justify-center border-4 border-purple-200">
                                    <span className="text-white text-2xl font-bold">
                                        {(user.displaynameId?.charAt(0) || user.usernameId?.charAt(0) || 'U').toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {/* Loading overlay */}
                            {isLoading && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        {/* Avatar Actions */}
                        <div className="flex space-x-2 mb-4">
                            <label className="px-3 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors cursor-pointer">
                                {user.avatarId ? 'Change Avatar' : 'Upload Avatar'}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                    disabled={isLoading}
                                />
                            </label>
                            {user.avatarId && (
                                <button
                                    onClick={handleRemoveAvatar}
                                    className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                                    disabled={isLoading}
                                >
                                    Remove
                                </button>
                            )}
                        </div>

                        {/* Name Edit */}
                        <div className="w-full mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Display Name
                            </label>
                            <div className="flex space-x-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Enter your name"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleNameUpdate}
                                    className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
                                    disabled={isLoading || name.trim() === user.displaynameId}
                                >
                                    Save
                                </button>
                            </div>
                        </div>

                        {/* Username Edit */}
                        <div className="w-full mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <div className="flex space-x-2">
                                <div className="flex-1">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={handleUsernameChange}
                                            className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${!usernameStatus.available ? 'border-red-300 bg-red-50' :
                                                    usernameStatus.message === "Current username" ? 'border-gray-300' :
                                                        usernameStatus.available && usernameStatus.message ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                                }`}
                                            placeholder="Enter username"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    {(usernameStatus.message || isCheckingUsername) && (
                                        <p className={`text-xs mt-1 ${isCheckingUsername ? 'text-gray-500' :
                                                !usernameStatus.available ? 'text-red-600' :
                                                    usernameStatus.message === "Current username" ? 'text-gray-500' :
                                                        'text-green-600'
                                            }`}>
                                            {isCheckingUsername ? 'Checking...' : usernameStatus.message}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handleUsernameUpdate}
                                    className="px-4 py-2 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isLoading || !usernameStatus.available || username.trim() === user.usernameId || !username.trim()}
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* User Details */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-3">Account Information</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Username:</span>
                                    <span className="text-sm font-mono text-gray-900 bg-gray-200 px-2 py-1 rounded">
                                        @{user.usernameId || 'Not set'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Email:</span>
                                    <span className="text-sm text-gray-900">
                                        {user.email}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Joined:</span>
                                    <span className="text-sm text-gray-900">
                                        {formatDate(user.$createdAt)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer with Logout button */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                        disabled={isLoading}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PersonalProfile;