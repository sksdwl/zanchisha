/**
 * 邀请码验证 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { MOCK_INVITE_CODES } from '@/lib/invite-code';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    // 验证格式
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({
        code: 400,
        data: {
          valid: false,
          message: '邀请码必须是6位数字',
        },
      });
    }

    // 查找邀请码
    const inviteCode = MOCK_INVITE_CODES.find(c => c.code === code);

    if (!inviteCode) {
      return NextResponse.json({
        code: 400,
        data: {
          valid: false,
          message: '邀请码不存在或已过期',
        },
      });
    }

    // 检查是否已满
    if (inviteCode.currentUsers >= inviteCode.maxUsers) {
      return NextResponse.json({
        code: 400,
        data: {
          valid: false,
          message: '该房间已满员，请尝试其他邀请码',
        },
      });
    }

    // 验证成功
    return NextResponse.json({
      code: 0,
      data: {
        valid: true,
        inviteCode: {
          code: inviteCode.code,
          roomName: inviteCode.roomName,
          maxUsers: inviteCode.maxUsers,
          currentUsers: inviteCode.currentUsers,
        },
        message: '验证成功',
      },
    });

  } catch (error: any) {
    console.error('邀请码验证失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '验证失败' },
      { status: 500 }
    );
  }
}
