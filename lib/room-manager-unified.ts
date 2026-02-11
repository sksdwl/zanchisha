/**
 * 统一房间管理器
 * 优先使用 Vercel KV，失败时降级到内存存储
 */

import { roomManagerKV } from './room-manager-kv';
import { roomManager as roomManagerMemory } from './room-manager';
import type { Room, RoomParticipant } from './room-manager';
import type { UserTasteProfile } from './ai-dish-analyzer';

class UnifiedRoomManager {
  private useKV: boolean = true;

  constructor() {
    // 检查是否配置了 KV
    this.useKV = !!process.env.KV_REST_API_URL;
    console.log(`[UnifiedRoomManager] 使用存储: ${this.useKV ? 'Vercel KV' : '内存'}`);
  }

  /**
   * 创建或加入房间
   */
  async createOrJoinRoom(inviteCode: string, participant: RoomParticipant): Promise<Room> {
    if (this.useKV) {
      try {
        return await roomManagerKV.createOrJoinRoom(inviteCode, participant);
      } catch (error) {
        console.error('[UnifiedRoomManager] KV 失败，降级到内存:', error);
        return roomManagerMemory.createOrJoinRoom(inviteCode, participant);
      }
    }
    return roomManagerMemory.createOrJoinRoom(inviteCode, participant);
  }

  /**
   * 创建房间
   */
  async createRoom(inviteCode: string, creator: RoomParticipant): Promise<Room> {
    if (this.useKV) {
      try {
        return await roomManagerKV.createRoom(inviteCode, creator);
      } catch (error) {
        console.error('[UnifiedRoomManager] KV 失败，降级到内存:', error);
        return roomManagerMemory.createRoom(inviteCode, creator);
      }
    }
    return roomManagerMemory.createRoom(inviteCode, creator);
  }

  /**
   * 加入房间
   */
  async joinRoom(inviteCode: string, participant: RoomParticipant): Promise<Room> {
    if (this.useKV) {
      try {
        return await roomManagerKV.joinRoom(inviteCode, participant);
      } catch (error) {
        console.error('[UnifiedRoomManager] KV 失败，降级到内存:', error);
        return roomManagerMemory.joinRoom(inviteCode, participant);
      }
    }
    return roomManagerMemory.joinRoom(inviteCode, participant);
  }

  /**
   * 标记用户已准备
   */
  async markReady(inviteCode: string, userId: string, tasteProfile: UserTasteProfile): Promise<Room> {
    if (this.useKV) {
      try {
        return await roomManagerKV.markReady(inviteCode, userId, tasteProfile);
      } catch (error) {
        console.error('[UnifiedRoomManager] KV 失败，降级到内存:', error);
        return roomManagerMemory.markReady(inviteCode, userId, tasteProfile);
      }
    }
    return roomManagerMemory.markReady(inviteCode, userId, tasteProfile);
  }

  /**
   * 检查是否可以开始讨论
   */
  async canStart(inviteCode: string, userId: string): Promise<boolean> {
    if (this.useKV) {
      try {
        return await roomManagerKV.canStart(inviteCode, userId);
      } catch (error) {
        console.error('[UnifiedRoomManager] KV 失败，降级到内存:', error);
        return roomManagerMemory.canStart(inviteCode, userId);
      }
    }
    return roomManagerMemory.canStart(inviteCode, userId);
  }

  /**
   * 开始讨论
   */
  async startDiscussion(inviteCode: string, userId: string): Promise<Room> {
    if (this.useKV) {
      try {
        return await roomManagerKV.startDiscussion(inviteCode, userId);
      } catch (error) {
        console.error('[UnifiedRoomManager] KV 失败，降级到内存:', error);
        return roomManagerMemory.startDiscussion(inviteCode, userId);
      }
    }
    return roomManagerMemory.startDiscussion(inviteCode, userId);
  }

  /**
   * 完成讨论
   */
  async completeDiscussion(inviteCode: string): Promise<Room> {
    if (this.useKV) {
      try {
        return await roomManagerKV.completeDiscussion(inviteCode);
      } catch (error) {
        console.error('[UnifiedRoomManager] KV 失败，降级到内存:', error);
        return roomManagerMemory.completeDiscussion(inviteCode, {} as any);
      }
    }
    return roomManagerMemory.completeDiscussion(inviteCode, {} as any);
  }

  /**
   * 获取房间信息
   */
  async getRoom(inviteCode: string): Promise<Room | undefined | null> {
    if (this.useKV) {
      try {
        return await roomManagerKV.getRoom(inviteCode);
      } catch (error) {
        console.error('[UnifiedRoomManager] KV 失败，降级到内存:', error);
        return roomManagerMemory.getRoom(inviteCode);
      }
    }
    return roomManagerMemory.getRoom(inviteCode);
  }

  /**
   * 删除房间
   */
  async deleteRoom(inviteCode: string): Promise<boolean> {
    if (this.useKV) {
      try {
        return await roomManagerKV.deleteRoom(inviteCode);
      } catch (error) {
        console.error('[UnifiedRoomManager] KV 失败，降级到内存:', error);
        return roomManagerMemory.deleteRoom(inviteCode);
      }
    }
    return roomManagerMemory.deleteRoom(inviteCode);
  }

  /**
   * 获取房间状态
   */
  async getRoomStatus(inviteCode: string): Promise<{
    exists: boolean;
    status?: Room['status'];
    participantCount?: number;
    readyCount?: number;
  }> {
    if (this.useKV) {
      try {
        return await roomManagerKV.getRoomStatus(inviteCode);
      } catch (error) {
        console.error('[UnifiedRoomManager] KV 失败，降级到内存:', error);
        return roomManagerMemory.getRoomStatus(inviteCode);
      }
    }
    return roomManagerMemory.getRoomStatus(inviteCode);
  }
}

// 导出单例
export const unifiedRoomManager = new UnifiedRoomManager();
