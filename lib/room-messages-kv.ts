/**
 * 房间消息内存存储
 * 用于存储和同步讨论消息（内存实现，无需 Redis）
 */

import { AvatarMessage, RestaurantRecommendation } from './ai-avatar-chat';

export interface RoomMessages {
  inviteCode: string;
  messages: AvatarMessage[];
  recommendation?: RestaurantRecommendation;
  status: 'ongoing' | 'completed';
  createdAt: number;
  updatedAt: number;
}

// 内存存储
const memoryStore = new Map<string, RoomMessages>();

// 自动清理过期数据（1小时后）
const EXPIRY_TIME = 3600 * 1000; // 1小时

function cleanupExpiredRooms() {
  const now = Date.now();
  for (const [key, data] of memoryStore.entries()) {
    if (now - data.updatedAt > EXPIRY_TIME) {
      memoryStore.delete(key);
      console.log(`[RoomMessagesMemory] 自动清理过期房间: ${data.inviteCode}`);
    }
  }
}

// 每10分钟清理一次过期数据
setInterval(cleanupExpiredRooms, 10 * 60 * 1000);

class RoomMessagesKV {
  private getKey(inviteCode: string): string {
    return `room:${inviteCode}:messages`;
  }

  /**
   * 初始化房间消息
   */
  async init(inviteCode: string): Promise<void> {
    const key = this.getKey(inviteCode);
    const data: RoomMessages = {
      inviteCode,
      messages: [],
      status: 'ongoing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    memoryStore.set(key, data);
    console.log(`[RoomMessagesMemory] 初始化房间消息: ${inviteCode}`);
  }

  /**
   * 添加消息
   */
  async addMessage(inviteCode: string, message: AvatarMessage): Promise<void> {
    const key = this.getKey(inviteCode);
    let data = memoryStore.get(key);

    if (!data) {
      console.warn(`[RoomMessagesMemory] 房间不存在，先初始化: ${inviteCode}`);
      await this.init(inviteCode);
      data = memoryStore.get(key)!;
    }

    data.messages.push(message);
    data.updatedAt = Date.now();

    memoryStore.set(key, data);
    console.log(`[RoomMessagesMemory] 添加消息: ${inviteCode}, 总数: ${data.messages.length}`);
  }

  /**
   * 设置推荐结果
   */
  async setRecommendation(inviteCode: string, recommendation: RestaurantRecommendation): Promise<void> {
    const key = this.getKey(inviteCode);
    const data = memoryStore.get(key);

    if (!data) {
      console.warn(`[RoomMessagesMemory] 房间不存在: ${inviteCode}`);
      return;
    }

    data.recommendation = recommendation;
    data.updatedAt = Date.now();

    memoryStore.set(key, data);
    console.log(`[RoomMessagesMemory] 设置推荐结果: ${inviteCode}`);
  }

  /**
   * 标记完成
   */
  async markCompleted(inviteCode: string): Promise<void> {
    const key = this.getKey(inviteCode);
    const data = memoryStore.get(key);

    if (!data) {
      console.warn(`[RoomMessagesMemory] 房间不存在: ${inviteCode}`);
      return;
    }

    data.status = 'completed';
    data.updatedAt = Date.now();

    memoryStore.set(key, data);
    console.log(`[RoomMessagesMemory] 标记完成: ${inviteCode}`);
  }

  /**
   * 获取房间消息
   */
  async getMessages(inviteCode: string): Promise<RoomMessages | null> {
    const key = this.getKey(inviteCode);
    const data = memoryStore.get(key);

    if (!data) {
      return null;
    }

    return data;
  }

  /**
   * 删除房间消息
   */
  async deleteMessages(inviteCode: string): Promise<void> {
    const key = this.getKey(inviteCode);
    memoryStore.delete(key);
    console.log(`[RoomMessagesMemory] 删除房间消息: ${inviteCode}`);
  }
}

export const roomMessagesKV = new RoomMessagesKV();
