/**
 * AI 菜品语义分析服务
 * 类型定义和工具函数
 */

// 口味画像类型定义
export interface TasteProfile {
  spicy: number;      // 辣度 0-1
  sweet: number;      // 甜度 0-1
  salty: number;      // 咸度 0-1
  sour: number;       // 酸度 0-1
  numbing: number;    // 麻度 0-1
}

export interface CuisinePreference {
  name: string;       // 菜系名称
  weight: number;     // 权重 0-1
}

export interface NormalizedDish {
  original: string;   // 原始输入
  standard: string;   // 标准化名称
  cuisine: string;    // 所属菜系
  aliases: string[];  // 别名列表
}

export interface UserTasteProfile {
  user_id: string;
  preferred_cuisines: CuisinePreference[];
  taste_profile: TasteProfile;
  preferred_ingredients: string[];
  cooking_methods: string[];
  price_level: 1 | 2 | 3 | 4;  // 1=便宜, 4=贵
  normalized_dishes: NormalizedDish[];
  additionalInfo?: string;
  secondMeShades?: any[];
  secondMeSoftMemory?: any[];
}

/**
 * 合并多个用户的口味画像（为后续群体匹配做准备）
 */
export function mergeProfiles(profiles: UserTasteProfile[]): {
  common_cuisines: string[];
  avg_taste_profile: TasteProfile;
  all_ingredients: string[];
  common_cooking_methods: string[];
} {
  // 统计共同喜欢的菜系（出现频率 > 50%）
  const cuisineCount = new Map<string, number>();
  profiles.forEach(p => {
    p.preferred_cuisines.forEach(c => {
      cuisineCount.set(c.name, (cuisineCount.get(c.name) || 0) + 1);
    });
  });
  
  const threshold = profiles.length * 0.5;
  const common_cuisines = Array.from(cuisineCount.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([name, _]) => name);

  // 平均口味特征
  const avg_taste_profile: TasteProfile = {
    spicy: average(profiles.map(p => p.taste_profile.spicy)),
    sweet: average(profiles.map(p => p.taste_profile.sweet)),
    salty: average(profiles.map(p => p.taste_profile.salty)),
    sour: average(profiles.map(p => p.taste_profile.sour)),
    numbing: average(profiles.map(p => p.taste_profile.numbing)),
  };

  // 收集所有食材（去重）
  const all_ingredients = Array.from(new Set(
    profiles.flatMap(p => p.preferred_ingredients)
  ));

  // 统计共同烹饪方式
  const methodCount = new Map<string, number>();
  profiles.forEach(p => {
    p.cooking_methods.forEach(m => {
      methodCount.set(m, (methodCount.get(m) || 0) + 1);
    });
  });
  const common_cooking_methods = Array.from(methodCount.entries())
    .filter(([_, count]) => count >= threshold)
    .map(([name, _]) => name);

  return {
    common_cuisines,
    avg_taste_profile,
    all_ingredients,
    common_cooking_methods,
  };
}

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * 客户端调用后端 API 进行 AI 分析
 */
export async function analyzeDishes(
  userId: string,
  rawDishes: string[]
): Promise<UserTasteProfile> {
  const response = await fetch('/api/analyze-dishes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, dishes: rawDishes }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '分析失败');
  }

  const result = await response.json();
  
  if (result.code !== 0) {
    throw new Error(result.message || '分析失败');
  }

  return result.data;
}
