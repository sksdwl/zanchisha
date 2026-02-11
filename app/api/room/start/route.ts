/**
 * 房间管理 API - 开始讨论
 * POST /api/room/start
 */

import { NextRequest, NextResponse } from 'next/server';
import { roomManager } from '@/lib/room-manager';

export async function POST(request: NextRequest) {
  try {
    const { inviteCode, userId } = await request.json();

    if (!inviteCode || !userId) {
      return NextResponse.json(
        { code: 400, message: '缺少必需参数' },
        { status: 400 }
      );
    }

    // 检查是否可以开始
    if (!roomManager.canStart(inviteCode, userId)) {
      return NextResponse.json(
        { code: 403, message: '无权开始讨论或房间未准备好' },
        { status: 403 }
      );
    }

    // 开始讨论
    const room = roomManager.startDiscussion(inviteCode, userId);

    return NextResponse.json({
      code: 0,
      data: {
        room: {
          id: room.id,
          inviteCode: room.inviteCode,
          status: room.status,
          startedAt: room.startedAt,
        }
      }
    });
  } catch (error: any) {
    console.error('[API] 开始讨论失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '开始讨论失败' },
      { status: 500 }
    );
  }
}
