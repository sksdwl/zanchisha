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

  // 邀请码验证成功
  const handleInviteSuccess = (code: InviteCode) => {
    setInviteCode(code);
    setStep('profile');
    
    // 添加当前用户到房间
    const newUser: RoomUser = {
      id: 'user_' + Date.now(),
      name: '我',
      avatar: '👤',
      isReady: false,
    };
    setCurrentUser(newUser);
    setUsers([newUser]);
  };

  // 用户完成口味画像
  const handleProfileComplete = (tasteProfile: UserTasteProfile) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, tasteProfile, isReady: true };
      setCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      setStep('chat');
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
                };
                handleProfileComplete(mockProfile);
              }}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
            >
              跳过，使用示例数据
            </button>
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
            onClose={handleBack}
          />
        )}
      </div>
    </div>
  );
}
