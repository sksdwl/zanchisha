'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  AvatarChatSession,
  AvatarMessage,
  RestaurantRecommendation,
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
  inviteCode?: string;
  currentUserId?: string; // 当前用户ID，用于判断是否为房主
  isCreator?: boolean; // 是否为房主
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

export function AvatarChatVisual({ participants, onClose, roomName = 'AI 讨论群', inviteCode, currentUserId, isCreator = false }: AvatarChatVisualProps) {
  const [session, setSession] = useState<AvatarChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [currentTypingId, setCurrentTypingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef(false); // 防止重复自动启动
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null); // 轮询定时器
  const lastMessageCountRef = useRef<number>(0); // 上次消息数量

  // 保存讨论结果到 SecondMe
  const saveDiscussionToSecondMe = async (recommendation: RestaurantRecommendation) => {
    try {
      const sessionResponse = await fetch('/api/auth/session');
      const session = await sessionResponse.json();

      if (session.code === 0 && session.data.isLoggedIn) {
        const noteContent = `今天吃什么讨论结果：
推荐餐厅：${recommendation.restaurantName}
菜系：${recommendation.cuisine}
推荐理由：${recommendation.reason}
推荐菜品：${recommendation.dishes.join('、')}
价格档次：${['经济实惠', '中等价位', '中高档', '高档'][recommendation.priceLevel - 1]}
评分：${recommendation.rating}分

参与讨论：${recommendation.suitableFor.join('、')}`;

        await fetch('/api/secondme/note/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: noteContent,
            tags: ['餐厅推荐', '讨论结果', '咱吃啥', recommendation.cuisine],
          }),
        });

        console.log('[SecondMe] 已保存讨论结果到知识库');
      }
    } catch (error) {
      console.warn('[SecondMe] 保存讨论结果失败:', error);
    }
  };

  // 开始 AI 分身对话（使用 SSE 流式传输，带重连机制）
  const startChat = async () => {
    setIsLoading(true);

    // 初始化 session
    const initialSession: AvatarChatSession = {
      id: `chat_${Date.now()}`,
      participants: participants.map(p => ({
        userId: p.userId,
        userName: p.userName,
        avatarName: `${p.userName}的美食向导`,
        avatarPersonality: '',
        tasteProfile: p.tasteProfile,
        isOnline: true,
      })),
      messages: [],
      status: 'ongoing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSession(initialSession);

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000;

    const attemptConnection = async (): Promise<void> => {
      try {
        console.log(`[SSE] 尝试连接 (${retryCount + 1}/${maxRetries + 1})`);

        // 使用 AbortController 实现超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120秒超时

        const response = await fetch('/api/avatar-chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: 启动讨论失败`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('无法读取响应流');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('[SSE] 流结束');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // 保留最后一个不完整的行
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'message') {
                  setSession(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      messages: [...prev.messages, data.data],
                    };
                  });
                  setVisibleMessages(prev => prev + 1);
                } else if (data.type === 'recommendation') {
                  setSession(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      recommendation: data.data,
                      status: 'reached_consensus',
                    };
                  });
                  saveDiscussionToSecondMe(data.data);
                } else if (data.type === 'done') {
                  setIsLoading(false);
                  console.log('[SSE] 讨论完成');

                  // 保存完整的讨论结果到 localStorage
                  setSession(prev => {
                    if (prev) {
                      try {
                        const sessionData = {
                          ...prev,
                          savedAt: Date.now(),
                        };
                        localStorage.setItem(`chat_session_${inviteCode}`, JSON.stringify(sessionData));
                        console.log('[前端] 已保存讨论结果到本地存储');
                      } catch (error) {
                        console.warn('[前端] 保存讨论结果失败:', error);
                      }
                    }
                    return prev;
                  });
                } else if (data.type === 'error') {
                  console.warn('[SSE] 服务器错误:', data.message);
                }
              } catch (e) {
                console.error('[SSE] 解析数据失败:', line, e);
              }
            }
          }
        }

        // 成功完成，重置重试计数
        retryCount = 0;

      } catch (error: any) {
        console.error('[SSE] 连接失败:', error);

        // 判断是否应该重试
        const isNetworkError = error.name === 'TypeError' ||
                              error.message.includes('network') ||
                              error.message.includes('fetch') ||
                              error.name === 'AbortError';

        if (isNetworkError && retryCount < maxRetries) {
          retryCount++;
          console.log(`[SSE] ${retryDelay}ms 后重试...`);

          // 显示重试提示
          setSession(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: `retry_${Date.now()}`,
                  userId: 'system',
                  userName: '系统',
                  avatarName: '系统提示',
                  content: `网络连接中断，正在重试 (${retryCount}/${maxRetries})...`,
                  type: 'suggestion',
                  timestamp: Date.now(),
                }
              ],
            };
          });

          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptConnection();
        } else {
          // 达到最大重试次数或非网络错误
          const errorMsg = error.name === 'AbortError'
            ? '请求超时，请检查网络连接'
            : `连接失败: ${error.message}`;

          alert(`AI 分身对话失败：${errorMsg}\n\n${retryCount >= maxRetries ? '已达到最大重试次数' : ''}`);
          setIsLoading(false);
        }
      }
    };

    await attemptConnection();
  };

  // 轮询获取消息（非房主成员使用）
  const startPolling = async () => {
    if (!inviteCode) return;

    console.log('[AvatarChat] 非房主成员，启动轮询模式');
    setIsLoading(true);

    // 初始化 session
    const initialSession: AvatarChatSession = {
      id: `session-${Date.now()}`,
      participants: participants.map((p, index) => ({
        userId: p.userId,
        userName: p.userName,
        avatarName: `${p.userName}的美食向导`,
        avatarPersonality: '',
        tasteProfile: p.tasteProfile,
        isOnline: true,
        color: getParticipantColor(index)
      })),
      messages: [],
      status: 'ongoing',
      recommendation: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setSession(initialSession);
    setIsLoading(false);

    // 开始轮询
    const pollMessages = async () => {
      try {
        const response = await fetch(
          `/api/room/messages?inviteCode=${inviteCode}&lastMessageIndex=${lastMessageCountRef.current}`
        );
        const result = await response.json();

        if (result.code === 0) {
          const { messages: newMessages, status, recommendation } = result.data;

          // 如果有新消息，添加到 session
          if (newMessages && newMessages.length > 0) {
            setSession(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: [...prev.messages, ...newMessages],
                recommendation: recommendation || prev.recommendation
              };
            });
            lastMessageCountRef.current += newMessages.length;
          }

          // 如果讨论已完成，停止轮询
          if (status === 'completed') {
            console.log('[AvatarChat] 讨论已完成，停止轮询');
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            // 保存到 SecondMe
            if (recommendation) {
              await saveDiscussionToSecondMe(recommendation);
            }
          }
        }
      } catch (error) {
        console.error('[AvatarChat] 轮询消息失败:', error);
      }
    };

    // 立即执行一次
    await pollMessages();

    // 每 500ms 轮询一次
    pollingIntervalRef.current = setInterval(pollMessages, 500);
  };

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // 打字机效果：显示正在输入的提示
  useEffect(() => {
    if (session && visibleMessages < session.messages.length) {
      const currentMsg = session.messages[visibleMessages];
      setCurrentTypingId(currentMsg.userId);

      // 短暂显示"正在输入"后立即显示消息
      const timer = setTimeout(() => {
        setCurrentTypingId(null);
      }, 800);

      return () => clearTimeout(timer);
    } else {
      setCurrentTypingId(null);
    }
  }, [session, visibleMessages]);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages]);

  // 组件挂载时自动启动讨论（如果有 inviteCode）
  useEffect(() => {
    if (inviteCode && !session && !isLoading && !hasAutoStarted.current) {
      console.log('[AvatarChat] 检测到 inviteCode，自动启动讨论');
      hasAutoStarted.current = true;

      // 根据是否为房主选择不同的模式
      if (isCreator) {
        console.log('[AvatarChat] 房主模式：使用 SSE 连接');
        startChat();
      } else {
        console.log('[AvatarChat] 成员模式：使用轮询');
        startPolling();
      }
    }
  }, [inviteCode, isCreator]); // eslint-disable-line react-hooks/exhaustive-deps

  // 获取当前正在输入的参与者
  const getCurrentTypingParticipant = () => {
    if (!currentTypingId || !session) return null;
    return session.participants.find(p => p.userId === currentTypingId) ?? null;
  };

  // 视图状态：discussion（仅讨论）、split（分屏）、recommendation（仅推荐）
  const [viewMode, setViewMode] = useState<'discussion' | 'split' | 'recommendation'>('discussion');

  // 当讨论完成且有推荐时，自动切换到分屏视图
  useEffect(() => {
    if (session && visibleMessages >= session.messages.length && session.recommendation && !isLoading) {
      // 延迟 1 秒后切换到分屏视图
      const timer = setTimeout(() => {
        setViewMode('split');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [session, visibleMessages, isLoading]);

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

      {/* 主内容区 - 根据视图模式切换 */}
      {viewMode === 'discussion' ? (
        // 仅讨论视图
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {/* 系统提示 */}
          <div className="text-center">
            <span className="inline-block px-4 py-1.5 bg-gray-200 text-gray-600 text-xs rounded-full">
              🤖 AI 分身已就位，开始讨论吃什么
            </span>
          </div>

          {/* 消息列表 */}
          {session.messages.slice(0, visibleMessages).map((msg, index) => {
            const participantIndex = session.participants.findIndex(p => p.userId === msg.userId);
            const safeIndex = participantIndex >= 0 ? participantIndex : 0;
            const color = getParticipantColor(safeIndex);
            // 第一个参与者（自己）在右边，其他人在左边
            const isMe = participantIndex === 0;

            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                color={color}
                isRight={isMe}
                index={safeIndex}
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

          {/* 讨论完成提示 */}
          {visibleMessages >= session.messages.length && session.recommendation && !isLoading && (
            <div className="text-center py-4 animate-fade-in">
              <div className="inline-block px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-lg">
                <span className="text-lg">✨ AI 分身达成共识！正在为您呈现推荐...</span>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'split' ? (
        // 分屏视图：左侧讨论，右侧推荐
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {/* 左侧：讨论内容 */}
          <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <span>💬</span>
                <span>讨论过程</span>
              </h3>
              <button
                onClick={() => setViewMode('recommendation')}
                className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-all"
              >
                仅看推荐 →
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
              {session.messages.map((msg, index) => {
                const participantIndex = session.participants.findIndex(p => p.userId === msg.userId);
                const safeIndex = participantIndex >= 0 ? participantIndex : 0;
                const color = getParticipantColor(safeIndex);
                // 第一个参与者（自己）在右边，其他人在左边
                const isMe = participantIndex === 0;

                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    color={color}
                    isRight={isMe}
                    index={safeIndex}
                  />
                );
              })}
            </div>
          </div>

          {/* 右侧：推荐结果 */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl shadow-lg overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <span>🎉</span>
                <span>推荐结果</span>
              </h3>
              <button
                onClick={() => setViewMode('discussion')}
                className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-all"
              >
                ← 仅看讨论
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <RecommendationResultCompact
                recommendation={session.recommendation!}
                participants={session.participants}
              />
            </div>
          </div>
        </div>
      ) : (
        // 仅推荐视图
        <div className="flex-1 overflow-y-auto">
          <RecommendationResultFullScreen
            recommendation={session.recommendation!}
            participants={session.participants}
            onViewDiscussion={() => setViewMode('split')}
          />
        </div>
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
    <div className={`flex items-start gap-2 ${isRight ? 'flex-row-reverse' : ''} animate-message-appear`}>
      {/* 头像 */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color.bg} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
          {message.userName[0]}
        </div>
        <span className="text-[10px] text-gray-400 max-w-[60px] truncate">
          {message.avatarName.split('的')[0]}
        </span>
      </div>

      {/* 气泡 */}
      <div className={`max-w-[70%] ${isRight ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* 用户名（仅左侧显示） */}
        {!isRight && (
          <span className="text-xs text-gray-500 mb-1 px-2">
            {message.userName}
          </span>
        )}

        <div
          className={`
            px-4 py-3 rounded-2xl shadow-sm
            ${isRight
              ? 'bg-gradient-to-br from-green-400 to-green-500 text-white rounded-tr-sm'
              : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
            }
          `}
        >
          <p className="text-sm leading-relaxed break-words">{message.content}</p>
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

// 紧凑版推荐结果组件（用于分屏显示）
function RecommendationResultCompact({
  recommendation,
  participants,
}: {
  recommendation: RestaurantRecommendation;
  participants: AvatarParticipant[];
}) {
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
            city: '北京'
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
    <div className="p-4 space-y-4 animate-fade-in">
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-orange-500 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">正在搜索附近餐厅...</p>
        </div>
      ) : restaurant ? (
        <>
          {/* 地图缩略图 */}
          {restaurant.staticMapUrl && (
            <div className="relative h-32 rounded-xl overflow-hidden bg-gray-200">
              <img
                src={restaurant.staticMapUrl}
                alt="餐厅位置"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-full shadow text-xs font-bold text-orange-600">
                {recommendation.cuisine}
              </div>
            </div>
          )}

          {/* 餐厅信息 */}
          <div className="bg-white rounded-xl p-4 shadow-md space-y-3">
            <div>
              <h4 className="text-xl font-bold text-gray-800 mb-2">
                {restaurant.name}
              </h4>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-yellow-500">⭐ {restaurant.rating}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">{priceSymbols} ¥{restaurant.cost}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{restaurant.address}</p>
            </div>

            {/* 推荐理由 */}
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 leading-relaxed">{recommendation.reason}</p>
                </div>
              </div>
            </div>

            {/* 推荐菜品 */}
            <div>
              <h5 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1">
                <span>🍽️</span>
                <span>推荐菜品</span>
              </h5>
              <div className="grid grid-cols-2 gap-2">
                {recommendation.dishes.slice(0, 4).map((dish, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg text-center text-sm font-medium text-gray-700"
                  >
                    {dish}
                  </div>
                ))}
              </div>
            </div>

            {/* 适合人群 */}
            <div>
              <h5 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1">
                <span>👥</span>
                <span>适合</span>
              </h5>
              <div className="flex flex-wrap gap-2">
                {recommendation.suitableFor.map((name, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-full text-white text-xs font-medium bg-gradient-to-r ${getParticipantColor(i).bg}`}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2">
              <a
                href={`https://uri.amap.com/marker?position=${restaurant.location}&name=${encodeURIComponent(restaurant.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-sm font-bold text-center shadow hover:shadow-lg transition-all"
              >
                📍 导航
              </a>
              <button
                onClick={() => {
                  const text = `${restaurant.name}\n地址：${restaurant.address}\n评分：${restaurant.rating} ⭐\n人均：¥${restaurant.cost}`;
                  navigator.clipboard.writeText(text);
                  alert('餐厅信息已复制！');
                }}
                className="px-4 py-2 bg-white border-2 border-orange-500 text-orange-500 rounded-xl text-sm font-bold hover:bg-orange-50 transition-all"
              >
                📋
              </button>
            </div>
          </div>
        </>
      ) : (
        // 降级显示
        <div className="bg-white rounded-xl p-4 shadow-md space-y-3">
          <div>
            <h4 className="text-xl font-bold text-gray-800 mb-2">
              {recommendation.restaurantName}
            </h4>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                {recommendation.cuisine}
              </span>
              <span className="text-gray-600">{priceSymbols}</span>
              {recommendation.rating && (
                <>
                  <span className="text-gray-400">|</span>
                  <span className="text-yellow-500">⭐ {recommendation.rating}</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <div className="flex-1">
                <p className="text-sm text-gray-700 leading-relaxed">{recommendation.reason}</p>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1">
              <span>🍽️</span>
              <span>推荐菜品</span>
            </h5>
            <div className="grid grid-cols-2 gap-2">
              {recommendation.dishes.slice(0, 4).map((dish, i) => (
                <div
                  key={i}
                  className="px-3 py-2 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg text-center text-sm font-medium text-gray-700"
                >
                  {dish}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1">
              <span>👥</span>
              <span>适合</span>
            </h5>
            <div className="flex flex-wrap gap-2">
              {recommendation.suitableFor.map((name, i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-white text-xs font-medium bg-gradient-to-r ${getParticipantColor(i).bg}`}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 全屏推荐结果组件
function RecommendationResultFullScreen({
  recommendation,
  participants,
  onViewDiscussion
}: {
  recommendation: RestaurantRecommendation;
  participants: AvatarParticipant[];
  onViewDiscussion: () => void;
}) {
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
            city: '北京'
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
    <div className="min-h-full bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-6 animate-fade-in">
      {/* 顶部返回按钮 */}
      <div className="max-w-4xl mx-auto mb-6">
        <button
          onClick={onViewDiscussion}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all text-gray-700 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">返回分屏视图</span>
        </button>
      </div>

      {/* 主内容 */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 标题区 */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full shadow-lg">
            <span className="text-3xl">🎉</span>
            <h2 className="text-2xl font-bold">AI 分身达成共识！</h2>
            <span className="text-3xl">🎉</span>
          </div>

          <p className="text-gray-600 text-lg">
            经过 {participants.length} 位 AI 分身的深入讨论，为您推荐最合适的餐厅
          </p>
        </div>

        {/* 参与者头像列表 */}
        <div className="flex justify-center items-center gap-3 flex-wrap">
          {participants.map((p, i) => (
            <div key={p.userId} className="flex flex-col items-center gap-1">
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getParticipantColor(i).bg} flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-white`}>
                {p.userName[0]}
              </div>
              <span className="text-xs text-gray-600 font-medium">{p.userName}</span>
            </div>
          ))}
        </div>

        {/* 餐厅推荐卡片 */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500">正在搜索附近餐厅...</p>
            </div>
          ) : restaurant ? (
            <>
              {/* 地图展示 */}
              {restaurant.staticMapUrl && (
                <div className="relative h-64 bg-gray-200">
                  <img
                    src={restaurant.staticMapUrl}
                    alt="餐厅位置"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-full shadow-lg">
                    <span className="text-orange-600 font-bold">{recommendation.cuisine}</span>
                  </div>
                </div>
              )}

              {/* 餐厅信息 */}
              <div className="p-8 space-y-6">
                {/* 餐厅名称和评分 */}
                <div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-3">
                    {restaurant.name}
                  </h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500 text-xl">⭐</span>
                      <span className="text-lg font-semibold text-gray-700">{restaurant.rating}</span>
                    </div>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <span className="text-lg text-gray-600">人均 {priceSymbols} ¥{restaurant.cost}</span>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <span className="text-gray-500">{restaurant.address}</span>
                  </div>
                </div>

                {/* 推荐理由 */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 mb-2">推荐理由</h4>
                      <p className="text-gray-700 leading-relaxed">{recommendation.reason}</p>
                    </div>
                  </div>
                </div>

                {/* 推荐菜品 */}
                <div>
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-xl">🍽️</span>
                    推荐菜品
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {recommendation.dishes.map((dish, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl text-center font-medium text-gray-700 hover:shadow-md transition-shadow"
                      >
                        {dish}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 适合人群 */}
                <div>
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-xl">👥</span>
                    适合
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.suitableFor.map((name, i) => (
                      <span
                        key={i}
                        className={`px-4 py-2 rounded-full text-white font-medium bg-gradient-to-r ${getParticipantColor(i).bg}`}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-4">
                  <a
                    href={`https://uri.amap.com/marker?position=${restaurant.location}&name=${encodeURIComponent(restaurant.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl font-bold text-center shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    📍 高德地图导航
                  </a>
                  <button
                    onClick={() => {
                      // 复制餐厅信息
                      const text = `${restaurant.name}\n地址：${restaurant.address}\n评分：${restaurant.rating} ⭐\n人均：¥${restaurant.cost}`;
                      navigator.clipboard.writeText(text);
                      alert('餐厅信息已复制到剪贴板！');
                    }}
                    className="px-6 py-4 bg-white border-2 border-orange-500 text-orange-500 rounded-2xl font-bold hover:bg-orange-50 transition-all"
                  >
                    📋 复制信息
                  </button>
                </div>
              </div>
            </>
          ) : (
            // 降级显示（无高德地图数据）
            <div className="p-8 space-y-6">
              <div>
                <h3 className="text-3xl font-bold text-gray-800 mb-3">
                  {recommendation.restaurantName}
                </h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    {recommendation.cuisine}
                  </span>
                  <span className="text-lg text-gray-600">人均 {priceSymbols}</span>
                  {recommendation.rating && (
                    <>
                      <div className="h-4 w-px bg-gray-300"></div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="font-semibold">{recommendation.rating}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 mb-2">推荐理由</h4>
                    <p className="text-gray-700 leading-relaxed">{recommendation.reason}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-xl">🍽️</span>
                  推荐菜品
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {recommendation.dishes.map((dish, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl text-center font-medium text-gray-700"
                    >
                      {dish}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-xl">👥</span>
                  适合
                </h4>
                <div className="flex flex-wrap gap-2">
                  {recommendation.suitableFor.map((name, i) => (
                    <span
                      key={i}
                      className={`px-4 py-2 rounded-full text-white font-medium bg-gradient-to-r ${getParticipantColor(i).bg}`}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 推荐结果组件（原来的底部卡片版本，保留作为备用）
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
