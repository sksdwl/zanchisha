'use client';

import { useEffect, useState } from 'react';

export default function TestSessionPage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const result = await response.json();
        setSessionData(result);
      } catch (error) {
        console.error('Session check failed:', error);
        setSessionData({ error: String(error) });
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Session API 测试</h1>

        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">API 响应:</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">登录状态:</h2>
          <p className="text-xl">
            {sessionData?.data?.isLoggedIn ? (
              <span className="text-green-600">✅ 已登录</span>
            ) : (
              <span className="text-red-600">❌ 未登录</span>
            )}
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            返回首页
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            刷新
          </button>
        </div>
      </div>
    </div>
  );
}
