'use client';

import { GroupChatRoom } from '@/components/room/group-chat-room';
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RoomPage() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 如果加载完成且未登录，重定向到主页
    if (!isLoading && !isLoggedIn) {
      console.log('[RoomPage] 未登录，重定向到主页');
      router.push('/');
    }
  }, [isLoading, isLoggedIn, router]);

  // 加载中
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

  // 未登录
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">需要登录</h2>
          <p className="text-gray-600 mb-4">请先登录 SecondMe 账号</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return <GroupChatRoom />;
}
