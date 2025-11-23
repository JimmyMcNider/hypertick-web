/**
 * Simple Navigation Page - Direct users to correct interfaces
 */

'use client';

export default function SimpleNavPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HyperTick Trading</h1>
          <p className="text-gray-600">Choose your interface</p>
        </div>

        <div className="space-y-4">
          {/* Simple Login */}
          <a
            href="/simple-login"
            className="block w-full bg-blue-600 text-white text-center py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            🔑 Login Page
          </a>

          {/* Instructor Interface */}
          <a
            href="/simple-instructor"
            className="block w-full bg-green-600 text-white text-center py-3 px-4 rounded-md hover:bg-green-700 transition-colors"
          >
            👨‍🏫 Instructor Dashboard
          </a>

          {/* Student Interface */}
          <a
            href="/simple-student"
            className="block w-full bg-purple-600 text-white text-center py-3 px-4 rounded-md hover:bg-purple-700 transition-colors"
          >
            👨‍🎓 Student Trading Terminal
          </a>

          <div className="border-t pt-4 mt-6">
            <p className="text-sm text-gray-500 text-center mb-3">
              ⚠️ <strong>DO NOT USE THESE LEGACY PAGES:</strong>
            </p>
            <div className="space-y-2 text-xs text-red-600">
              <div>❌ /terminal (shows demo data)</div>
              <div>❌ /instructor (complex legacy system)</div>
              <div>❌ /dashboard (broken authentication)</div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="text-sm text-green-800 font-medium">✅ Working System:</p>
            <ul className="text-xs text-green-700 mt-1 space-y-1">
              <li>• Real trading sessions</li>
              <li>• Live portfolio updates</li>
              <li>• Order matching engine</li>
              <li>• Session management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}