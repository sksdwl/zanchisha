/**
 * Agent 协调器
 * 管理多个 Agent 的对话流程，实现固定轮次的讨论
 */

import { EventEmitter } from 'events';
import { FoodDiscussionAgent } from './ai-agent';
import { AvatarMessage, AvatarChatSession, RestaurantRecommendation } from './ai-avatar-chat';
import { DeepSeekClient } from './deepseek-client';
import { mergeProfiles } from './ai-dish-analyzer';
import { getRealRestaurantRecommendation } from './amap-service';

export interface OrchestratorOptions {
  maxRounds?: number;
  timeout?: number;
}

export class AgentOrchestrator {
  private agents: FoodDiscussionAgent[];
  private maxRounds: number;
  private conversationHistory: AvatarMessage[];
  private eventEmitter: EventEmitter;

  constructor(agents: FoodDiscussionAgent[], options?: OrchestratorOptions) {
    this.agents = agents;
    this.maxRounds = options?.maxRounds || 5;
    this.conversationHistory = [];
    this.eventEmitter = new EventEmitter();
  }

  // 监听消息事件（用于 SSE）
  on(event: 'message', callback: (message: AvatarMessage) => void): void {
    this.eventEmitter.on(event, callback);
  }

  async runDiscussion(): Promise<AvatarChatSession> {
    console.log(`[Orchestrator] 开始讨论，参与者数量: ${this.agents.length}`);

    // 单人模式：只有一个 Agent 时，让它自己讨论（内心独白模式）
    if (this.agents.length === 1) {
      const agent = this.agents[0];

      // 第一条消息
      const firstMessage = await agent.generateResponse({
        round: 0,
        conversationHistory: [],
        isFirstMessage: true,
      });
      this.addMessage(firstMessage);

      // 后续几轮，Agent 继续思考和总结
      for (let round = 1; round <= this.maxRounds; round++) {
        const message = await agent.generateResponse({
          round,
          conversationHistory: this.conversationHistory,
          isFirstMessage: false,
        });
        this.addMessage(message);
      }
    } else {
      // 多人模式：正常的多 Agent 讨论
      // 1. 初始化对话（第一个 Agent 开场）
      const firstMessage = await this.agents[0].generateResponse({
        round: 0,
        conversationHistory: [],
        isFirstMessage: true,
      });
      this.addMessage(firstMessage);

      // 2. 固定5轮，每轮每个 Agent 依次发言
      for (let round = 1; round <= this.maxRounds; round++) {
        for (const agent of this.agents) {
          const message = await agent.generateResponse({
            round,
            conversationHistory: this.conversationHistory,
            isFirstMessage: false,
          });
          this.addMessage(message);
        }
      }
    }

    // 3. 生成最终推荐
    const recommendation = await this.generateRecommendation();

    // 4. 返回完整会话
    return {
      id: `chat_${Date.now()}`,
      participants: this.agents.map(a => a.getParticipant()),
      messages: this.conversationHistory,
      status: 'reached_consensus',
      recommendation,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private addMessage(message: AvatarMessage): void {
    this.conversationHistory.push(message);
    // 触发事件（用于 SSE 推送）
    this.eventEmitter.emit('message', message);
  }

  private async generateRecommendation(): Promise<RestaurantRecommendation> {
    console.log('[Orchestrator] 开始生成餐厅推荐...');

    // 合并所有参与者的口味画像
    const profiles = this.agents.map(a => a.getParticipant().tasteProfile);
    const merged = mergeProfiles(profiles);

    console.log('[Orchestrator] 合并后的口味偏好:', {
      commonCuisines: merged.common_cuisines,
      allIngredients: merged.all_ingredients.slice(0, 5),
    });

    // 优先使用高德地图 API 获取真实餐厅
    try {
      console.log('[Orchestrator] 调用高德地图 API 获取真实餐厅...');
      const cuisine = merged.common_cuisines[0] || '美食';
      const result = await getRealRestaurantRecommendation(cuisine);

      if (result && result.restaurant) {
        console.log('[Orchestrator] 高德地图 API 返回餐厅:', result.restaurant.name);
        return {
          restaurantName: result.restaurant.name,
          cuisine: result.restaurant.type?.split(';')[1] || cuisine,
          reason: `大家共同喜欢${cuisine}，高德地图为您推荐评分较高的：${result.restaurant.name}。${result.restaurant.address ? `地址在${result.restaurant.address}。` : ''}`,
          suitableFor: this.agents.map(a => a.getParticipant().userName),
          priceLevel: (parseInt(result.restaurant.biz_ext?.cost || '60') > 100 ? 3 : 2) as 1 | 2 | 3 | 4,
          dishes: ['招牌菜', '特色推荐'],
          location: result.restaurant.address,
          rating: parseFloat(result.restaurant.biz_ext?.rating || '4.5'),
        };
      }
    } catch (error) {
      console.warn('[Orchestrator] 高德地图 API 调用失败，尝试使用 LLM:', error);
    }

    // 降级1：使用 LLM 生成推荐
    const llmClient = new DeepSeekClient();

    const conversationSummary = this.conversationHistory
      .map(m => `${m.userName}: ${m.content}`)
      .join('\n');

    const prompt = `基于以下对话，生成一个餐厅推荐。

对话内容：
${conversationSummary}

共同偏好：
- 菜系：${merged.common_cuisines.join('、') || '无明显共同偏好'}
- 食材：${merged.all_ingredients.slice(0, 5).join('、')}

请以 JSON 格式返回推荐结果：
{
  "restaurantName": "餐厅名称",
  "cuisine": "菜系",
  "reason": "推荐理由（1-2句话）",
  "dishes": ["推荐菜品1", "推荐菜品2", "推荐菜品3"],
  "priceLevel": 2
}`;

    try {
      console.log('[Orchestrator] 调用 LLM 生成推荐...');
      const response = await llmClient.chat([
        { role: 'user', content: prompt }
      ]);

      // 尝试解析 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log('[Orchestrator] LLM 返回推荐:', result.restaurantName);
        return {
          restaurantName: result.restaurantName || '推荐餐厅',
          cuisine: result.cuisine || merged.common_cuisines[0] || '融合菜',
          reason: result.reason || '基于大家的口味偏好推荐',
          suitableFor: this.agents.map(a => a.getParticipant().userName),
          priceLevel: result.priceLevel || 2,
          dishes: result.dishes || ['招牌菜', '特色菜', '主食'],
          rating: 4.5,
        };
      }
    } catch (error) {
      console.error('[Orchestrator] LLM 生成推荐失败，使用默认推荐:', error);
    }

    // 降级2：使用规则生成推荐
    console.log('[Orchestrator] 使用默认规则生成推荐');
    return this.generateDefaultRecommendation(merged);
  }

  private generateDefaultRecommendation(merged: ReturnType<typeof mergeProfiles>): RestaurantRecommendation {
    const commonCuisines = merged.common_cuisines;
    const avgPrice = Math.round(
      this.agents.reduce((sum, a) => sum + a.getParticipant().tasteProfile.price_level, 0) / this.agents.length
    ) as 1 | 2 | 3 | 4;

    let restaurantName = '';
    let cuisine = '';
    let dishes: string[] = [];
    let reason = '';

    if (commonCuisines.includes('川菜')) {
      restaurantName = '蜀香园精品川菜';
      cuisine = '川菜';
      dishes = ['宫保鸡丁', '水煮鱼', '麻婆豆腐', '口水鸡'];
      reason = `大家共同喜欢川菜，这家店口味正宗，辣度可选。`;
    } else if (commonCuisines.includes('粤菜')) {
      restaurantName = '广府茶餐厅';
      cuisine = '粤菜';
      dishes = ['白切鸡', '烧鹅', '虾饺', '蒸排骨'];
      reason = `粤菜清淡鲜美，符合大家的口味偏好。`;
    } else if (commonCuisines.length === 0) {
      restaurantName = '海底捞火锅';
      cuisine = '火锅';
      dishes = ['鸳鸯锅底', '肥牛', '虾滑', '毛肚', '蔬菜拼盘'];
      reason = `大家口味差异较大，火锅是最佳选择！每人可以选自己喜欢的锅底和菜品。`;
    } else {
      restaurantName = `${commonCuisines[0]}美食坊`;
      cuisine = commonCuisines[0];
      dishes = ['招牌菜', '特色小炒', '汤品', '主食'];
      reason = `基于大家的口味分析，这家店提供多种选择。`;
    }

    return {
      restaurantName,
      cuisine,
      reason,
      suitableFor: this.agents.map(a => a.getParticipant().userName),
      priceLevel: avgPrice,
      dishes,
      rating: 4.5,
    };
  }
}
