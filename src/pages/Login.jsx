import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { account } from '../lib/appwrite';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // First, try to delete any existing sessions
      try {
        await account.deleteSession('current');
      } catch (sessionError) {
        // Ignore errors if no session exists
        console.log('No existing session to delete');
      }
      
      // Now create a new session
      await account.createEmailPasswordSession(email, password);
      navigate('/chat');
    } catch (err) {
      setError(err.message);
      console.error('Failed to login:', err);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      {error && (
        <div className="absolute top-0 right-0 mt-4 mr-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-md">
          {error}
        </div>
      )}
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-secondary">
          Sign in to your account
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-secondary"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-3 py-2 mt-1 border border-secondary rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-secondary"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 mt-1 border border-secondary rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-black bg-primary border border-transparent rounded-md shadow-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Sign in
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-600">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-primary hover:text-accent"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
