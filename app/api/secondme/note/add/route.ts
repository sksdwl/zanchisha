/**
 * SecondMe 添加笔记 API
 * POST /api/secondme/note/add
 *
 * 用于将用户的饮食偏好和讨论结果保存到 SecondMe 知识库
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { code: 401, message: '未登录' },
        { status: 401 }
      );
    }

    const { content, tags } = await request.json();

    if (!content) {
      return NextResponse.json(
        { code: 400, message: '缺少笔记内容' },
        { status: 400 }
      );
    }

    const response = await fetch('https://app.mindos.com/gate/lab/api/secondme/note/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        tags: tags || [],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SecondMe API 错误 (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('添加笔记失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message },
      { status: 500 }
    );
  }
}
