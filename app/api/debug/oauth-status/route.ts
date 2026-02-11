/**
 * OAuth 状态诊断端点
 * 用于调试 Vercel 部署中的 OAuth 问题
 */

import { NextRequest, NextResponse } from 'next/server';

// 标记为动态路由
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 检查环境变量
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const dynamicRedirectUri = `${protocol}://${host}/api/auth/callback`;

    const envCheck = {
      hasClientId: !!process.env.SECONDME_CLIENT_ID,
      hasClientSecret: !!process.env.SECONDME_CLIENT_SECRET,
      hasRedirectUri: !!process.env.SECONDME_REDIRECT_URI,
      redirectUri: process.env.SECONDME_REDIRECT_URI,
      dynamicRedirectUri,
      nodeEnv: process.env.NODE_ENV,
    };

    // 检查 cookies
    const cookies = {
      hasAccessToken: !!request.cookies.get('access_token'),
      hasRefreshToken: !!request.cookies.get('refresh_token'),
      hasOAuthState: !!request.cookies.get('oauth_state'),
      hasUserLoggedIn: !!request.cookies.get('user_logged_in'),
      accessTokenValue: request.cookies.get('access_token')?.value?.substring(0, 20) + '...',
    };

    // 检查 URL 参数（如果是从回调跳转过来的）
    const searchParams = request.nextUrl.searchParams;
    const urlParams = {
      hasError: !!searchParams.get('error'),
      error: searchParams.get('error'),
      hasCode: !!searchParams.get('code'),
      hasState: !!searchParams.get('state'),
    };

    return NextResponse.json({
      code: 0,
      data: {
        timestamp: new Date().toISOString(),
        environment: envCheck,
        cookies,
        urlParams,
        message: '诊断信息已收集',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      code: 500,
      message: error.message,
      stack: error.stack,
    });
  }
}
