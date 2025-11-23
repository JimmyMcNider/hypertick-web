/**
 * Simple Login Page - No complex authentication, just works
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SimpleLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store user in localStorage (simple, no JWT complexity)
      localStorage.setItem('hypertick_user', JSON.stringify(data.user));
      
      // Redirect based on role
      if (data.user.role === 'INSTRUCTOR' || data.user.role === 'ADMIN') {
        router.push('/simple-instructor');
      } else {
        router.push('/simple-student');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async (username: string, password: string) => {
    setUsername(username);
    setPassword(password);
    // Trigger form submission
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">HyperTick</h1>
          <p className="text-blue-200">Working Trading Simulation Platform</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Demo Accounts</h3>
            
            <div className="space-y-2">
              <button
                onClick={() => loginAsDemo('instructor', 'instructor123')}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md text-sm hover:bg-green-700"
              >
                Login as Instructor
              </button>
              
              <button
                onClick={() => loginAsDemo('student1', 'student123')}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md text-sm hover:bg-purple-700"
              >
                Login as Student 1
              </button>
              
              <button
                onClick={() => loginAsDemo('student2', 'student123')}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md text-sm hover:bg-purple-700"
              >
                Login as Student 2
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-600">
              <p><strong>All Students:</strong> student1-5 / student123</p>
              <p><strong>Instructor:</strong> instructor / instructor123</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 text-center text-blue-200 text-sm">
          <p>✓ Real-time trading simulation</p>
          <p>✓ Instructor session management</p>
          <p>✓ Student order entry system</p>
          <p>✓ Live portfolio tracking</p>
        </div>
      </div>
    </div>
  );
}