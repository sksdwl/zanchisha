/**
 * 房间消息轮询 API
 * GET /api/room/messages?inviteCode=xxx&lastMessageIndex=0
 * 用于非房主成员轮询获取讨论消息
 */

import { NextRequest, NextResponse } from 'next/server';
import { roomMessagesKV } from '@/lib/room-messages-kv';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const inviteCode = searchParams.get('inviteCode');
    const lastMessageIndex = parseInt(searchParams.get('lastMessageIndex') || '0');

    if (!inviteCode) {
      return NextResponse.json(
        { code: 400, message: '缺少房间邀请码' },
        { status: 400 }
      );
    }

    // 从 KV 获取房间消息
    const roomMessages = await roomMessagesKV.getMessages(inviteCode);

    if (!roomMessages) {
      return NextResponse.json(
        { code: 404, message: '房间消息不存在' },
        { status: 404 }
      );
    }

    // 只返回新消息（从 lastMessageIndex 之后的）
    const newMessages = roomMessages.messages.slice(lastMessageIndex);

    return NextResponse.json({
      code: 0,
      data: {
        messages: newMessages,
        totalCount: roomMessages.messages.length,
        status: roomMessages.status,
        recommendation: roomMessages.recommendation,
      }
    });

  } catch (error: any) {
    console.error('[API] 获取房间消息失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '获取消息失败' },
      { status: 500 }
    );
  }
}
