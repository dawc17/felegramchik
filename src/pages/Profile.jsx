import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  uploadAvatar,
  getAvatarUrl,
  deleteAvatar,
  updateUserProfile,
  getUserById,
  clearUserCache,
} from "../lib/appwrite";

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { user: currentUser, logout } = useAuth();

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        // Get user details from database (including avatar)
        const userDetails = await getUserById(currentUser.$id);
        setName(userDetails.name || currentUser.name);

        if (userDetails.avatarId) {
          setAvatarUrl(getAvatarUrl(userDetails.avatarId));
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [currentUser, navigate]);

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      // Delete old avatar if exists (ignore errors if file not found)
      const userDetails = await getUserById(currentUser.$id);
      if (userDetails.avatarId) {
        try {
          await deleteAvatar(userDetails.avatarId);
        } catch (deleteError) {
          console.warn(
            "Could not delete old avatar (file may not exist):",
            deleteError
          );
          // Continue with upload even if old file deletion fails
        }
      }

      // Upload new avatar
      const uploadResult = await uploadAvatar(file);

      // Update user profile with new avatar ID
      await updateUserProfile(currentUser.$id, {
        avatarId: uploadResult.$id,
      });

      // Update UI
      setAvatarUrl(getAvatarUrl(uploadResult.$id));
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove your avatar?"
    );
    if (!confirmed) return;

    setIsUploading(true);
    try {
      const userDetails = await getUserById(currentUser.$id);
      if (userDetails.avatarId) {
        try {
          await deleteAvatar(userDetails.avatarId);
        } catch (deleteError) {
          console.warn(
            "Could not delete avatar file (may not exist):",
            deleteError
          );
          // Continue with removal from profile even if file deletion fails
        }

        // Update user profile to remove avatar ID
        await updateUserProfile(currentUser.$id, {
          avatarId: null,
        });

        setAvatarUrl(null);
      }
    } catch (error) {
      console.error("Failed to remove avatar:", error);
      alert("Failed to remove avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };
  const handleSaveName = async () => {
    if (!name.trim()) {
      alert("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(currentUser.$id, {
        name: name.trim(),
      });

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update name:", error);
      alert("Failed to update name. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        navigate("/login");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-on-surface">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-secondary text-on-secondary border-b border-border">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/chat")}
            className="p-2 hover:bg-secondary-variant rounded-full transition-colors"
            title="Back to chats"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Profile</h1>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium bg-primary text-on-primary border border-transparent rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Logout
        </button>
      </header>

      {/* Profile Content */}
      <div className="max-w-md mx-auto p-6">
        {/* Avatar Section */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover border-4 border-primary"
              />
            ) : (
              <div className="w-32 h-32 bg-secondary rounded-full flex items-center justify-center text-on-secondary text-4xl font-bold border-4 border-primary">
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
              title="Change avatar"
            >
              {isUploading ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
                    opacity=".25"
                  />
                  <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" />
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9M19 21H5V3H13V9H19V21Z" />
                </svg>
              )}
            </button>

            {/* Remove avatar button */}
            {avatarUrl && (
              <button
                onClick={handleRemoveAvatar}
                disabled={isUploading}
                className="absolute top-0 right-0 w-8 h-8 bg-error text-on-error rounded-full flex items-center justify-center hover:bg-error/90 transition-colors disabled:opacity-50"
                title="Remove avatar"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                </svg>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Name Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md shadow-sm bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Enter your name"
            />
          </div>

          <button
            onClick={handleSaveName}
            disabled={isSaving || !name.trim()}
            className="w-full px-4 py-2 bg-primary text-on-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* User Info */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="text-sm text-on-surface/70">
            <p>
              <strong>Email:</strong> {currentUser?.email}
            </p>
            <p>
              <strong>User ID:</strong> {currentUser?.$id}
            </p>
            <p>
              <strong>Joined:</strong>{" "}
              {currentUser?.$createdAt
                ? new Date(currentUser.$createdAt).toLocaleDateString()
                : "Unknown"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
