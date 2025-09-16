import React, { createContext, useContext, useEffect, useState } from "react";
import { account, getUserById } from "../lib/appwrite";
import { ID } from "appwrite";

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      // Get full user profile from database
      try {
        const fullProfile = await getUserById(currentUser.$id);
        setUserProfile(fullProfile);
      } catch (profileError) {
        console.error("Failed to load user profile:", profileError);
        setUserProfile(null);
      }
    } catch (error) {
      // User is not authenticated
      setUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      // First, try to delete any existing sessions
      try {
        await account.deleteSession("current");
      } catch (sessionError) {
        // Ignore errors if no session exists
      }

      // Now create a new session
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);

      // Get full user profile from database
      try {
        const fullProfile = await getUserById(currentUser.$id);
        setUserProfile(fullProfile);
      } catch (profileError) {
        console.error("Failed to load user profile:", profileError);
        setUserProfile(null);
      }

      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, name) => {
    try {
      const newUser = await account.create(ID.unique(), email, password, name);
      // Create the session after registration
      await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();
      setUser(currentUser);
      return { success: true, user: newUser };
    } catch (error) {
      console.error("Registration failed:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession("current");
      setUser(null);
      return { success: true };
    } catch (error) {
      console.error("Logout failed:", error);
      return { success: false, error: error.message };
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);

      // Get updated user profile from database
      const fullProfile = await getUserById(currentUser.$id);
      setUserProfile(fullProfile);

      return { success: true, user: currentUser, profile: fullProfile };
    } catch (error) {
      console.error("Failed to refresh user:", error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    login,
    register,
    logout,
    checkAuth,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
