/**
 * AI 分身对话系统
 * 让每个用户的 AI 分身代表用户进行对话，智能推荐餐厅
 */

import { UserTasteProfile } from './ai-dish-analyzer';

// AI 分身消息
export interface AvatarMessage {
  id: string;
  userId: string;
  userName: string;
  avatarName: string;  // AI 分身名称，如"小明的 AI 分身"
  content: string;
  timestamp: number;
  type: 'suggestion' | 'question' | 'agreement' | 'concern' | 'final';
}

// AI 分身对话会话
export interface AvatarChatSession {
  id: string;
  participants: AvatarParticipant[];
  messages: AvatarMessage[];
  status: 'ongoing' | 'reached_consensus' | 'deadlocked';
  recommendation?: RestaurantRecommendation;
  createdAt: number;
  updatedAt: number;
}

// AI 分身参与者
export interface AvatarParticipant {
  userId: string;
  userName: string;
  avatarName: string;
  avatarPersonality: string;  // AI 分身性格描述
  tasteProfile: UserTasteProfile;
  isOnline: boolean;
}

// 餐厅推荐结果
export interface RestaurantRecommendation {
  restaurantName: string;
  cuisine: string;
  reason: string;
  suitableFor: string[];  // 适合谁
  priceLevel: 1 | 2 | 3 | 4;
  dishes: string[];  // 推荐菜品
  location?: string;
  rating?: number;
}

// 对话轮次配置
export interface ChatConfig {
  maxRounds: number;        // 最大对话轮次
  minRounds: number;        // 最少对话轮次
  consensusThreshold: number; // 达成共识的阈值 (0-1)
}

// 生成 AI 分身名称
export function generateAvatarName(userName: string): string {
  const suffixes = ['的美食向导', '的味蕾管家', '的吃货分身', '的美食 AI'];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${userName}${suffix}`;
}

// 生成 AI 分身性格
export function generateAvatarPersonality(tasteProfile: UserTasteProfile): string {
  const traits: string[] = [];
  
  if (tasteProfile.taste_profile.spicy > 0.6) traits.push('嗜辣');
  if (tasteProfile.taste_profile.sweet > 0.6) traits.push('喜甜');
  if (tasteProfile.price_level <= 2) traits.push('实惠派');
  if (tasteProfile.price_level >= 3) traits.push('品质控');
  
  const cuisines = tasteProfile.preferred_cuisines.slice(0, 2).map(c => c.name);
  
  return `${traits.join('、')}${cuisines.length > 0 ? `，偏爱${cuisines.join('、')}` : ''}`;
}

// 客户端调用：开始 AI 分身对话
export async function startAvatarChat(
  participants: { userId: string; userName: string; tasteProfile: UserTasteProfile }[]
): Promise<AvatarChatSession> {
  const response = await fetch('/api/avatar-chat/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participants }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '启动 AI 分身对话失败');
  }

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(result.message || '启动 AI 分身对话失败');
  }

  return result.data;
}

// 客户端调用：继续对话（进行下一轮）
export async function continueAvatarChat(
  sessionId: string
): Promise<AvatarChatSession> {
  const response = await fetch('/api/avatar-chat/continue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '继续对话失败');
  }

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(result.message || '继续对话失败');
  }

  return result.data;
}

// 客户端调用：一键完成所有对话并获取推荐
export async function completeAvatarChat(
  participants: { userId: string; userName: string; tasteProfile: UserTasteProfile }[]
): Promise<AvatarChatSession> {
  const response = await fetch('/api/avatar-chat/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participants }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'AI 分身对话失败');
  }

  const result = await response.json();
  if (result.code !== 0) {
    throw new Error(result.message || 'AI 分身对话失败');
  }

  return result.data;
}
