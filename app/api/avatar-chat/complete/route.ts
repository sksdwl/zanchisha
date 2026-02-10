/**
 * 一键完成 AI 分身对话
 * 模拟 AI 分身之间的完整对话过程，最终给出餐厅推荐
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  AvatarChatSession, 
  AvatarParticipant, 
  AvatarMessage,
  RestaurantRecommendation,
  generateAvatarName,
  generateAvatarPersonality
} from '@/lib/ai-avatar-chat';
import { UserTasteProfile, mergeProfiles } from '@/lib/ai-dish-analyzer';

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
        { code: 400, message: '至少需要 2 位参与者' },
        { status: 400 }
      );
    }

    // 创建 AI 分身
    const avatarParticipants: AvatarParticipant[] = participants.map(p => ({
      userId: p.userId,
      userName: p.userName,
      avatarName: generateAvatarName(p.userName),
      avatarPersonality: generateAvatarPersonality(p.tasteProfile),
      tasteProfile: p.tasteProfile,
      isOnline: true,
    }));

    // 合并口味画像，用于智能推荐
    const merged = mergeProfiles(participants.map(p => p.tasteProfile));

    // 生成完整对话
    const messages = generateFullConversation(avatarParticipants, merged);

    // 生成最终推荐
    const recommendation = generateRecommendation(avatarParticipants, merged);

    // 创建完整会话
    const session: AvatarChatSession = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participants: avatarParticipants,
      messages,
      status: 'reached_consensus',
      recommendation,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return NextResponse.json({
      code: 0,
      data: session,
    });

  } catch (error: any) {
    console.error('AI 分身对话失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || 'AI 分身对话失败' },
      { status: 500 }
    );
  }
}

// 生成完整对话内容
function generateFullConversation(
  participants: AvatarParticipant[],
  merged: ReturnType<typeof mergeProfiles>
): AvatarMessage[] {
  const messages: AvatarMessage[] = [];
  const now = Date.now();
  let msgIndex = 1;

  const addMessage = (
    participant: AvatarParticipant,
    content: string,
    type: AvatarMessage['type']
  ) => {
    messages.push({
      id: `msg_${now}_${msgIndex++}`,
      userId: participant.userId,
      userName: participant.userName,
      avatarName: participant.avatarName,
      content,
      timestamp: now + msgIndex * 1000,
      type,
    });
  };

  // 开场
  const p1 = participants[0];
  addMessage(p1, 
    `大家好！我是${p1.avatarName}，代表${p1.userName}。${p1.userName}的口味特点是${p1.avatarPersonality}。今天咱们聚餐，大家说说各自想吃什么？`,
    'question'
  );

  // 各自介绍
  for (let i = 1; i < participants.length; i++) {
    const p = participants[i];
    const topCuisines = p.tasteProfile.preferred_cuisines.slice(0, 2).map(c => c.name).join('、');
    addMessage(p,
      `我是${p.avatarName}！${p.userName}比较喜欢${topCuisines}，${p.avatarPersonality}。`,
      'suggestion'
    );
  }

  // 讨论环节 - 分析共同点和差异
  if (participants.length >= 2) {
    const p2 = participants[1];
    const commonCuisines = merged.common_cuisines;
    
    if (commonCuisines.length > 0) {
      addMessage(p2,
        `听起来咱们都喜欢${commonCuisines.join('、')}呢！那找一家${commonCuisines[0]}餐厅怎么样？`,
        'agreement'
      );
    } else {
      addMessage(p2,
        `看来大家口味不太一样啊...要不找一家融合菜？或者有多种选择的自助？`,
        'concern'
      );
    }
  }

  // 讨论价格和地点
  if (participants.length >= 3) {
    const p3 = participants[2];
    addMessage(p3,
      `对了，预算方面呢？还有谁有忌口或者特别想吃的菜品吗？`,
      'question'
    );
  }

  // 妥协和建议
  const lastP = participants[participants.length - 1];
  const allIngredients = merged.all_ingredients.slice(0, 5).join('、');
  addMessage(lastP,
    `综合分析大家的口味，我们都喜欢${allIngredients}这些食材。辣度方面可以选中辣，大家都能接受。`,
    'suggestion'
  );

  // 最终达成共识
  addMessage(p1,
    `太好了！那我们就去这家餐厅吧！我已经帮大家分析好了，推荐菜品也都列出来了~`,
    'final'
  );

  return messages;
}

// 生成餐厅推荐
function generateRecommendation(
  participants: AvatarParticipant[],
  merged: ReturnType<typeof mergeProfiles>
): RestaurantRecommendation {
  const commonCuisines = merged.common_cuisines;
  const avgPrice = Math.round(
    participants.reduce((sum, p) => sum + p.tasteProfile.price_level, 0) / participants.length
  ) as 1 | 2 | 3 | 4;

  // 根据共同菜系推荐
  let restaurantName = '';
  let cuisine = '';
  let dishes: string[] = [];
  let reason = '';

  if (commonCuisines.includes('川菜')) {
    restaurantName = '蜀香园精品川菜';
    cuisine = '川菜';
    dishes = ['宫保鸡丁', '水煮鱼', '麻婆豆腐', '口水鸡'];
    reason = `大家共同喜欢川菜，这家店口味正宗，辣度可选，适合${participants.map(p => p.userName).join('、')}一起聚餐。`;
  } else if (commonCuisines.includes('粤菜')) {
    restaurantName = '广府茶餐厅';
    cuisine = '粤菜';
    dishes = ['白切鸡', '烧鹅', '虾饺', '蒸排骨'];
    reason = `粤菜清淡鲜美，符合大家的口味偏好，环境舒适适合聚餐聊天。`;
  } else if (commonCuisines.includes('日料')) {
    restaurantName = '樱之味日本料理';
    cuisine = '日料';
    dishes = ['刺身拼盘', '寿司套餐', '天妇罗', '烤鳗鱼'];
    reason = `新鲜刺身和精致寿司，满足大家对日料的喜爱。`;
  } else if (commonCuisines.length === 0) {
    // 没有共同菜系，推荐火锅或自助
    restaurantName = '海底捞火锅';
    cuisine = '火锅';
    dishes = ['鸳鸯锅底', '肥牛', '虾滑', '毛肚', '蔬菜拼盘'];
    reason = `大家口味差异较大，火锅是最佳选择！每人可以选自己喜欢的锅底和菜品，兼容性最强。`;
  } else {
    // 默认推荐
    restaurantName = `${commonCuisines[0] || '融合'}美食坊`;
    cuisine = commonCuisines[0] || '融合菜';
    dishes = ['招牌菜', '特色小炒', '汤品', '主食'];
    reason = `基于大家的口味分析，这家店提供多种选择，能满足每个人的偏好。`;
  }

  return {
    restaurantName,
    cuisine,
    reason,
    suitableFor: participants.map(p => p.userName),
    priceLevel: avgPrice,
    dishes,
    location: '市中心（可根据实际位置调整）',
    rating: 4.5,
  };
}
