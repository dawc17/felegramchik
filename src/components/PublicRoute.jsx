import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    // Show loading spinner while checking authentication
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-on-background">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    // User is already logged in, redirect to chat
    return <Navigate to="/chat" replace />;
  }

  return children;
};

export default PublicRoute;
