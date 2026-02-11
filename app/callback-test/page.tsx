'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CallbackTestPage() {
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<any>({});

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    setInfo({
      hasCode: !!code,
      code: code?.substring(0, 20) + '...',
      hasState: !!state,
      state: state?.substring(0, 20) + '...',
      hasError: !!error,
      error,
      fullUrl: window.location.href,
      timestamp: new Date().toISOString(),
    });

    console.log('[Callback Test] URL 参数:', {
      code,
      state,
      error,
      fullUrl: window.location.href,
    });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">OAuth 回调测试页面</h1>

        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded">
            <h2 className="font-semibold mb-2">URL 参数检测</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>code:</strong>{' '}
                {info.hasCode ? (
                  <span className="text-green-600">✅ {info.code}</span>
                ) : (
                  <span className="text-red-600">❌ 缺失</span>
                )}
              </p>
              <p>
                <strong>state:</strong>{' '}
                {info.hasState ? (
                  <span className="text-green-600">✅ {info.state}</span>
                ) : (
                  <span className="text-red-600">❌ 缺失</span>
                )}
              </p>
              <p>
                <strong>error:</strong>{' '}
                {info.hasError ? (
                  <span className="text-red-600">❌ {info.error}</span>
                ) : (
                  <span className="text-green-600">✅ 无错误</span>
                )}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h2 className="font-semibold mb-2">完整 URL</h2>
            <p className="text-xs font-mono break-all">{info.fullUrl}</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded">
            <h2 className="font-semibold mb-2">⚠️ 说明</h2>
            <p className="text-sm">
              如果你看到这个页面，说明 SecondMe 成功回调了。
              <br />
              但正常情况下应该自动跳转到首页，而不是停留在这里。
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
              onClick={() => window.location.href = '/debug'}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              查看调试信息
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
