/**
 * OAuth 回调路由
 * 处理 SecondMe 授权后的回调，用 code 换取 access_token
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 获取 URL 参数
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // 检查错误
    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error)}`, request.url)
      );
    }
    
    // 检查必要参数
    if (!code) {
      return NextResponse.redirect(
        new URL('/?error=missing_code', request.url)
      );
    }
    
    // 验证 state（防止 CSRF 攻击）
    const cookieState = request.cookies.get('oauth_state')?.value;
    if (!state || state !== cookieState) {
      return NextResponse.redirect(
        new URL('/?error=invalid_state', request.url)
      );
    }
    
    // 读取配置
    const clientId = process.env.SECONDME_CLIENT_ID;
    const clientSecret = process.env.SECONDME_CLIENT_SECRET;
    const redirectUri = process.env.SECONDME_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
    
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/?error=missing_config', request.url)
      );
    }
    
    // 用 code 换取 token
    const tokenResponse = await fetch('https://app.mindos.com/gate/lab/api/oauth/token/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });
    
    const tokenResult = await tokenResponse.json();

    // 详细日志
    console.log('[OAuth Callback] Token 响应:', JSON.stringify(tokenResult));
    console.log('[OAuth Callback] Response status:', tokenResponse.status);

    if (tokenResult.code !== 0 || !tokenResult.data?.accessToken) {
      console.error('[OAuth Callback] Token 请求失败:', tokenResult);
      console.error('[OAuth Callback] 请求参数:', {
        grant_type: 'authorization_code',
        client_id: clientId,
        code: code,
        redirect_uri: redirectUri,
      });
      return NextResponse.redirect(
        new URL(`/?error=token_request_failed&message=${encodeURIComponent(tokenResult.message || '未知错误')}&code=${tokenResult.code}`, request.url)
      );
    }
    
    const tokenData = tokenResult.data;
    
    // 创建响应，重定向到首页
    const response = NextResponse.redirect(new URL('/dish-analyzer', request.url));
    
    // 清除 oauth_state cookie
    response.cookies.delete('oauth_state');
    
    // 保存 access_token 到 httpOnly cookie
    response.cookies.set('access_token', tokenData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expiresIn || 7200, // 默认 2 小时
    });
    
    // 保存 refresh_token（如果有）
    if (tokenData.refreshToken) {
      response.cookies.set('refresh_token', tokenData.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2592000, // 30 天
      });
    }
    
    // 保存用户信息到 cookie（简化版，实际可以查数据库）
    response.cookies.set('user_logged_in', 'true', {
      httpOnly: false, // 前端可以读取
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 7200,
    });
    
    return response;
    
  } catch (error: any) {
    console.error('回调处理失败:', error);
    return NextResponse.redirect(
      new URL('/?error=callback_error', request.url)
    );
  }
}
