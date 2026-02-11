/**
 * OAuth 登录路由
 * 生成 SecondMe 授权 URL，用户点击后跳转到授权页面
 */

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // 从环境变量读取配置
    const clientId = process.env.SECONDME_CLIENT_ID;
    
    // 动态确定回调地址
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const defaultRedirectUri = `${protocol}://${host}/api/auth/callback`;
    const redirectUri = process.env.SECONDME_REDIRECT_URI || defaultRedirectUri;
    
    console.log('[OAuth Login] Redirect URI:', redirectUri);
    
    if (!clientId) {
      return NextResponse.json(
        { code: 500, message: 'OAuth 配置错误：缺少 CLIENT_ID' },
        { status: 500 }
      );
    }

    // 生成随机 state（防止 CSRF 攻击）
    const state = Buffer.from(Math.random().toString()).toString('base64').substring(0, 32);
    
    // 构建授权 URL
    const oauthUrl = new URL('https://go.second.me/oauth/');
    oauthUrl.searchParams.append('client_id', clientId);
    oauthUrl.searchParams.append('redirect_uri', redirectUri);
    oauthUrl.searchParams.append('response_type', 'code');
    oauthUrl.searchParams.append('state', state);
    // 请求所有需要的权限：用户信息、兴趣标签、软记忆、聊天、添加笔记
    oauthUrl.searchParams.append('scope', 'user.info user.info.shades user.info.softmemory chat note.add');
    
    // 将 state 存入 cookie（用于后续验证）
    const response = NextResponse.json({
      code: 0,
      data: {
        oauth_url: oauthUrl.toString(),
        state: state,
      },
    });
    
    // 设置 state cookie（10 分钟有效期）
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 分钟
      path: '/',
    });
    
    return response;
    
  } catch (error: any) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '登录失败' },
      { status: 500 }
    );
  }
}
