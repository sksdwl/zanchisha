/**
 * 继续 AI 分身对话
 * 基于当前会话状态，生成下一轮对话
 */

import { NextRequest, NextResponse } from 'next/server';
import { AvatarChatSession, AvatarMessage } from '@/lib/ai-avatar-chat';

interface RequestBody {
  sessionId: string;
}

// 简单的内存存储（实际项目应该用数据库）
const sessions = new Map<string, AvatarChatSession>();

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { sessionId } = body;

    // 这里简化处理，实际应该从数据库获取会话
    // 现在直接模拟生成新的对话消息
    
    return NextResponse.json({
      code: 0,
      data: {
        message: '继续对话功能需要接入真实 AI API',
        hint: '请使用 /api/avatar-chat/complete 一键完成对话',
      },
    });

  } catch (error: any) {
    console.error('继续对话失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '继续对话失败' },
      { status: 500 }
    );
  }
}
