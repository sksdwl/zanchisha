/**
 * AI 菜品分析 API 路由
 * 后端代理调用 SecondMe API，避免前端暴露 access token
 */

import { NextRequest, NextResponse } from 'next/server';

// SecondMe API 配置
const SECONDME_API_BASE = process.env.SECONDME_API_BASE || 'https://app.mindos.com/gate/lab';
const SECONDME_API_KEY = process.env.SECONDME_API_KEY;

/**
 * 构建 AI 分析 Prompt
 */
function buildAnalysisPrompt(dishes: string[]): string {
  return `你是一个专业的美食 AI 分析师。请分析以下用户喜欢的菜品列表，提取口味画像。

## 待分析菜品
${dishes.map((d, i) => `${i + 1}. ${d}`).join('\n')}

## 分析要求

1. **菜品标准化**：处理错别字、别名、中英文混用
   - 例如："宫爆鸡丁" → "宫保鸡丁"；"kung pao chicken" → "宫保鸡丁"

2. **提取菜系偏好**：识别每道菜所属菜系，统计权重
   - 常见菜系：川菜、粤菜、湘菜、鲁菜、苏菜、浙菜、闽菜、徽菜、东北菜、西北菜、家常菜、西餐、日料、韩料、东南亚菜

3. **分析口味特征**：从菜品推断用户口味偏好（0-1 分值）
   - spicy: 辣度
   - sweet: 甜度
   - salty: 咸度
   - sour: 酸度
   - numbing: 麻度

4. **提取偏好的食材**：如鸡肉、猪肉、牛肉、海鲜、豆腐、蔬菜等

5. **提取烹饪方式**：如爆炒、红烧、清蒸、油炸、炖煮、凉拌等

6. **估算消费层级**：1-4，1=人均<30，2=30-60，3=60-100，4=>100

## 输出格式（严格 JSON，不要 markdown 代码块）

{
  "normalized_dishes": [
    {
      "original": "原始名称",
      "standard": "标准化名称",
      "cuisine": "所属菜系",
      "aliases": ["别名1", "别名2"]
    }
  ],
  "preferred_cuisines": [
    {"name": "川菜", "weight": 0.7},
    {"name": "家常菜", "weight": 0.3}
  ],
  "taste_profile": {
    "spicy": 0.8,
    "sweet": 0.3,
    "salty": 0.6,
    "sour": 0.2,
    "numbing": 0.5
  },
  "preferred_ingredients": ["鸡肉", "猪肉", "豆腐"],
  "cooking_methods": ["爆炒", "红烧"],
  "price_level": 2
}

请只返回 JSON，不要其他说明文字。`;
}

/**
 * 调用 SecondMe Chat API
 */
