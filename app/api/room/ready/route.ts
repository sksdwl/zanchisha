/**
 * 房间管理 API - 准备状态
 * POST /api/room/ready
 */

import { NextRequest, NextResponse } from 'next/server';
import { roomManager } from '@/lib/room-manager';

export async function POST(request: NextRequest) {
  try {
    const { inviteCode, userId, userName, tasteProfile } = await request.json();

    console.log('[API] /api/room/ready 收到请求:', { inviteCode, userId, userName });

    if (!inviteCode || !userId || !tasteProfile) {
      return NextResponse.json(
        { code: 400, message: '缺少必需参数' },
        { status: 400 }
      );
    }

    // 如果房间不存在或已完成，创建新房间
    let room = roomManager.getRoom(inviteCode);
    if (!room || room.status === 'completed' || room.status === 'discussing') {
      if (room) {
        console.log(`[API] 房间状态为 ${room.status}，重新创建房间`);
        // 删除旧房间
        roomManager.deleteRoom(inviteCode);
      } else {
        console.log('[API] 房间不存在，创建新房间');
      }

      room = roomManager.createRoom(inviteCode, {
        userId,
        userName: userName || '用户',
        isReady: false,
        joinedAt: Date.now(),
      });
    } else {
      console.log('[API] 房间已存在，检查用户是否在房间中');
      // 房间存在且状态正常，检查用户是否已在房间中
      const participant = room.participants.find(p => p.userId === userId);
      if (!participant) {
        console.log('[API] 用户不在房间中，加入房间');
        room = roomManager.joinRoom(inviteCode, {
          userId,
          userName: userName || '用户',
          isReady: false,
          joinedAt: Date.now(),
        });
      } else {
        console.log('[API] 用户已在房间中');
      }
    }

    // 标记用户已准备
    console.log('[API] 标记用户已准备');
    room = roomManager.markReady(inviteCode, userId, tasteProfile);

    console.log('[API] 返回房间状态:', {
      status: room.status,
      participantCount: room.participants.length,
      isCreator: room.createdBy === userId,
    });

    return NextResponse.json({
      code: 0,
      data: {
        room: {
          id: room.id,
          inviteCode: room.inviteCode,
          status: room.status,
          participantCount: room.participants.length,
          readyCount: room.participants.filter(p => p.isReady).length,
          isCreator: room.createdBy === userId,
        }
      }
    });
  } catch (error: any) {
    console.error('[API] 标记准备失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '标记准备失败' },
      { status: 500 }
    );
  }
}
