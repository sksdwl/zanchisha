/**
 * 邀请码系统
 * 用户需要输入6位邀请码才能进入群聊
 */

// 邀请码信息
export interface InviteCode {
  code: string;           // 6位数字邀请码
  roomName: string;       // 群聊房间名称
  maxUsers: number;       // 最大用户数
  currentUsers: number;   // 当前用户数
  createdAt: number;      // 创建时间
  expiresAt?: number;     // 过期时间（可选）
}

// 验证邀请码请求
export interface ValidateInviteCodeRequest {
  code: string;
}

// 验证邀请码响应
export interface ValidateInviteCodeResponse {
  valid: boolean;
  inviteCode?: InviteCode;
  message?: string;
}

// 生成随机6位邀请码
export function generateInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 客户端验证邀请码
export async function validateInviteCode(code: string): Promise<ValidateInviteCodeResponse> {
  const response = await fetch('/api/invite/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '验证失败');
  }

  const result = await response.json();
  return result.data;
}

// 本地存储邀请码
export function saveInviteCode(code: string) {
  localStorage.setItem('zanchisha_invite_code', code);
}

export function getInviteCode(): string | null {
  return localStorage.getItem('zanchisha_invite_code');
}

export function clearInviteCode() {
  localStorage.removeItem('zanchisha_invite_code');
}

// 模拟邀请码数据库
export const MOCK_INVITE_CODES: InviteCode[] = [
  {
    code: '123456',
    roomName: '今晚聚餐群',
    maxUsers: 5,
    currentUsers: 0,
    createdAt: Date.now(),
  },
  {
    code: '888888',
    roomName: '好友聚餐群',
    maxUsers: 8,
    currentUsers: 0,
    createdAt: Date.now(),
  },
  {
    code: '666666',
    roomName: '周末聚会群',
    maxUsers: 6,
    currentUsers: 0,
    createdAt: Date.now(),
  },
];
