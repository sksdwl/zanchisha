'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { LoginButton } from '@/components/auth/login-button';
import Link from 'next/link';

export default function HomePage() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍜</span>
            <span className="font-bold text-gray-800">咱吃啥</span>
          </div>
          <LoginButton />
        </div>
      </nav>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        {/* Hero 区域 */}
        <div className="mb-16">
          <div className="text-8xl mb-6">🍜🤔🍱</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            今天吃啥？
            <br />
            <span className="text-orange-500">AI 来帮你决定</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            和好友聚餐总是众口难调？上传你们喜欢的菜品，
            AI 智能分析群体口味，推荐最合适的餐厅
          </p>

          {isLoggedIn ? (
            <Link
              href="/dish-analyzer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white text-lg font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              <span>开始使用</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          ) : (
            <div className="space-y-4">
              <LoginButton />
              <p className="text-sm text-gray-500">
                使用 SecondMe 账号快速登录
              </p>
            </div>
          )}
        </div>

        {/* 功能介绍 */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">1. 输入菜品</h3>
            <p className="text-gray-600 text-sm">
              每人上传自己喜欢的菜品，每行一道，支持批量粘贴
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">2. AI 分析</h3>
            <p className="text-gray-600 text-sm">
              SecondMe AI 自动分析口味画像，识别菜系偏好和口味特征
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">3. 获取推荐</h3>
            <p className="text-gray-600 text-sm">
              智能匹配群体口味，推荐最合适的餐厅类型和具体商家
            </p>
          </div>
        </div>

        {/* 特点说明 */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">为什么选择咱吃啥？</h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🧠</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">AI 智能理解</h4>
                <p className="text-sm text-gray-600">
                  自动识别菜品别名（如"宫爆鸡丁"→"宫保鸡丁"），支持中英文混用
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">👥</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">群体决策</h4>
                <p className="text-sm text-gray-600">
                  不是简单投票，而是深度分析每个人的口味，找出最大公约数
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">快速便捷</h4>
                <p className="text-sm text-gray-600">
                  10 秒钟完成分析，告别"吃啥"纠结症
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🔒</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">SecondMe 登录</h4>
                <p className="text-sm text-gray-600">
                  使用 SecondMe 账号安全登录，无需额外注册
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            基于 SecondMe AI 构建 · Made with ❤️
          </p>
        </footer>
      </main>
    </div>
  );
}
