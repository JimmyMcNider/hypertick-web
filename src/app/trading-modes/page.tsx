/**
 * Trading Mode Selection
 * 
 * Choose between educational and professional trading interfaces
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function TradingModesPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('hypertick_user');
    if (!userData) {
      router.push('/simple-login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'STUDENT') {
      router.push('/simple-login');
      return;
    }

    setUser(parsedUser);
  }, [router]);

  if (!user) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-16">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Choose Your Trading Experience
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Welcome {user.firstName}! Select the interface that matches your trading style and experience level.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Educational Mode */}
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20 hover:bg-opacity-20 transition-all duration-300 group">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎓</div>
              <h2 className="text-3xl font-bold text-white mb-2">Educational Mode</h2>
              <p className="text-gray-300">Perfect for learning and structured lessons</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-200">Progressive feature unlocking</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-200">Guided interface with explanations</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-200">Clear window organization</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-200">Built-in help and privileges display</span>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/simple-student')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform group-hover:scale-105"
            >
              Enter Educational Mode
            </button>
          </div>

          {/* Professional Mode */}
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20 hover:bg-opacity-20 transition-all duration-300 group">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚡</div>
              <h2 className="text-3xl font-bold text-white mb-2">Professional Mode</h2>
              <p className="text-gray-300">High-speed trading for experienced users</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-200">Keyboard shortcuts (B/S/M/L/Enter)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-200">Real-time data updates (1 second)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-200">Condensed information density</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-200">Quick quantity buttons</span>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/professional-student')}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-yellow-700 hover:to-orange-700 transition-all duration-300 transform group-hover:scale-105"
            >
              Enter Professional Mode
            </button>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="mt-16 bg-white bg-opacity-5 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-10">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">Feature Comparison</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white border-opacity-20">
                  <th className="py-3 px-4 text-gray-300">Feature</th>
                  <th className="py-3 px-4 text-center text-blue-300">Educational</th>
                  <th className="py-3 px-4 text-center text-yellow-300">Professional</th>
                </tr>
              </thead>
              <tbody className="text-gray-200">
                <tr className="border-b border-white border-opacity-10">
                  <td className="py-3 px-4">Learning progression</td>
                  <td className="py-3 px-4 text-center">✅</td>
                  <td className="py-3 px-4 text-center">❌</td>
                </tr>
                <tr className="border-b border-white border-opacity-10">
                  <td className="py-3 px-4">Keyboard shortcuts</td>
                  <td className="py-3 px-4 text-center">❌</td>
                  <td className="py-3 px-4 text-center">✅</td>
                </tr>
                <tr className="border-b border-white border-opacity-10">
                  <td className="py-3 px-4">Real-time updates</td>
                  <td className="py-3 px-4 text-center">5 seconds</td>
                  <td className="py-3 px-4 text-center">1 second</td>
                </tr>
                <tr className="border-b border-white border-opacity-10">
                  <td className="py-3 px-4">Information density</td>
                  <td className="py-3 px-4 text-center">Comfortable</td>
                  <td className="py-3 px-4 text-center">Condensed</td>
                </tr>
                <tr className="border-b border-white border-opacity-10">
                  <td className="py-3 px-4">Quick order entry</td>
                  <td className="py-3 px-4 text-center">Basic</td>
                  <td className="py-3 px-4 text-center">Advanced</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Target audience</td>
                  <td className="py-3 px-4 text-center">Students</td>
                  <td className="py-3 px-4 text-center">Experienced traders</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-400">
            You can switch between modes at any time during your trading session.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('hypertick_user');
              router.push('/simple-login');
            }}
            className="mt-4 text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}