'use client';

import React, { useState } from 'react';
import { InviteCode } from '@/lib/invite-code';
import { InviteCodeInput } from '@/components/invite/invite-code-input';
import { AvatarChatVisual } from '@/components/avatar/avatar-chat-visual';
import { UserTasteProfile } from '@/lib/ai-dish-analyzer';

// 群聊用户
interface RoomUser {
  id: string;
  name: string;
  avatar: string;
  tasteProfile?: UserTasteProfile;
  isReady: boolean;
}

export function GroupChatRoom() {
  const [step, setStep] = useState<'invite' | 'profile' | 'chat'>('invite');
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [currentUser, setCurrentUser] = useState<RoomUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'ready' | 'discussing'>('waiting');
  const [isCreator, setIsCreator] = useState(false);
  const [secondMeProfile, setSecondMeProfile] = useState<any>(null);
  const [additionalInfo, setAdditionalInfo] = useState<string>('');

  // 轮询房间状态，实时更新参与者列表
  React.useEffect(() => {
    if (!inviteCode || !currentUser || step !== 'profile') {
      return;
    }

    console.log('[房间轮询] 开始轮询房间状态...');

    const pollRoomStatus = async () => {
      try {
        const response = await fetch(
          `/api/room/status?inviteCode=${inviteCode.code}&userId=${currentUser.id}`
        );
        const result = await response.json();

        if (result.code === 0 && result.data.exists) {
          const room = result.data.room;
          console.log('[房间轮询] 房间状态:', room);

          // 更新房间状态
          setRoomStatus(room.status);
          setIsCreator(room.isCreator);

          // 更新参与者列表
          const updatedUsers = room.participants.map((p: any) => ({
            id: p.userId,
            name: p.userName,
            avatar: '👤',
            isReady: p.isReady,
          }));
          setUsers(updatedUsers);

          // 如果房间状态变为 discussing，自动进入聊天
          if (room.status === 'discussing' && step === 'profile') {
            console.log('[房间轮询] 房间已开始讨论，进入聊天页面');
            setStep('chat');
          }
        }
      } catch (error) {
        console.error('[房间轮询] 获取房间状态失败:', error);
      }
    };

    // 立即执行一次
    pollRoomStatus();

    // 每 2 秒轮询一次
    const interval = setInterval(pollRoomStatus, 2000);

    return () => {
      console.log('[房间轮询] 停止轮询');
      clearInterval(interval);
    };
  }, [inviteCode, currentUser, step]);

  // 加载 SecondMe 用户画像（仅在组件挂载时执行一次）
  React.useEffect(() => {
    const loadSecondMeProfile = async () => {
      try {
        console.log('[SecondMe] 开始加载用户画像...');

        const sessionResponse = await fetch('/api/auth/session');
        const session = await sessionResponse.json();
        console.log('[SecondMe] Session 响应:', session);

        if (session.code === 0 && session.data.isLoggedIn) {
          console.log('[SecondMe] 用户已登录，开始获取 shades 和 softmemory...');

          const [shadesRes, memoryRes] = await Promise.all([
            fetch('/api/secondme/user/shades'),
            fetch('/api/secondme/user/softmemory'),
          ]);

          console.log('[SecondMe] Shades 响应状态:', shadesRes.status);
          console.log('[SecondMe] Memory 响应状态:', memoryRes.status);

          const shades = await shadesRes.json();
          const memory = await memoryRes.json();

          console.log('[SecondMe] Shades 数据:', shades);
          console.log('[SecondMe] Memory 数据:', memory);

          // 从软记忆中提取饮食偏好
          const foodMemories = memory.code === 0
            ? memory.data.list.filter((m: any) =>
                m.content && (
                  m.content.includes('喜欢') ||
                  m.content.includes('菜') ||
                  m.content.includes('口味') ||
                  m.content.includes('餐厅')
                )
              )
            : [];

          setSecondMeProfile({
            shades: shades.code === 0 ? shades.data.shades : [],
            softMemory: memory.code === 0 ? memory.data.list : [],
            foodMemories, // 饮食相关的记忆
          });

          console.log('[SecondMe] 加载用户画像成功:', {
            shades: shades.code === 0 ? shades.data.shades.length : 0,
            memories: memory.code === 0 ? memory.data.list.length : 0,
            foodMemories: foodMemories.length,
          });
        } else {
          console.log('[SecondMe] 用户未登录');
        }
      } catch (error) {
        console.error('[SecondMe] 加载用户信息失败:', error);
      }
    };

    loadSecondMeProfile();
  }, []);

  // 邀请码验证成功
  const handleInviteSuccess = (code: InviteCode) => {
    setInviteCode(code);
    setStep('profile');

    // 生成稳定的用户ID（使用 localStorage 或固定值）
    let userId = localStorage.getItem('temp_user_id');
    if (!userId) {
      userId = 'user_' + Date.now();
      localStorage.setItem('temp_user_id', userId);
    }

    // 添加当前用户到房间
    const newUser: RoomUser = {
      id: userId,
      name: '我',
      avatar: '👤',
      isReady: false,
    };
    setCurrentUser(newUser);
    setUsers([newUser]);

    // 检查是否是创建者（第一个进入的人）
    setIsCreator(true); // 简化处理，实际应该从后端获取
  };

  // 用户完成口味画像并标记准备
  const handleProfileComplete = async (tasteProfile: UserTasteProfile) => {
    if (currentUser) {
      // 合并 SecondMe 信息和菜品分析
      const enhancedProfile = {
        ...tasteProfile,
        secondMeShades: secondMeProfile?.shades || [],
        secondMeSoftMemory: secondMeProfile?.softMemory || [],
        additionalInfo: (tasteProfile as any).additionalInfo || '', // 用户补充的信息
      };

      const updatedUser = { ...currentUser, tasteProfile: enhancedProfile, isReady: true };
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      setIsReady(true);

      // 保存口味画像到 SecondMe（如果已登录）
      try {
        const sessionResponse = await fetch('/api/auth/session');
        const session = await sessionResponse.json();

        if (session.code === 0 && session.data.isLoggedIn) {
          // 构建饮食偏好笔记
          const cuisines = tasteProfile.preferred_cuisines.map(c => c.name).join('、');
          const ingredients = tasteProfile.preferred_ingredients.join('、');
          const tasteDesc = [];
          if (tasteProfile.taste_profile.spicy > 0.6) tasteDesc.push('喜欢辣');
          if (tasteProfile.taste_profile.sweet > 0.6) tasteDesc.push('喜欢甜');
          if (tasteProfile.taste_profile.numbing > 0.6) tasteDesc.push('喜欢麻');

          let noteContent = `我的饮食偏好：
- 偏爱菜系：${cuisines || '无特别偏好'}
- 口味特点：${tasteDesc.join('、') || '口味适中'}
- 喜欢的食材：${ingredients}
- 价格偏好：${['经济实惠', '中等价位', '中高档', '高档'][tasteProfile.price_level - 1] || '中等价位'}`;

          // 如果用户补充了信息，添加到笔记中
          if ((tasteProfile as any).additionalInfo) {
            noteContent += `\n\n补充说明：\n${(tasteProfile as any).additionalInfo}`;
          }

          await fetch('/api/secondme/note/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: noteContent,
              tags: ['饮食偏好', '口味画像', '咱吃啥'],
            }),
          });

          console.log('[SecondMe] 已保存口味画像到知识库');
        }
      } catch (error) {
        console.warn('[SecondMe] 保存口味画像失败:', error);
      }

      // 调用后端 API 标记准备
      try {
        console.log('[前端] 调用 /api/room/ready，参数:', {
          inviteCode: inviteCode?.code,
          userId: currentUser.id,
          userName: currentUser.name,
        });

        const response = await fetch('/api/room/ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inviteCode: inviteCode?.code,
            userId: currentUser.id,
            userName: currentUser.name,
            tasteProfile: enhancedProfile,
          }),
        });

        const result = await response.json();
        console.log('[前端] /api/room/ready 返回结果:', result);

        if (result.code === 0) {
          console.log('[前端] 设置房间状态为:', result.data.room.status);
          console.log('[前端] isCreator:', result.data.room.isCreator);
          setRoomStatus(result.data.room.status);

          // 同时更新 isCreator 状态（从后端获取准确值）
          setIsCreator(result.data.room.isCreator);
        } else {
          console.error('[前端] API 返回错误:', result.message);
        }
      } catch (error) {
        console.error('标记准备失败:', error);
      }
    }
  };

  // 开始讨论（仅创建者）
  const handleStart = async () => {
    try {
      const response = await fetch('/api/room/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode?.code,
          userId: currentUser?.id,
        }),
      });

      const result = await response.json();
      if (result.code === 0) {
        setRoomStatus('discussing');
        setStep('chat');
      } else {
        alert(result.message || '开始讨论失败');
      }
    } catch (error) {
      console.error('开始讨论失败:', error);
      alert('开始讨论失败');
    }
  };

  // 返回邀请码输入
  const handleBack = () => {
    setStep('invite');
    setInviteCode(null);
    setUsers([]);
    setCurrentUser(null);
  };

  if (step === 'invite') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <InviteCodeInput onSuccess={handleInviteSuccess} />
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* 房间信息 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{inviteCode?.roomName}</h1>
                <p className="text-gray-500 text-sm mt-1">
                  邀请码：{inviteCode?.code} · {users.length}/{inviteCode?.maxUsers} 人
                </p>
              </div>
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-gray-600"
              >
                退出
              </button>
            </div>
          </div>

          {/* 快速入口提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-4">📝</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">完善你的口味信息</h2>
            <p className="text-gray-600 mb-4">
              为了让 AI 分身更好地代表你参与讨论，
              <br />
              请先输入你喜欢的菜品
            </p>

            {/* 房间参与者信息 */}
            {users.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-800">
                    👥 房间参与者 ({users.length}人)
                  </span>
                  <span className="text-xs text-green-600">
                    {users.filter(u => u.isReady).length}/{users.length} 已准备
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                        user.isReady
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      <span>{user.avatar}</span>
                      <span>{user.name}</span>
                      {user.isReady && <span className="text-xs">✓</span>}
                    </div>
                  ))}
                </div>
                {roomStatus === 'ready' && isCreator && (
                  <div className="mt-3 pt-3 border-t border-green-300">
                    <p className="text-xs text-green-700 mb-2">
                      ✅ 所有人已准备，你可以开始讨论了
                    </p>
                  </div>
                )}
                {roomStatus === 'waiting' && (
                  <p className="text-xs text-green-600 mt-2">
                    等待其他成员准备...
                  </p>
                )}
              </div>
            )}

            {/* SecondMe 信息展示 - 调试版本 */}
            {(() => {
              console.log('[调试] secondMeProfile:', secondMeProfile);
              console.log('[调试] shades数量:', secondMeProfile?.shades?.length || 0);
              console.log('[调试] softMemory数量:', secondMeProfile?.softMemory?.length || 0);
              console.log('[调试] foodMemories数量:', secondMeProfile?.foodMemories?.length || 0);
              return null;
            })()}

            {secondMeProfile && (secondMeProfile.shades.length > 0 || secondMeProfile.softMemory.length > 0) ? (
              <div className="bg-blue-100 p-4 rounded-lg mb-4 text-left">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  ✅ 已加载你的 SecondMe 个人画像
                </p>
                {secondMeProfile.shades.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-blue-600">兴趣标签：</span>
                    {secondMeProfile.shades.slice(0, 5).map((shade: any) => (
                      <span key={shade.id} className="text-xs bg-blue-200 px-2 py-1 rounded ml-1">
                        {shade.shadeIcon} {shade.shadeName}
                      </span>
                    ))}
                  </div>
                )}
                {secondMeProfile.foodMemories && secondMeProfile.foodMemories.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-blue-600">饮食记忆：</span>
                    <div className="mt-1 text-xs text-blue-700">
                      {secondMeProfile.foodMemories.slice(0, 3).map((memory: any, idx: number) => (
                        <div key={idx} className="mt-1">• {memory.factContent || memory.content}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 p-4 rounded-lg mb-4 text-left">
                <p className="text-sm text-yellow-800">
                  ℹ️ 未加载到 SecondMe 信息，请手动输入你的饮食偏好
                </p>
              </div>
            )}

            {/* 补充信息输入框 */}
            {!isReady && (
              <div className="mb-4">
                <label className="block text-left text-sm font-medium text-gray-700 mb-2">
                  补充你的饮食偏好（可选）
                </label>
                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="例如：我喜欢吃川菜和湘菜，特别喜欢麻辣口味，不吃香菜..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1 text-left">
                  💡 提示：输入你的口味偏好、喜欢的菜系、不吃的食材等，AI 会更好地理解你的需求
                </p>
              </div>
            )}

            {!isReady ? (
              <button
                onClick={() => {
                  // 模拟完成口味画像
                  const mockProfile: UserTasteProfile = {
                    user_id: currentUser?.id || 'user_1',
                    preferred_cuisines: [{ name: '川菜', weight: 0.8 }, { name: '湘菜', weight: 0.6 }],
                    taste_profile: { spicy: 0.7, sweet: 0.3, salty: 0.5, sour: 0.4, numbing: 0.6 },
                    preferred_ingredients: ['牛肉', '辣椒', '豆腐'],
                    cooking_methods: ['炒', '煮'],
                    price_level: 2,
                    normalized_dishes: [{ original: '宫保鸡丁', standard: '宫保鸡丁', cuisine: '川菜', aliases: [] }],
                    additionalInfo: additionalInfo, // 添加用户补充的信息
                  };
                  handleProfileComplete(mockProfile);
                }}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
              >
                准备完成
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center text-green-600 font-medium">
                  ✅ 已准备
                </div>

                {/* 调试信息 */}
                <div className="text-xs text-gray-500 text-center">
                  调试: isCreator={isCreator.toString()}, roomStatus={roomStatus}
                </div>

                {/* 开始按钮（仅创建者可见） */}
                {isCreator && roomStatus === 'ready' && (
                  <button
                    onClick={handleStart}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
                  >
                    🚀 开始讨论
                  </button>
                )}

                {/* 等待提示 */}
                {roomStatus === 'waiting' && (
                  <p className="text-gray-600 text-sm">
                    {users.length === 1
                      ? '单人模式：点击上方"开始讨论"即可开始'
                      : `等待其他成员准备... (${users.filter(u => u.isReady).length}/${users.length})`
                    }
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // AI 分身群聊
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 py-4 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 房间头部 */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{inviteCode?.roomName}</h1>
            <p className="text-white/60 text-sm">
              🤖 AI 分身讨论中 · {users.length} 人参与
            </p>
          </div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            离开房间
          </button>
        </div>

        {/* AI 分身群聊 */}
        {currentUser?.tasteProfile && (
          <AvatarChatVisual
            participants={users.filter(u => u.tasteProfile).map(u => ({
              userId: u.id,
              userName: u.name,
              tasteProfile: u.tasteProfile!,
            }))}
            inviteCode={inviteCode?.code}
            onClose={handleBack}
          />
        )}
      </div>
    </div>
  );
}
