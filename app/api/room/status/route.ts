/**
 * 房间管理 API - 获取房间状态
 * GET /api/room/status?inviteCode=xxx&userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { unifiedRoomManager } from '@/lib/room-manager-unified';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteCode = searchParams.get('inviteCode');
    const userId = searchParams.get('userId');

    if (!inviteCode) {
      return NextResponse.json(
        { code: 400, message: '缺少邀请码' },
        { status: 400 }
      );
    }

    const room = await unifiedRoomManager.getRoom(inviteCode);

    if (!room) {
      return NextResponse.json({
        code: 0,
        data: {
          exists: false,
        }
      });
    }

    return NextResponse.json({
      code: 0,
      data: {
        exists: true,
        room: {
          id: room.id,
          inviteCode: room.inviteCode,
          status: room.status,
          participantCount: room.participants.length,
          readyCount: room.participants.filter(p => p.isReady).length,
          creatorId: room.createdBy, // 添加群主 ID
          isCreator: userId ? room.createdBy === userId : false,
          participants: room.participants.map(p => ({
            userId: p.userId,
            userName: p.userName,
            isReady: p.isReady,
            isCreator: p.userId === room.createdBy, // 标记是否为群主
          })),
        }
      }
    });
  } catch (error: any) {
    console.error('[API] 获取房间状态失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '获取房间状态失败' },
      { status: 500 }
    );
  }
}
