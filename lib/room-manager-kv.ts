/**
 * 房间管理器 - Vercel KV 版本
 * 使用 Vercel KV 持久化存储房间状态和参与者
 */

import { kv } from '@vercel/kv';
import { UserTasteProfile } from './ai-dish-analyzer';

// 房间参与者
export interface RoomParticipant {
  userId: string;
  userName: string;
  tasteProfile?: UserTasteProfile;
  isReady: boolean;
  joinedAt: number;
}

// 房间
export interface Room {
  id: string;
  inviteCode: string;
  participants: RoomParticipant[];
  status: 'waiting' | 'ready' | 'discussing' | 'completed';
  createdBy: string;  // 第一个进入的人
  startedAt?: number;
  completedAt?: number;
}

export class RoomManagerKV {
  private static instance: RoomManagerKV;
  private readonly ROOM_TTL = 86400; // 24小时过期

  static getInstance(): RoomManagerKV {
    if (!RoomManagerKV.instance) {
      RoomManagerKV.instance = new RoomManagerKV();
    }
    return RoomManagerKV.instance;
  }

  /**
   * 生成房间的 KV key
   */
  private getRoomKey(inviteCode: string): string {
    return `room:${inviteCode}`;
  }

  /**
   * 创建或加入房间
   * 如果房间不存在则创建，否则加入
   */
  async createOrJoinRoom(inviteCode: string, participant: RoomParticipant): Promise<Room> {
    const existingRoom = await this.getRoom(inviteCode);

    if (existingRoom) {
      // 房间已存在，加入房间
      return this.joinRoom(inviteCode, participant);
    } else {
      // 房间不存在，创建房间
      return this.createRoom(inviteCode, participant);
    }
  }

  /**
   * 创建房间
   */
  async createRoom(inviteCode: string, creator: RoomParticipant): Promise<Room> {
    const room: Room = {
      id: `room_${Date.now()}`,
      inviteCode,
      participants: [creator],
      status: 'waiting',
      createdBy: creator.userId,
    };

    await kv.set(this.getRoomKey(inviteCode), room, { ex: this.ROOM_TTL });
    console.log(`[RoomManagerKV] 创建房间: ${inviteCode}, 创建者: ${creator.userName}`);
    return room;
  }

  /**
   * 加入房间
   */
  async joinRoom(inviteCode: string, participant: RoomParticipant): Promise<Room> {
    const room = await this.getRoom(inviteCode);
    if (!room) throw new Error('房间不存在');
    if (room.status !== 'waiting' && room.status !== 'ready') {
      throw new Error('房间已开始讨论或已完成');
    }

    // 检查是否已在房间中
    const existing = room.participants.find(p => p.userId === participant.userId);
    if (existing) {
      console.log(`[RoomManagerKV] 用户 ${participant.userName} 已在房间中`);
      return room;
    }

    room.participants.push(participant);
    await kv.set(this.getRoomKey(inviteCode), room, { ex: this.ROOM_TTL });
    console.log(`[RoomManagerKV] 用户 ${participant.userName} 加入房间: ${inviteCode}`);
    return room;
  }

  /**
   * 标记用户已准备
   */
  async markReady(inviteCode: string, userId: string, tasteProfile: UserTasteProfile): Promise<Room> {
    const room = await this.getRoom(inviteCode);
    if (!room) throw new Error('房间不存在');

    const participant = room.participants.find(p => p.userId === userId);
    if (!participant) throw new Error('用户不在房间中');

    participant.isReady = true;
    participant.tasteProfile = tasteProfile;

    // 检查是否所有人都准备好（至少1人即可）
    const allReady = room.participants.every(p => p.isReady);
    if (allReady && room.participants.length > 0) {
      room.status = 'ready';
      console.log(`[RoomManagerKV] 房间 ${inviteCode} 所有人已准备 (${room.participants.length}人)`);
    }

    await kv.set(this.getRoomKey(inviteCode), room, { ex: this.ROOM_TTL });
    return room;
  }

  /**
   * 检查是否可以开始讨论
   */
  async canStart(inviteCode: string, userId: string): Promise<boolean> {
    const room = await this.getRoom(inviteCode);
    if (!room) return false;

    // 必须是创建者 && 所有人已准备
    return room.createdBy === userId && room.status === 'ready';
  }

  /**
   * 开始讨论
   */
  async startDiscussion(inviteCode: string, userId: string): Promise<Room> {
    const room = await this.getRoom(inviteCode);
    if (!room) throw new Error('房间不存在');

    const canStart = await this.canStart(inviteCode, userId);
    if (!canStart) {
      throw new Error('无权开始讨论或房间未准备好');
    }

    room.status = 'discussing';
    room.startedAt = Date.now();
    await kv.set(this.getRoomKey(inviteCode), room, { ex: this.ROOM_TTL });
    console.log(`[RoomManagerKV] 房间 ${inviteCode} 开始讨论`);
    return room;
  }

  /**
   * 完成讨论
   */
  async completeDiscussion(inviteCode: string): Promise<Room> {
    const room = await this.getRoom(inviteCode);
    if (!room) throw new Error('房间不存在');

    room.status = 'completed';
    room.completedAt = Date.now();
    await kv.set(this.getRoomKey(inviteCode), room, { ex: this.ROOM_TTL });
    console.log(`[RoomManagerKV] 房间 ${inviteCode} 讨论完成`);
    return room;
  }

  /**
   * 获取房间信息
   */
  async getRoom(inviteCode: string): Promise<Room | null> {
    try {
      const room = await kv.get<Room>(this.getRoomKey(inviteCode));
      return room;
    } catch (error) {
      console.error(`[RoomManagerKV] 获取房间失败:`, error);
      return null;
    }
  }

  /**
   * 删除房间
   */
  async deleteRoom(inviteCode: string): Promise<boolean> {
    try {
      await kv.del(this.getRoomKey(inviteCode));
      console.log(`[RoomManagerKV] 删除房间: ${inviteCode}`);
      return true;
    } catch (error) {
      console.error(`[RoomManagerKV] 删除房间失败:`, error);
      return false;
    }
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
    const room = await this.getRoom(inviteCode);
    if (!room) {
      return { exists: false };
    }

    return {
      exists: true,
      status: room.status,
      participantCount: room.participants.length,
      readyCount: room.participants.filter(p => p.isReady).length,
    };
  }
}

// 导出单例
export const roomManagerKV = RoomManagerKV.getInstance();
