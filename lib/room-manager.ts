/**
 * 房间管理器
 * 使用内存存储管理房间状态和参与者
 */

import { UserTasteProfile } from './ai-dish-analyzer';
import { AvatarChatSession } from './ai-avatar-chat';

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

export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Room> = new Map();

  static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * 创建或加入房间
   * 如果房间不存在则创建，否则加入
   */
  createOrJoinRoom(inviteCode: string, participant: RoomParticipant): Room {
    const existingRoom = this.rooms.get(inviteCode);

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
  createRoom(inviteCode: string, creator: RoomParticipant): Room {
    const room: Room = {
      id: `room_${Date.now()}`,
      inviteCode,
      participants: [creator],
      status: 'waiting',
      createdBy: creator.userId,
    };
    this.rooms.set(inviteCode, room);
    console.log(`[RoomManager] 创建房间: ${inviteCode}, 创建者: ${creator.userName}`);
    return room;
  }

  /**
   * 加入房间
   */
  joinRoom(inviteCode: string, participant: RoomParticipant): Room {
    const room = this.rooms.get(inviteCode);
    if (!room) throw new Error('房间不存在');
    if (room.status !== 'waiting' && room.status !== 'ready') {
      throw new Error('房间已开始讨论或已完成');
    }

    // 检查是否已在房间中
    const existing = room.participants.find(p => p.userId === participant.userId);
    if (existing) {
      console.log(`[RoomManager] 用户 ${participant.userName} 已在房间中`);
      return room;
    }

    room.participants.push(participant);
    console.log(`[RoomManager] 用户 ${participant.userName} 加入房间: ${inviteCode}`);
    return room;
  }

  /**
   * 标记用户已准备
   */
  markReady(inviteCode: string, userId: string, tasteProfile: UserTasteProfile): Room {
    const room = this.rooms.get(inviteCode);
    if (!room) throw new Error('房间不存在');

    const participant = room.participants.find(p => p.userId === userId);
    if (!participant) throw new Error('用户不在房间中');

    participant.isReady = true;
    participant.tasteProfile = tasteProfile;

    // 检查是否所有人都准备好（至少1人即可）
    const allReady = room.participants.every(p => p.isReady);
    if (allReady && room.participants.length > 0) {
      room.status = 'ready';
      console.log(`[RoomManager] 房间 ${inviteCode} 所有人已准备 (${room.participants.length}人)`);
    }

    return room;
  }

  /**
   * 检查是否可以开始讨论
   */
  canStart(inviteCode: string, userId: string): boolean {
    const room = this.rooms.get(inviteCode);
    if (!room) return false;

    // 必须是创建者 && 所有人已准备
    return room.createdBy === userId && room.status === 'ready';
  }

  /**
   * 开始讨论
   */
  startDiscussion(inviteCode: string, userId: string): Room {
    const room = this.rooms.get(inviteCode);
    if (!room) throw new Error('房间不存在');
    if (!this.canStart(inviteCode, userId)) {
      throw new Error('无权开始讨论或房间未准备好');
    }

    room.status = 'discussing';
    room.startedAt = Date.now();
    console.log(`[RoomManager] 房间 ${inviteCode} 开始讨论`);
    return room;
  }

  /**
   * 完成讨论
   */
  completeDiscussion(inviteCode: string, session: AvatarChatSession): Room {
    const room = this.rooms.get(inviteCode);
    if (!room) throw new Error('房间不存在');

    room.status = 'completed';
    room.completedAt = Date.now();
    console.log(`[RoomManager] 房间 ${inviteCode} 讨论完成`);
    return room;
  }

  /**
   * 获取房间信息
   */
  getRoom(inviteCode: string): Room | undefined {
    return this.rooms.get(inviteCode);
  }

  /**
   * 删除房间
   */
  deleteRoom(inviteCode: string): boolean {
    const deleted = this.rooms.delete(inviteCode);
    if (deleted) {
      console.log(`[RoomManager] 删除房间: ${inviteCode}`);
    }
    return deleted;
  }

  /**
   * 获取房间状态
   */
  getRoomStatus(inviteCode: string): {
    exists: boolean;
    status?: Room['status'];
    participantCount?: number;
    readyCount?: number;
    isCreator?: boolean;
    userId?: string;
  } {
    const room = this.rooms.get(inviteCode);
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

  /**
   * 清理过期房间（可选）
   */
  cleanupExpiredRooms(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [code, room] of Array.from(this.rooms.entries())) {
      const age = now - (room.completedAt || room.startedAt || 0);
      if (age > maxAgeMs) {
        this.rooms.delete(code);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[RoomManager] 清理了 ${cleaned} 个过期房间`);
    }

    return cleaned;
  }
}

// 使用全局变量避免热重载时数据丢失
const globalForRoomManager = global as unknown as {
  roomManager: RoomManager | undefined;
};

// 导出单例
export const roomManager = globalForRoomManager.roomManager ?? RoomManager.getInstance();

if (process.env.NODE_ENV !== 'production') {
  globalForRoomManager.roomManager = roomManager;
}
