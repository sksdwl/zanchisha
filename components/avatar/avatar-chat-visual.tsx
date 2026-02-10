'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  AvatarChatSession, 
  AvatarMessage, 
  RestaurantRecommendation,
  completeAvatarChat,
  AvatarParticipant
} from '@/lib/ai-avatar-chat';
import { UserTasteProfile } from '@/lib/ai-dish-analyzer';

interface AvatarChatVisualProps {
  participants: {
    userId: string;
    userName: string;
    tasteProfile: UserTasteProfile;
  }[];
  onClose: () => void;
  roomName?: string;
}

// AI 分身头像颜色配置
const AVATAR_COLORS = [
  { bg: 'from-pink-400 to-rose-500', bubble: 'bg-pink-100 text-pink-800', border: 'border-pink-200' },
  { bg: 'from-blue-400 to-indigo-500', bubble: 'bg-blue-100 text-blue-800', border: 'border-blue-200' },
  { bg: 'from-green-400 to-emerald-500', bubble: 'bg-green-100 text-green-800', border: 'border-green-200' },
  { bg: 'from-purple-400 to-violet-500', bubble: 'bg-purple-100 text-purple-800', border: 'border-purple-200' },
  { bg: 'from-orange-400 to-amber-500', bubble: 'bg-orange-100 text-orange-800', border: 'border-orange-200' },
  { bg: 'from-cyan-400 to-teal-500', bubble: 'bg-cyan-100 text-cyan-800', border: 'border-cyan-200' },
];

// 获取参与者颜色
const getParticipantColor = (index: number) => {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
};

export function AvatarChatVisual({ participants, onClose, roomName = 'AI 讨论群' }: AvatarChatVisualProps) {
  const [session, setSession] = useState<AvatarChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [currentTypingId, setCurrentTypingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
      const currentMsg = session.messages[visibleMessages];
      setCurrentTypingId(currentMsg.userId);
      
      const timer = setTimeout(() => {
        setVisibleMessages(prev => prev + 1);
        setCurrentTypingId(null);
      }, 1500); // 每条消息间隔 1.5 秒，给用户阅读时间
      
      return () => clearTimeout(timer);
    }
  }, [session, visibleMessages]);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages]);

  // 获取当前正在输入的参与者
  const getCurrentTypingParticipant = () => {
    if (!currentTypingId || !session) return null;
    return session.participants.find(p => p.userId === currentTypingId) ?? null;
  };

  if (!session) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md mx-auto">
        <div className="relative mb-6">
          {/* 漂浮的 AI 头像动画 */}
          <div className="flex justify-center items-center gap-2 mb-4">
            {participants.slice(0, 4).map((p, i) => (
              <div 
                key={p.userId}
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${getParticipantColor(i).bg} flex items-center justify-center text-white text-lg font-bold shadow-lg animate-bounce`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {p.userName[0]}
              </div>
            ))}
            {participants.length > 4 && (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold">
                +{participants.length - 4}
              </div>
            )}
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          🤖 AI 分身会议室
        </h3>
        <p className="text-gray-600 mb-6">
          {participants.length} 位 AI 分身将代表各自用户进行讨论
          <br />
          智能分析并推荐最合适的餐厅
        </p>
        
        {/* 参与者列表 */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <p className="text-xs text-gray-500 mb-3">参与讨论的 AI 分身</p>
          <div className="flex flex-wrap justify-center gap-2">
            {participants.map((p, i) => (
              <div 
                key={p.userId}
                className={`px-3 py-1.5 rounded-full text-sm text-white bg-gradient-to-r ${getParticipantColor(i).bg}`}
              >
                {p.userName}的AI
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={startChat}
          disabled={isLoading}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 transform hover:scale-105"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              正在召唤 AI 分身...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>🚀</span>
              开始 AI 分身讨论
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col max-w-3xl mx-auto">
      {/* 头部 - 聊天室信息 */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex -space-x-2">
                {session.participants.slice(0, 3).map((p, i) => (
                  <div 
                    key={p.userId}
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${getParticipantColor(i).bg} flex items-center justify-center text-white text-sm font-bold border-2 border-white`}
                  >
                    {p.userName[0]}
                  </div>
                ))}
              </div>
              {session.participants.length > 3 && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white text-purple-600 rounded-full text-xs flex items-center justify-center font-bold">
                  +{session.participants.length - 3}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">AI 分身讨论室</h3>
              <p className="text-xs text-white/80">
                {session.participants.length} 位 AI 分身在线
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 聊天内容区 */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white"
      >
        {/* 系统提示 */}
        <div className="text-center">
          <span className="inline-block px-4 py-1.5 bg-gray-200 text-gray-600 text-xs rounded-full">
            🤖 AI 分身已就位，开始讨论吃什么
          </span>
        </div>

        {/* 消息列表 */}
        {session.messages.slice(0, visibleMessages).map((msg, index) => {
          const participantIndex = session.participants.findIndex(p => p.userId === msg.userId);
          const color = getParticipantColor(participantIndex);
          const isMe = participantIndex === 0; // 第一个参与者显示在右边
          
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              color={color}
              isRight={!isMe} // 交替显示左右
              index={participantIndex}
            />
          );
        })}
        
        {/* 正在输入提示 */}
        {currentTypingId && (
          <TypingIndicator 
            participant={getCurrentTypingParticipant()} 
            color={getParticipantColor(session.participants.findIndex(p => p.userId === currentTypingId))}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 底部推荐结果 */}
      {visibleMessages >= session.messages.length && session.recommendation && (
        <RecommendationResult recommendation={session.recommendation} />
      )}
    </div>
  );
}

