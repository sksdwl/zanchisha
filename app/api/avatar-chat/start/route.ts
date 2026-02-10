/**
 * 启动 AI 分身对话
 * 创建会话，让 AI 分身代表用户开始讨论
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  AvatarChatSession, 
  AvatarParticipant, 
  generateAvatarName, 
  generateAvatarPersonality 
} from '@/lib/ai-avatar-chat';
import { UserTasteProfile } from '@/lib/ai-dish-analyzer';

interface RequestBody {
  participants: {
    userId: string;
    userName: string;
    tasteProfile: UserTasteProfile;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { participants } = body;

    if (!participants || participants.length < 2) {
      return NextResponse.json(
        { code: 400, message: '至少需要 2 位参与者才能进行 AI 分身对话' },
        { status: 400 }
      );
    }

    // 创建 AI 分身参与者
    const avatarParticipants: AvatarParticipant[] = participants.map(p => ({
      userId: p.userId,
      userName: p.userName,
      avatarName: generateAvatarName(p.userName),
      avatarPersonality: generateAvatarPersonality(p.tasteProfile),
      tasteProfile: p.tasteProfile,
      isOnline: true,
    }));

    // 创建会话
    const session: AvatarChatSession = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participants: avatarParticipants,
      messages: [],
      status: 'ongoing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 生成开场白
    const openingMessages = generateOpeningMessages(avatarParticipants);
    session.messages.push(...openingMessages);

    return NextResponse.json({
      code: 0,
      data: session,
    });

  } catch (error: any) {
    console.error('启动 AI 分身对话失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '启动 AI 分身对话失败' },
      { status: 500 }
    );
  }
}

// 生成开场白消息
function generateOpeningMessages(participants: AvatarParticipant[]) {
  const messages = [];
  const now = Date.now();

  // 第一个 AI 分身发起话题
  const initiator = participants[0];
  messages.push({
    id: `msg_${now}_1`,
    userId: initiator.userId,
    userName: initiator.userName,
    avatarName: initiator.avatarName,
    content: `大家好！我是${initiator.avatarName}。今天咱们一起吃饭，我先说说${initiator.userName}的口味：${initiator.avatarPersonality}。大家有什么建议吗？`,
    timestamp: now,
    type: 'question' as const,
  });

  // 其他 AI 分身依次回应
  for (let i = 1; i < Math.min(participants.length, 3); i++) {
    const p = participants[i];
    messages.push({
      id: `msg_${now}_${i + 1}`,
      userId: p.userId,
      userName: p.userName,
      avatarName: p.avatarName,
      content: `嗨！我是${p.avatarName}。${p.userName}的口味特点是${p.avatarPersonality}。我觉得我们可以找一家...`,
      timestamp: now + i * 1000,
      type: 'suggestion' as const,
    });
  }

  return messages;
}
