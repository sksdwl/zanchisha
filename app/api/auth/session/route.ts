/**
 * Session 查询路由
 * 获取当前登录用户的信息
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 从 cookie 获取 access_token
    const accessToken = request.cookies.get('access_token')?.value;

    console.log('[Session Check] 检查登录状态:', {
      hasAccessToken: !!accessToken,
      tokenPreview: accessToken?.substring(0, 20) + '...',
      allCookies: request.cookies.getAll().map(c => c.name),
    });

    // 如果没有 token，返回未登录状态
    if (!accessToken) {
      console.log('[Session Check] ❌ 未登录：没有 access_token');
      return NextResponse.json({
        code: 0,
        data: {
          isLoggedIn: false,
          user: null,
        },
      });
    }

    console.log('[Session Check] ✅ 已登录');

    // 可选：调用 SecondMe API 获取用户信息
    // 这里简单返回登录状态，实际可以查数据库或调用 /api/secondme/user/info

    return NextResponse.json({
      code: 0,
      data: {
        isLoggedIn: true,
        user: {
          // 可以在这里添加用户基本信息
          // 实际项目中可以从数据库或 API 获取
        },
      },
    });
    
  } catch (error: any) {
    console.error('获取 session 失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message },
      { status: 500 }
    );
  }
}
