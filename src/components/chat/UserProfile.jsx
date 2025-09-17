import React from "react";
import { getAvatarUrl } from "../../lib/appwrite";

const UserProfile = ({ user, isOpen, onClose, onClearHistory, onDeleteChat }) => {
    if (!isOpen || !user) return null;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const handleClearHistory = () => {
        if (onClearHistory) {
            onClearHistory();
        }
        onClose();
    };

    const handleDeleteChat = () => {
        if (onDeleteChat) {
            onDeleteChat();
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">User Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* User Info */}
                <div className="p-6 flex-1 overflow-y-auto scrollbar scrollbar-thumb-slate-400 scrollbar-track-slate-100 dark:scrollbar-thumb-slate-700 dark:scrollbar-track-gray-800">
                    {/* Avatar and Name */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative mb-4">
                            {user.avatarId ? (
                                <img
                                    src={getAvatarUrl(user.avatarId)}
                                    alt={user.displaynameId || user.usernameId || "User"}
                                    className="w-24 h-24 rounded-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.nextSibling.style.display = "flex";
                                    }}
                                />
                            ) : null}
                            <div
                                className={`w-24 h-24 bg-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold ${user.avatarId ? "hidden" : ""
                                    }`}
                            >
                                {(user.displaynameId?.charAt(0) || user.usernameId?.charAt(0) || "U").toUpperCase()}
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold text-gray-900 text-center">
                            {user.displaynameId || user.usernameId}
                        </h3>

                        {user.usernameId && (
                            <p className="text-gray-500 text-center mt-1 font-mono">
                                @{user.usernameId}
                            </p>
                        )}

                        {user.email && (
                            <p className="text-gray-500 dark:text-gray-400 text-center mt-1">
                                {user.email}
                            </p>
                        )}
                    </div>

                    {/* User Details */}
                    <div className="space-y-4">
                        {/* Registration Date */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Registration Date</p>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {user.$createdAt ? formatDate(user.$createdAt) : "Unknown"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Username */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Username</p>
                                    <p className="text-gray-600 font-mono text-sm">
                                        @{user.usernameId || 'Not set'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Last Seen (if available) */}
                        {user.lastSeen && (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Last Seen</p>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            {formatDate(user.lastSeen)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Bio (if available) */}
                        {user.bio && (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">About</p>
                                        <p className="text-gray-700 mt-1">
                                            {user.bio}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-6 space-y-3">
                    <button
                        onClick={handleClearHistory}
                        className="w-full px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Clear message history</span>
                    </button>

                    <button
                        onClick={handleDeleteChat}
                        className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center justify-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Delete chat</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;