// 消息气泡组件
function MessageBubble({ 
  message, 
  color, 
  isRight,
  index
}: { 
  message: AvatarMessage; 
  color: typeof AVATAR_COLORS[0];
  isRight: boolean;
  index: number;
}) {
  return (
    <div className={`flex items-end gap-2 ${isRight ? 'flex-row-reverse' : ''} animate-message-appear`}>
      {/* 头像 */}
      <div className="flex flex-col items-center gap-1">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color.bg} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
          {message.userName[0]}
        </div>
        <span className="text-[10px] text-gray-400 max-w-[60px] truncate">
          {message.avatarName.split('的')[0]}AI
        </span>
      </div>
      
      {/* 气泡 */}
      <div className={`max-w-[70%] ${isRight ? 'items-end' : 'items-start'} flex flex-col`}>
        <div 
          className={`
            px-4 py-3 rounded-2xl shadow-sm
            ${isRight 
              ? `${color.bubble} rounded-br-md` 
              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
            }
          `}
        >
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        {/* 消息类型标签 */}
        <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full ${getTypeStyle(message.type)}`}>
          {getTypeLabel(message.type)}
        </span>
      </div>
    </div>
  );
}

// 正在输入指示器
function TypingIndicator({ 
  participant, 
  color 
}: { 
  participant: AvatarParticipant | null; 
  color: typeof AVATAR_COLORS[0];
}) {
  if (!participant) return null;
  
  return (
    <div className="flex items-end gap-2">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color.bg} flex items-center justify-center text-white text-sm font-bold`}>
        {participant.userName[0]}
      </div>
      <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-2">{participant.avatarName.split('的')[0]}AI 正在输入</span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-1"></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-2"></span>
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-typing-3"></span>
        </div>
      </div>
    </div>
  );
}

// 高德地图餐厅信息类型
interface AmapRestaurantInfo {
  name: string;
  address: string;
  rating: string;
  cost: string;
  tel: string;
  mapUrl: string;
  staticMapUrl: string;
  location: string;
}

