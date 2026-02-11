'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const response = await fetch('/api/debug/oauth-status');
        const data = await response.json();
        setDebugInfo(data);
      } catch (error) {
        console.error('获取调试信息失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载调试信息...</p>
        </div>
      </div>
    );
  }

  const urlError = searchParams.get('error');
  const urlMessage = searchParams.get('message');
  const urlCode = searchParams.get('code');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            🔍 OAuth 调试信息
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            时间: {debugInfo?.data?.timestamp}
          </p>

          {/* URL 错误信息 */}
          {urlError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                ❌ URL 错误参数
              </h3>
              <div className="space-y-1 text-sm">
                <p><strong>错误类型:</strong> {urlError}</p>
                {urlMessage && <p><strong>错误信息:</strong> {decodeURIComponent(urlMessage)}</p>}
                {urlCode && <p><strong>错误代码:</strong> {urlCode}</p>}
              </div>
            </div>
          )}

          {/* 环境变量检查 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              📋 环境变量
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <StatusItem
                label="SECONDME_CLIENT_ID"
                status={debugInfo?.data?.environment?.hasClientId}
              />
              <StatusItem
                label="SECONDME_CLIENT_SECRET"
                status={debugInfo?.data?.environment?.hasClientSecret}
              />
              <StatusItem
                label="SECONDME_REDIRECT_URI"
                status={debugInfo?.data?.environment?.hasRedirectUri}
                value={debugInfo?.data?.environment?.redirectUri}
              />
              <StatusItem
                label="NODE_ENV"
                status={true}
                value={debugInfo?.data?.environment?.nodeEnv}
              />
            </div>
          </div>

          {/* Cookies 检查 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              🍪 Cookies 状态
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <StatusItem
                label="access_token"
                status={debugInfo?.data?.cookies?.hasAccessToken}
                value={debugInfo?.data?.cookies?.accessTokenValue}
              />
              <StatusItem
                label="refresh_token"
                status={debugInfo?.data?.cookies?.hasRefreshToken}
              />
              <StatusItem
                label="oauth_state"
                status={debugInfo?.data?.cookies?.hasOAuthState}
              />
              <StatusItem
                label="user_logged_in"
                status={debugInfo?.data?.cookies?.hasUserLoggedIn}
              />
            </div>
          </div>

          {/* URL 参数检查 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              🔗 URL 参数
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <StatusItem
                label="error"
                status={debugInfo?.data?.urlParams?.hasError}
                value={debugInfo?.data?.urlParams?.error}
              />
              <StatusItem
                label="code"
                status={debugInfo?.data?.urlParams?.hasCode}
              />
              <StatusItem
                label="state"
                status={debugInfo?.data?.urlParams?.hasState}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <button
              onClick={() => window.location.href = '/api/auth/login'}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              🔐 测试登录
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              🔄 刷新
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              🏠 返回首页
            </button>
          </div>
        </div>

        {/* 原始数据 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            📄 原始数据
          </h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, status, value }: { label: string; status?: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-xs text-gray-500 font-mono">{value}</span>
        )}
        <span className={`text-lg ${status ? 'text-green-500' : 'text-red-500'}`}>
          {status ? '✅' : '❌'}
        </span>
      </div>
    </div>
  );
}
