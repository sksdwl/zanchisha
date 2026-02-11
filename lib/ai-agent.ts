/**
 * AI Agent 类
 * 每个 Agent 代表一个用户的 AI 分身，基于用户口味画像进行对话
 */

import { DeepSeekClient, ChatMessage } from './deepseek-client';
import { UserTasteProfile } from './ai-dish-analyzer';
import { AvatarParticipant, AvatarMessage } from './ai-avatar-chat';

// 对话上下文
export interface ConversationContext {
  round: number;
  conversationHistory: AvatarMessage[];
  isFirstMessage: boolean;
}

export class FoodDiscussionAgent {
  private id: string;
  private userName: string;
  private tasteProfile: UserTasteProfile;
  private personality: string;
  private llmClient: DeepSeekClient;
  private conversationHistory: ChatMessage[];
  private secondMeContext: string;

  constructor(participant: AvatarParticipant, llmClient: DeepSeekClient) {
    this.id = participant.userId;
    this.userName = participant.userName;
    this.tasteProfile = participant.tasteProfile;
    this.personality = participant.avatarPersonality;
    this.llmClient = llmClient;
    this.conversationHistory = [];

    // 构建 SecondMe 上下文
    this.secondMeContext = this.buildSecondMeContext(participant.tasteProfile);

    // 初始化系统 prompt
    this.conversationHistory.push({
      role: 'system',
      content: this.buildSystemPrompt(),
    });
  }

  private buildSecondMeContext(tasteProfile: UserTasteProfile): string {
    const parts: string[] = [];

    // 如果有 SecondMe 兴趣标签
    if (tasteProfile.secondMeShades && tasteProfile.secondMeShades.length > 0) {
      const shades = tasteProfile.secondMeShades.map((s: any) => s.name).join('、');
      parts.push(`我的兴趣爱好：${shades}`);
    }

    // 如果有 SecondMe 软记忆
    if (tasteProfile.secondMeSoftMemory && tasteProfile.secondMeSoftMemory.length > 0) {
      const memories = tasteProfile.secondMeSoftMemory
        .slice(0, 3)
        .map((m: any) => m.content)
        .join('；');
      parts.push(`我的饮食记忆：${memories}`);
    }

    return parts.length > 0 ? parts.join('\n') : '';
  }

  private buildSystemPrompt(): string {
    let prompt = `你是 ${this.userName} 的 AI 美食分身，代表 ${this.userName} 参与讨论今天吃什么。\n\n`;

    // 优先使用 SecondMe 信息或用户补充的信息
    const hasSecondMeInfo = this.secondMeContext && this.secondMeContext.length > 0;
    const hasAdditionalInfo = this.tasteProfile.additionalInfo && this.tasteProfile.additionalInfo.length > 0;

    if (hasSecondMeInfo || hasAdditionalInfo) {
      // 使用 SecondMe 信息或用户补充的信息
      prompt += `你的口味特点：\n`;

      if (hasSecondMeInfo) {
        prompt += `${this.secondMeContext}\n`;
      }

      if (hasAdditionalInfo) {
        prompt += `\n用户补充说明：\n${this.tasteProfile.additionalInfo}\n`;
      }
    } else {
      // 降级：使用菜品分析的信息
      const cuisines = this.tasteProfile.preferred_cuisines
        .slice(0, 3)
        .map(c => c.name)
        .join('、');

      const tasteDesc = [];
      if (this.tasteProfile.taste_profile.spicy > 0.6) tasteDesc.push('喜欢辣');
      if (this.tasteProfile.taste_profile.sweet > 0.6) tasteDesc.push('喜欢甜');
      if (this.tasteProfile.taste_profile.numbing > 0.6) tasteDesc.push('喜欢麻');

      prompt += `你的口味特点（基于菜品分析）：
- 偏爱菜系：${cuisines || '无特别偏好'}
- 口味偏好：${tasteDesc.join('、') || '口味适中'}
- 价格偏好：${this.getPriceLevelDesc(this.tasteProfile.price_level)}
- 喜欢的食材：${this.tasteProfile.preferred_ingredients.slice(0, 5).join('、')}`;
    }

    prompt += `\n\n讨论规则：
1. 用第一人称发言（"我觉得..."、"我建议..."）
2. 基于你的口味偏好提出建议
3. 尊重其他人的意见，寻求共识
4. 每次发言简短（1-2句话）
5. 如果意见不同，提出折中方案`;

    return prompt;
  }

  private getPriceLevelDesc(level: number): string {
    const levels = ['经济实惠', '中等价位', '中高档', '高档'];
    return levels[level - 1] || '中等价位';
  }

  async generateResponse(context: ConversationContext): Promise<AvatarMessage> {
    console.log(`\n[Agent ${this.userName}] 开始生成回复，轮次: ${context.round}`);

    // 1. 构建 prompt
    const userPrompt = this.buildUserPrompt(context);
    console.log(`[Agent ${this.userName}] 用户 Prompt:`, userPrompt);

    this.conversationHistory.push({
      role: 'user',
      content: userPrompt,
    });

    console.log(`[Agent ${this.userName}] 对话历史长度: ${this.conversationHistory.length} 条`);

    // 2. 调用 LLM
    console.log(`[Agent ${this.userName}] 调用 LLM...`);
    const response = await this.llmClient.chat(this.conversationHistory);
    console.log(`[Agent ${this.userName}] LLM 返回:`, response);

    // 3. 保存响应
    this.conversationHistory.push({
      role: 'assistant',
      content: response,
    });

    // 4. 返回结构化消息
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.id,
      userName: this.userName,
      avatarName: `${this.userName}的美食向导`,
      content: response,
      timestamp: Date.now(),
      type: this.inferMessageType(context.round),
    };

    console.log(`[Agent ${this.userName}] ✅ 消息生成完成\n`);
    return message;
  }

  private buildUserPrompt(context: ConversationContext): string {
    if (context.isFirstMessage) {
      return '现在开始思考今天吃什么。请简短介绍你的口味偏好，并提出一个建议。';
    }

    // 获取其他人的所有发言（不限制数量，让 LLM 看到完整讨论）
    const othersMessages = context.conversationHistory.filter(m => m.userId !== this.id);

    if (othersMessages.length > 0) {
      // 多人模式：回应其他人
      const summary = othersMessages
        .map(m => `${m.userName}: ${m.content}`)
        .join('\n');
      return `其他人的意见：\n${summary}\n\n请回应并提出你的看法（1-2句话）。`;
    } else {
      // 单人模式：继续思考
      return `基于你之前的想法，继续思考并完善你的建议（1-2句话）。`;
    }
  }

  private inferMessageType(round: number): AvatarMessage['type'] {
    if (round === 0) return 'question';
    if (round <= 2) return 'suggestion';
    if (round <= 4) return 'agreement';
    return 'final';
  }

  getParticipant(): AvatarParticipant {
    return {
      userId: this.id,
      userName: this.userName,
      avatarName: `${this.userName}的美食向导`,
      avatarPersonality: this.personality,
      tasteProfile: this.tasteProfile,
      isOnline: true,
    };
  }
}