// 推荐结果组件
function RecommendationResult({ recommendation }: { recommendation: RestaurantRecommendation }) {
  const [restaurant, setRestaurant] = useState<AmapRestaurantInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const priceSymbols = '¥'.repeat(recommendation.priceLevel);
  
  // 搜索高德地图餐厅
  useEffect(() => {
    const searchRestaurant = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/amap/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            cuisine: recommendation.cuisine,
            city: '北京' // 默认城市，可以改为从用户位置获取
          }),
        });
        
        const result = await response.json();
        if (result.code === 0 && result.data) {
          setRestaurant(result.data);
        }
      } catch (error) {
        console.error('搜索餐厅失败:', error);
      } finally {
        setLoading(false);
      }
    };
    
    searchRestaurant();
  }, [recommendation.cuisine]);
  
  return (
    <div className="border-t border-gray-200 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-5">
      {/* 达成共识标题 */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-2xl">🎉</span>
        <h4 className="font-bold text-lg text-gray-800">AI 分身达成共识！</h4>
        <span className="text-2xl">🎉</span>
      </div>
      
      {/* 餐厅卡片 */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-orange-100">
        {/* 高德地图真实餐厅信息 */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">正在搜索附近餐厅...</p>
          </div>
        ) : restaurant ? (
          <>
            {/* 餐厅名称和评分 */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h5 className="font-bold text-xl text-gray-800 mb-1">
                  {restaurant.name}
                </h5>
                <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                    {recommendation.cuisine}
                  </span>
                  <span className="text-yellow-500">⭐ {restaurant.rating}</span>
                  <span className="text-gray-400">|</span>
                  <span>人均 ¥{restaurant.cost}</span>
                </div>
              </div>
            </div>
            
            {/* 地图展示 */}
            {restaurant.staticMapUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
                <img 
                  src={restaurant.staticMapUrl} 
                  alt="餐厅位置"
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* 地址和电话 */}
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2 text-sm">
                <span className="text-gray-400 mt-0.5">📍</span>
                <span className="text-gray-700 flex-1">{restaurant.address}</span>
              </div>
              {restaurant.tel && restaurant.tel !== '暂无电话' && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">📞</span>
                  <a 
                    href={`tel:${restaurant.tel}`}
                    className="text-blue-600 hover:underline"
                  >
                    {restaurant.tel}
                  </a>
                </div>
              )}
            </div>
            
            {/* 导航按钮 */}
            <a
              href={restaurant.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all mb-4"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                高德地图导航
              </span>
            </a>
          </>
        ) : (
          /* 备用显示 */
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h5 className="font-bold text-xl text-gray-800 mb-1">
                  {recommendation.restaurantName}
                </h5>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                    {recommendation.cuisine}
                  </span>
                  <span>{priceSymbols}</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">
                  {recommendation.rating}
                </div>
                <div className="text-xs text-gray-400">评分</div>
              </div>
            </div>
            <p className="text-sm text-gray-500 text-center py-4">
              高德地图数据加载失败，显示默认推荐
            </p>
          </>
        )}
        
        {/* 推荐理由 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl mb-4">
          <p className="text-sm text-gray-700">
            <span className="font-bold text-blue-600">💡 推荐理由：</span>
            {recommendation.reason}
          </p>
        </div>
        
        {/* 推荐菜品 */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">🍽️ 推荐菜品</p>
          <div className="flex flex-wrap gap-2">
            {recommendation.dishes.map((dish) => (
              <span 
                key={dish} 
                className="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 text-sm rounded-full font-medium"
              >
                {dish}
              </span>
            ))}
          </div>
        </div>
        
        {/* 适合人群 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">👥</span>
            <span className="text-gray-600">
              适合：<span className="font-medium text-gray-800">{recommendation.suitableFor.join('、')}</span>
            </span>
          </div>
        </div>
      </div>
      
      {/* 底部提示 */}
      <p className="text-center text-xs text-gray-400 mt-3">
        🤖 由 AI 分身智能分析推荐 · 商家数据来自高德地图
      </p>
    </div>
  );
}

// 获取消息类型样式
function getTypeStyle(type: AvatarMessage['type']): string {
  switch (type) {
    case 'suggestion': return 'bg-blue-100 text-blue-600';
    case 'agreement': return 'bg-green-100 text-green-600';
    case 'concern': return 'bg-yellow-100 text-yellow-600';
    case 'final': return 'bg-orange-100 text-orange-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

// 获取消息类型标签
function getTypeLabel(type: AvatarMessage['type']): string {
  switch (type) {
    case 'suggestion': return '建议';
    case 'agreement': return '赞同';
    case 'concern': return '顾虑';
    case 'final': return '结论';
    default: return '发言';
  }
}
