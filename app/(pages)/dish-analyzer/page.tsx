'use client';

import React, { useState } from 'react';
import { UserTasteProfile, TasteProfile, CuisinePreference } from '@/lib/ai-dish-analyzer';
import { useAuth } from '@/components/auth/auth-provider';
import { LoginButton } from '@/components/auth/login-button';
import { AvatarChat } from '@/components/avatar/avatar-chat';

// 用户输入数据
interface UserInput {
  id: string;
  name: string;
  dishes: string;
  isAnalyzing: boolean;
  error?: string;
  profile?: UserTasteProfile;
}

// 合并多个用户画像
const mergeProfiles = (profiles: UserTasteProfile[]) => {
  if (profiles.length === 0) return null;
  
  const cuisineCount = new Map<string, number>();
  profiles.forEach(p => {
    p.preferred_cuisines.forEach(c => {
      cuisineCount.set(c.name, (cuisineCount.get(c.name) || 0) + 1);
    });
  });
  
  const threshold = profiles.length * 0.5;
  const commonCuisines = Array.from(cuisineCount.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([name]) => name);
  
  const avgTaste: TasteProfile = {
    spicy: profiles.reduce((sum, p) => sum + p.taste_profile.spicy, 0) / profiles.length,
    sweet: profiles.reduce((sum, p) => sum + p.taste_profile.sweet, 0) / profiles.length,
    salty: profiles.reduce((sum, p) => sum + p.taste_profile.salty, 0) / profiles.length,
    sour: profiles.reduce((sum, p) => sum + p.taste_profile.sour, 0) / profiles.length,
    numbing: profiles.reduce((sum, p) => sum + p.taste_profile.numbing, 0) / profiles.length,
  };
  
  return { commonCuisines, avgTaste };
};

// 调用后端 API 进行 AI 分析
const analyzeWithAPI = async (userId: string, dishes: string[]): Promise<UserTasteProfile> => {
  const response = await fetch('/api/analyze-dishes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, dishes }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '分析失败');
  }

  const result = await response.json();
  
  if (result.code !== 0) {
    throw new Error(result.message || '分析失败');
  }

  return result.data;
};