async function callSecondMeAPI(prompt: string): Promise<any> {
  // 方式1: 使用 Chat API（如果 API Key 可用且不是占位符）
  if (SECONDME_API_KEY && SECONDME_API_KEY !== 'your_api_key_here') {
    try {
      const response = await fetch(`${SECONDME_API_BASE}/api/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SECONDME_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'default',
          messages: [
            { role: 'system', content: '你是一个专业的美食 AI 分析师。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        // API 请求失败，返回 null 让上层使用 mock
        console.warn(`SecondMe API 返回错误: ${response.status}，使用模拟数据`);
        return null;
      }

      const result = await response.json();
      
      // 解析 AI 返回的内容
      const content = result.choices?.[0]?.message?.content;
      if (!content) {
        console.warn('API 返回数据格式错误，使用模拟数据');
        return null;
      }

      // 尝试解析 JSON
      try {
        return JSON.parse(content);
      } catch {
        // 如果返回的不是纯 JSON，尝试提取 JSON 部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        console.warn('无法解析 AI 返回的数据，使用模拟数据');
        return null;
      }
    } catch (error) {
      console.warn('SecondMe API 调用失败，使用模拟数据:', error);
      return null;
    }
  }

  // 没有配置 API Key 或调用失败，返回 null
  return null;
}

/**
 * 模拟 AI 分析（当没有配置 API Key 时使用）
 */
function mockAnalyze(dishes: string[]): any {
  const hasSichuan = dishes.some(d => /宫保|宫爆|麻婆|水煮|辣子|回锅|酸菜|毛血旺|口水|鱼香|夫妻肺片/.test(d));
  const hasJapanese = dishes.some(d => /寿司|刺身|拉面|天妇罗|寿喜|乌冬|咖喱/.test(d));
  const hasCantonese = dishes.some(d => /白切|烧鹅|叉烧|蒸|粤/.test(d));
  
  const mainCuisine = hasSichuan ? '川菜' : hasJapanese ? '日料' : hasCantonese ? '粤菜' : '家常菜';

  const normalizedDishes = dishes.map(d => {
    let standard = d;
    let cuisine = mainCuisine;
    const aliases: string[] = [];

    if (/宫保|宫爆|kung pao/i.test(d)) {
      standard = '宫保鸡丁';
      cuisine = '川菜';
      if (d !== '宫保鸡丁') aliases.push('宫保鸡丁');
      if (/kung pao/i.test(d)) aliases.push('kung pao chicken');
    } else if (/麻婆豆腐/.test(d)) {
      standard = '麻婆豆腐';
      cuisine = '川菜';
    } else if (/水煮鱼/.test(d)) {
      standard = '水煮鱼';
      cuisine = '川菜';
    } else if (/红烧肉/.test(d)) {
      standard = '红烧肉';
      cuisine = '家常菜';
    } else if (/寿司/.test(d)) {
      standard = '寿司';
      cuisine = '日料';
    } else if (/刺身/.test(d)) {
      standard = '刺身';
      cuisine = '日料';
    } else if (/拉面/.test(d)) {
      standard = '拉面';
      cuisine = '日料';
    }

    return { original: d, standard, cuisine, aliases };
  });

  // 统计菜系
  const cuisineCount = new Map<string, number>();
  normalizedDishes.forEach(d => {
    cuisineCount.set(d.cuisine, (cuisineCount.get(d.cuisine) || 0) + 1);
  });
  const total = normalizedDishes.length;
  const preferredCuisines = Array.from(cuisineCount.entries())
    .map(([name, count]) => ({ name, weight: count / total }))
    .sort((a, b) => b.weight - a.weight);

  return {
    normalized_dishes: normalizedDishes,
    preferred_cuisines: preferredCuisines,
    taste_profile: {
      spicy: hasSichuan ? 0.8 : 0.2,
      sweet: 0.3,
      salty: 0.5,
      sour: hasSichuan ? 0.3 : 0.2,
      numbing: hasSichuan ? 0.6 : 0.1,
    },
    preferred_ingredients: ['鸡肉', '猪肉', '蔬菜', '豆制品'],
    cooking_methods: hasSichuan ? ['爆炒', '红烧', '水煮'] : ['清蒸', '煮', '烤'],
    price_level: hasJapanese ? 3 : 2,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, dishes } = body;

    if (!userId || !dishes || !Array.isArray(dishes) || dishes.length === 0) {
      return NextResponse.json(
        { code: 400, message: '参数错误：需要 userId 和 dishes 数组' },
        { status: 400 }
      );
    }

    // 清理菜品数据
    const cleanDishes = dishes.map(d => d.trim()).filter(d => d.length > 0);

    let result;

    // 尝试调用真实 API
    const prompt = buildAnalysisPrompt(cleanDishes);
    result = await callSecondMeAPI(prompt);
    
    // 如果 API 调用失败或返回 null，使用 mock 数据
    if (!result) {
      console.log('[Mock Mode] 使用模拟数据分析菜品');
      result = mockAnalyze(cleanDishes);
    }

    return NextResponse.json({
      code: 0,
      data: {
        user_id: userId,
        ...result,
      },
    });

  } catch (error: any) {
    console.error('分析失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '分析失败' },
      { status: 500 }
    );
  }
}
