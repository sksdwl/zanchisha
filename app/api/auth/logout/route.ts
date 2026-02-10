/**
 * 登出路由
 * 清除用户的登录状态
 */

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    code: 0,
    message: '登出成功',
  });
  
  // 清除所有认证相关的 cookie
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  response.cookies.delete('user_logged_in');
  response.cookies.delete('oauth_state');
  
  return response;
}

// 也支持 GET 请求（方便测试）
export async function GET() {
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  
  // 清除所有认证相关的 cookie
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  response.cookies.delete('user_logged_in');
  response.cookies.delete('oauth_state');
  
  return response;
}