// 口味雷达图组件
const TasteRadar = ({ taste }: { taste: TasteProfile }) => {
  const maxVal = 1;
  const size = 120;
  const center = size / 2;
  const radius = size * 0.35;
  
  const labels = ['辣', '甜', '咸', '酸', '麻'];
  const values = [taste.spicy, taste.sweet, taste.salty, taste.sour, taste.numbing];
  
  const getPoint = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const r = (val / maxVal) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };
  
  const points = values.map((v, i) => getPoint(i, v));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  
  return (
    <svg width={size} height={size} className="mx-auto">
      {[0.2, 0.4, 0.6, 0.8, 1].map(scale => (
        <polygon
          key={scale}
          points={labels.map((_, i) => {
            const p = getPoint(i, maxVal * scale);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      {labels.map((_, i) => {
        const p = getPoint(i, maxVal);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}
      <path d={pathD} fill="rgba(249, 115, 22, 0.3)" stroke="#f97316" strokeWidth="2" />
      {labels.map((label, i) => {
        const p = getPoint(i, maxVal * 1.2);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill="#6b7280"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
};

// 口味条组件
const TasteBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="w-8 text-gray-600">{label}</span>
    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value * 100}%`, backgroundColor: color }}
      />
    </div>
    <span className="w-10 text-right text-gray-500">{(value * 100).toFixed(0)}%</span>
  </div>
);

// 用户卡片组件
const UserCard = ({ 
  user, 
  onUpdate, 
  onAnalyze, 
  onRemove,
  isLoggedIn,
}: { 
  user: UserInput; 
  onUpdate: (id: string, field: keyof UserInput, value: any) => void;
  onAnalyze: (id: string) => void;
  onRemove: (id: string) => void;
  isLoggedIn: boolean;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    {/* 头部 */}
    <div className="px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-100 flex items-center justify-between">
      <input
        type="text"
        value={user.name}
        onChange={e => onUpdate(user.id, 'name', e.target.value)}
        className="bg-transparent font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded px-1"
        placeholder="输入名字"
      />
      <button
        onClick={() => onRemove(user.id)}
        className="text-gray-400 hover:text-red-500 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <div className="p-4">
      {!user.profile ? (
        // 输入模式
        <>
          <textarea
            value={user.dishes}
            onChange={e => onUpdate(user.id, 'dishes', e.target.value)}
            placeholder={`输入你喜欢的菜品，每行一道：
宫保鸡丁
麻婆豆腐
水煮鱼
...`}
            className="w-full h-40 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          />
          {user.error && (
            <p className="mt-2 text-sm text-red-500">{user.error}</p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {user.dishes.split('\n').filter(d => d.trim()).length} 道菜
            </span>
            <button
              onClick={() => onAnalyze(user.id)}
              disabled={user.isAnalyzing || !user.dishes.trim() || !isLoggedIn}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                user.isAnalyzing || !user.dishes.trim() || !isLoggedIn
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg'
              }`}
            >
              {user.isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  AI 分析中...
                </span>
              ) : (
                'AI 分析'
              )}
            </button>
          </div>
          {!isLoggedIn && (
            <p className="mt-2 text-xs text-orange-500">
              请先登录后再使用 AI 分析功能
            </p>
          )}
        </>
      ) : (
        // 结果展示模式
        <div className="space-y-4">
          <TasteRadar taste={user.profile.taste_profile} />
          
          <div className="space-y-2">
            <TasteBar label="辣" value={user.profile.taste_profile.spicy} color="#ef4444" />
            <TasteBar label="麻" value={user.profile.taste_profile.numbing} color="#a855f7" />
            <TasteBar label="甜" value={user.profile.taste_profile.sweet} color="#f97316" />
            <TasteBar label="咸" value={user.profile.taste_profile.salty} color="#3b82f6" />
          </div>
          
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">偏好菜系</p>
            <div className="flex flex-wrap gap-2">
              {user.profile.preferred_cuisines.map(c => (
                <span
                  key={c.name}
                  className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full"
                >
                  {c.name} {(c.weight * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
          
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">识别菜品</p>
            <div className="max-h-24 overflow-y-auto">
              {user.profile.normalized_dishes.slice(0, 5).map((d, i) => (
                <div key={i} className="text-xs text-gray-600 py-0.5">
                  {d.original !== d.standard ? (
                    <span className="text-gray-400 line-through mr-1">{d.original}</span>
                  ) : null}
                  <span className="text-gray-800">{d.standard}</span>
                  <span className="text-orange-500 ml-1">({d.cuisine})</span>
                </div>
              ))}
              {user.profile.normalized_dishes.length > 5 && (
                <p className="text-xs text-gray-400 mt-1">
                  还有 {user.profile.normalized_dishes.length - 5} 道菜...
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={() => onUpdate(user.id, 'profile', undefined)}
            className="w-full py-2 text-sm text-gray-500 hover:text-orange-600 transition-colors border-t border-gray-100 pt-3"
          >
            重新编辑
          </button>
        </div>
      )}
    </div>
  </div>
);

// 群体匹配结果组件
const GroupResult = ({ users }: { users: UserInput[] }) => {
  const analyzedUsers = users.filter(u => u.profile);
  const [showAvatarChat, setShowAvatarChat] = useState(false);
  
  if (analyzedUsers.length < 2) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">👥</div>
        <h3 className="text-lg font-medium text-gray-800 mb-1">等待更多用户</h3>
        <p className="text-sm text-gray-500">
          至少需要 2 位用户完成 AI 分析，才能生成群体推荐
        </p>
      </div>
    );
  }
  
  const merged = mergeProfiles(analyzedUsers.map(u => u.profile!));
  
  // 准备 AI 分身对话的参与者数据
  const participants = analyzedUsers.map(u => ({
    userId: u.id,
    userName: u.name,
    tasteProfile: u.profile!,
  }));
  
  return (
    <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6">
      <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-2xl">🎯</span>
        群体匹配结果
        <span className="text-sm font-normal text-gray-500">
          ({analyzedUsers.length} 人)
        </span>
      </h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">共同偏好菜系</p>
        {merged?.commonCuisines.length ? (
          <div className="flex flex-wrap gap-2">
            {merged.commonCuisines.map(c => (
              <span key={c} className="px-3 py-1.5 bg-white text-orange-700 text-sm font-medium rounded-lg shadow-sm">
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">暂无共同菜系 😅</p>
        )}
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">群体平均口味</p>
        <div className="bg-white rounded-lg p-3 space-y-2">
          <TasteBar label="辣" value={merged!.avgTaste.spicy} color="#ef4444" />
          <TasteBar label="麻" value={merged!.avgTaste.numbing} color="#a855f7" />
          <TasteBar label="甜" value={merged!.avgTaste.sweet} color="#f97316" />
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-gray-800 mb-2">💡 推荐策略</p>
        {merged!.commonCuisines.length > 0 ? (
          <>
            <p className="text-sm text-gray-600">
              推荐 <span className="font-medium text-orange-600">{merged!.commonCuisines[0]}</span> 餐厅
            </p>
            <p className="text-xs text-gray-500 mt-1">
              大多数人都喜欢 {merged!.commonCuisines[0]}，匹配度最高
            </p>
          </>
        ) : (
          <div className="space-y-2 text-sm text-gray-600">
            <p>口味差异较大，建议：</p>
            <ul className="space-y-1 text-xs text-gray-500 list-disc list-inside">
              <li>选择融合菜系餐厅（创意中餐、亚洲融合菜）</li>
              <li>选择自助餐厅，各自选择喜欢的食物</li>
              <li>火锅（不同锅底+各种食材，兼容所有人）</li>
            </ul>
          </div>
        )}
      </div>
      
      {/* AI 分身对话按钮 */}
      <button
        onClick={() => setShowAvatarChat(true)}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <span>🤖</span>
        <span>让 AI 分身讨论吃什么</span>
      </button>
      
      {/* AI 分身对话弹窗 */}
      {showAvatarChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl">
            <AvatarChat 
              participants={participants}
              onClose={() => setShowAvatarChat(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// 登录提示组件
const LoginPrompt = () => (
  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 text-center mb-8">
    <div className="text-6xl mb-4">🔐</div>
    <h2 className="text-xl font-bold text-gray-800 mb-2">请先登录</h2>
    <p className="text-gray-600 mb-6 max-w-md mx-auto">
      使用 SecondMe 账号登录后，即可使用 AI 智能分析功能，
      帮助你和好友找到大家都喜欢的餐厅
    </p>
    <LoginButton />
  </div>
);

// 主页面
export default function DishAnalyzerPage() {
  const { isLoggedIn, isLoading } = useAuth();
  const [users, setUsers] = useState<UserInput[]>([
    { id: '1', name: '我', dishes: '', isAnalyzing: false }
  ]);
  
  const addUser = () => {
    const id = String(users.length + 1);
    setUsers([...users, { id, name: `好友 ${id}`, dishes: '', isAnalyzing: false }]);
  };
  
  const removeUser = (id: string) => {
    if (users.length <= 1) return;
    setUsers(users.filter(u => u.id !== id));
  };
  
  const updateUser = (id: string, field: keyof UserInput, value: any) => {
    setUsers(users.map(u => u.id === id ? { ...u, [field]: value, error: undefined } : u));
  };
  
  const analyzeUser = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user || !user.dishes.trim()) return;
    
    setUsers(users.map(u => u.id === id ? { ...u, isAnalyzing: true, error: undefined } : u));
    
    try {
      const dishes = user.dishes.split('\n').filter(d => d.trim());
      const profile = await analyzeWithAPI(id, dishes);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isAnalyzing: false, profile } : u));
    } catch (error: any) {
      setUsers(prev => prev.map(u => u.id === id ? { 
        ...u, 
        isAnalyzing: false, 
        error: error.message || '分析失败，请重试' 
      } : u));
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🍜 咱吃啥</h1>
          <p className="text-gray-600">AI 智能分析群体口味，帮你找到大家都能接受的餐厅</p>
        </div>
        
        {/* 登录提示 */}
        {!isLoggedIn && <LoginPrompt />}
        
        {/* 使用步骤 */}
        {isLoggedIn && (
          <div className="flex justify-center gap-8 mb-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
              输入喜欢的菜品
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
              AI 分析口味画像
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-medium">3</span>
              获取群体推荐
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：用户输入区 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-800">
                参与用户 ({users.length})
              </h2>
              <div className="flex items-center gap-3">
                {isLoggedIn && <LoginButton />}
                {isLoggedIn && (
                  <button
                    onClick={addUser}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    添加好友
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  onUpdate={updateUser}
                  onAnalyze={analyzeUser}
                  onRemove={removeUser}
                  isLoggedIn={isLoggedIn}
                />
              ))}
            </div>
          </div>
          
          {/* 右侧：群体结果 */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <GroupResult users={users} />
            </div>
          </div>
        </div>
        
        {/* 示例数据按钮 */}
        {isLoggedIn && (
          <div className="mt-8 text-center space-y-2">
            <button
              onClick={() => {
                setUsers([
                  { id: '1', name: '小明', dishes: '宫保鸡丁\n麻婆豆腐\n水煮鱼\n宫爆鸡丁\n辣子鸡\n回锅肉\n酸菜鱼\n毛血旺\n口水鸡\n鱼香肉丝', isAnalyzing: false },
                  { id: '2', name: '小红', dishes: '糖醋排骨\n红烧肉\n清蒸鱼\n白切鸡\n西红柿炒蛋\n可乐鸡翅\n土豆牛腩\n地三鲜\n木须肉\n炒青菜', isAnalyzing: false },
                  { id: '3', name: '小李', dishes: '寿司\n刺身\n拉面\n天妇罗\n烤鳗鱼\n寿喜烧\n炸鸡\n乌冬面\n咖喱饭\n猪排饭', isAnalyzing: false },
                ]);
              }}
              className="text-sm text-gray-500 hover:text-orange-600 underline"
            >
              加载示例数据（演示用）
            </button>
            <p className="text-xs text-gray-400">
              配置 SECONDME_API_KEY 后可调用真实 AI API，当前为模拟模式
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
