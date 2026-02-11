/**
 * SecondMe 用户软记忆 API
 * GET /api/secondme/user/softmemory
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { code: 401, message: '未登录' },
        { status: 401 }
      );
    }

    const response = await fetch('https://app.mindos.com/gate/lab/api/secondme/user/softmemory', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`SecondMe API 错误: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('获取软记忆失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message },
      { status: 500 }
    );
  }
}
