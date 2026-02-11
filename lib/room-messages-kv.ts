/**
 * 房间消息 KV 存储
 * 用于存储和同步讨论消息
 */

import { kv } from '@vercel/kv';
import { AvatarMessage, RestaurantRecommendation } from './ai-avatar-chat';

export interface RoomMessages {
  inviteCode: string;
  messages: AvatarMessage[];
  recommendation?: RestaurantRecommendation;
  status: 'ongoing' | 'completed';
  createdAt: number;
  updatedAt: number;
}

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

    await kv.set(key, JSON.stringify(data), { ex: 3600 }); // 1小时过期
    console.log(`[RoomMessagesKV] 初始化房间消息: ${inviteCode}`);
  }

  /**
   * 添加消息
   */
  async addMessage(inviteCode: string, message: AvatarMessage): Promise<void> {
    const key = this.getKey(inviteCode);
    const dataStr = await kv.get<string>(key);

    if (!dataStr) {
      console.warn(`[RoomMessagesKV] 房间不存在，先初始化: ${inviteCode}`);
      await this.init(inviteCode);
    }

    const data: RoomMessages = dataStr ? JSON.parse(dataStr) : {
      inviteCode,
      messages: [],
      status: 'ongoing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    data.messages.push(message);
    data.updatedAt = Date.now();

    await kv.set(key, JSON.stringify(data), { ex: 3600 });
    console.log(`[RoomMessagesKV] 添加消息: ${inviteCode}, 总数: ${data.messages.length}`);
  }

  /**
   * 设置推荐结果
   */
  async setRecommendation(inviteCode: string, recommendation: RestaurantRecommendation): Promise<void> {
    const key = this.getKey(inviteCode);
    const dataStr = await kv.get<string>(key);

    if (!dataStr) {
      console.warn(`[RoomMessagesKV] 房间不存在: ${inviteCode}`);
      return;
    }

    const data: RoomMessages = JSON.parse(dataStr);
    data.recommendation = recommendation;
    data.updatedAt = Date.now();

    await kv.set(key, JSON.stringify(data), { ex: 3600 });
    console.log(`[RoomMessagesKV] 设置推荐结果: ${inviteCode}`);
  }

  /**
   * 标记完成
   */
  async markCompleted(inviteCode: string): Promise<void> {
    const key = this.getKey(inviteCode);
    const dataStr = await kv.get<string>(key);

    if (!dataStr) {
      console.warn(`[RoomMessagesKV] 房间不存在: ${inviteCode}`);
      return;
    }

    const data: RoomMessages = JSON.parse(dataStr);
    data.status = 'completed';
    data.updatedAt = Date.now();

    await kv.set(key, JSON.stringify(data), { ex: 3600 });
    console.log(`[RoomMessagesKV] 标记完成: ${inviteCode}`);
  }

  /**
   * 获取房间消息
   */
  async getMessages(inviteCode: string): Promise<RoomMessages | null> {
    const key = this.getKey(inviteCode);
    const dataStr = await kv.get<string>(key);

    if (!dataStr) {
      return null;
    }

    return JSON.parse(dataStr);
  }

  /**
   * 删除房间消息
   */
  async deleteMessages(inviteCode: string): Promise<void> {
    const key = this.getKey(inviteCode);
    await kv.del(key);
    console.log(`[RoomMessagesKV] 删除房间消息: ${inviteCode}`);
  }
}

export const roomMessagesKV = new RoomMessagesKV();
