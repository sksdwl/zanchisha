'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  AvatarChatSession, 
  AvatarMessage, 
  RestaurantRecommendation,
  completeAvatarChat 
} from '@/lib/ai-avatar-chat';
import { UserTasteProfile } from '@/lib/ai-dish-analyzer';

interface AvatarChatProps {
  participants: {
    userId: string;
    userName: string;
    tasteProfile: UserTasteProfile;
  }[];
  onClose: () => void;
}

export function AvatarChat({ participants, onClose }: AvatarChatProps) {
  const [session, setSession] = useState<AvatarChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 开始 AI 分身对话
  const startChat = async () => {
    setIsLoading(true);
    try {
      const result = await completeAvatarChat(participants);
      setSession(result);
      setVisibleMessages(0);
    } catch (error: any) {
      alert('AI 分身对话失败：' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 打字机效果：逐条显示消息
  useEffect(() => {
    if (session && visibleMessages < session.messages.length) {
      const timer = setTimeout(() => {
        setVisibleMessages(prev => prev + 1);
      }, 800); // 每条消息间隔 800ms
      return () => clearTimeout(timer);
    }
  }, [session, visibleMessages]);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages]);

  // 获取消息类型的样式
  const getMessageStyle = (type: AvatarMessage['type']) => {
    switch (type) {
      case 'suggestion':
        return 'bg-blue-50 border-blue-200';
      case 'agreement':
        return 'bg-green-50 border-green-200';
      case 'concern':
        return 'bg-yellow-50 border-yellow-200';
      case 'final':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // 获取消息类型的图标
  const getMessageIcon = (type: AvatarMessage['type']) => {
    switch (type) {
      case 'suggestion': return '💡';
      case 'agreement': return '✅';
      case 'concern': return '🤔';
      case 'final': return '🎯';
      default: return '💬';
    }
  };

  if (!session) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">🤖💬</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          启动 AI 分身对话
        </h3>
        <p className="text-gray-600 mb-6">
          让 {participants.length} 位好友的 AI 分身互相交流，
          <br />
          智能分析推荐最适合的餐厅
        </p>
        
        {/* 参与者预览 */}
        <div className="flex justify-center gap-4 mb-6">
          {participants.map((p, i) => (
            <div key={p.userId} className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl mb-2">
                {p.userName[0]}
              </div>
              <span className="text-xs text-gray-600">{p.userName}</span>
            </div>
          ))}
        </div>

        <button
          onClick={startChat}
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              AI 分身讨论中...
            </span>
          ) : (
            '开始 AI 分身对话'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">🤖 AI 分身讨论室</h3>
            <p className="text-sm text-blue-100">
              {session.participants.length} 位 AI 分身正在交流
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* AI 分身头像 */}
        <div className="flex gap-2 mt-3">
          {session.participants.map(p => (
            <div key={p.userId} className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
              <span className="text-xs">🤖</span>
              <span className="text-xs">{p.avatarName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 对话内容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {session.messages.slice(0, visibleMessages).map((msg, index) => (
          <div
            key={msg.id}
            className={`p-3 rounded-xl border animate-fadeIn ${getMessageStyle(msg.type)}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                {getMessageIcon(msg.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-800">
                    {msg.avatarName}
                  </span>
                  <span className="text-xs text-gray-400">
                    代表 {msg.userName}
                  </span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {/* 正在输入指示器 */}
        {visibleMessages < session.messages.length && (
          <div className="flex items-center gap-2 text-gray-400 text-sm pl-4">
            <span>🤖</span>
            <span className="animate-pulse">AI 分身正在思考...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 推荐结果 */}
      {visibleMessages >= session.messages.length && session.recommendation && (
        <RecommendationCard recommendation={session.recommendation} />
      )}
    </div>
  );
}

// 推荐结果卡片
function RecommendationCard({ recommendation }: { recommendation: RestaurantRecommendation }) {
  const priceSymbols = '¥'.repeat(recommendation.priceLevel);
  
  return (
    <div className="border-t border-gray-200 p-4 bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🎯</span>
        <h4 className="font-bold text-gray-800">AI 分身达成共识！</h4>
      </div>
      
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h5 className="font-bold text-lg text-gray-800">
              {recommendation.restaurantName}
            </h5>
            <p className="text-sm text-gray-500">
              {recommendation.cuisine} · {priceSymbols}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-500">
              {recommendation.rating}⭐
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded-lg">
          💡 {recommendation.reason}
        </p>
        
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">推荐菜品</p>
          <div className="flex flex-wrap gap-2">
            {recommendation.dishes.map(dish => (
              <span key={dish} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                {dish}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <span>👥 适合：{recommendation.suitableFor.join('、')}</span>
          <span>📍 {recommendation.location}</span>
        </div>
      </div>
    </div>
  );
}
