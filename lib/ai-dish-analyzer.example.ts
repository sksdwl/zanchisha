/**
 * AI 菜品语义分析 - 使用示例
 * 
 * 这个文件演示了如何使用 analyzeDishes 和 mergeProfiles 函数
 */

import { analyzeDishes, mergeProfiles, UserTasteProfile } from './ai-dish-analyzer';

// ==================== 示例 1: 单个用户分析 ====================

async function exampleSingleUser() {
  const accessToken = 'your-secondme-access-token';
  
  // 用户 A 上传的菜品（包含错别字、别名、中英文混用）
  const userADishes = [
    '宫保鸡丁',
    'kung pao chicken',      // 英文别名
    '麻婆豆腐',
    '水煮鱼',
    '红烧肉',
    '糖醋排骨',
    '西红柿炒蛋',
    '宫爆鸡丁',              // 错别字
    '辣子鸡',
    '回锅肉'
  ];

  try {
    const profileA = await analyzeDishes('user_a', userADishes, accessToken);
    console.log('用户 A 口味画像:', JSON.stringify(profileA, null, 2));
  } catch (error) {
    console.error('分析失败:', error);
  }
}

// ==================== 示例 2: 群体匹配 ====================

async function exampleGroupMatching() {
  const accessToken = 'your-secondme-access-token';

  // 三个用户分别上传菜品
  const userADishes = ['宫保鸡丁', '麻婆豆腐', '水煮鱼', '辣子鸡', '回锅肉', '酸菜鱼', '毛血旺', '口水鸡', '鱼香肉丝', '夫妻肺片'];
  const userBDishes = ['糖醋排骨', '红烧肉', '清蒸鱼', '白切鸡', '炒青菜', '西红柿炒蛋', '可乐鸡翅', '土豆牛腩', '地三鲜', '木须肉'];
  const userCDishes = ['寿司', '刺身', '拉面', '天妇罗', '烤鳗鱼', '寿喜烧', '炸鸡', '乌冬面', '咖喱饭', '猪排饭'];

  try {
    // 并行分析三个用户
    const [profileA, profileB, profileC] = await Promise.all([
      analyzeDishes('user_a', userADishes, accessToken),
      analyzeDishes('user_b', userBDishes, accessToken),
      analyzeDishes('user_c', userCDishes, accessToken),
    ]);

    console.log('\n========== 用户 A 画像 ==========');
    console.log(`偏好菜系: ${profileA.preferred_cuisines.map(c => `${c.name}(${c.weight.toFixed(2)})`).join(', ')}`);
    console.log(`口味: 辣${profileA.taste_profile.spicy.toFixed(1)}, 甜${profileA.taste_profile.sweet.toFixed(1)}`);
    
    console.log('\n========== 用户 B 画像 ==========');
    console.log(`偏好菜系: ${profileB.preferred_cuisines.map(c => `${c.name}(${c.weight.toFixed(2)})`).join(', ')}`);
    console.log(`口味: 辣${profileB.taste_profile.spicy.toFixed(1)}, 甜${profileB.taste_profile.sweet.toFixed(1)}`);

    console.log('\n========== 用户 C 画像 ==========');
    console.log(`偏好菜系: ${profileC.preferred_cuisines.map(c => `${c.name}(${c.weight.toFixed(2)})`).join(', ')}`);
    console.log(`口味: 辣${profileC.taste_profile.spicy.toFixed(1)}, 甜${profileC.taste_profile.sweet.toFixed(1)}`);

    // 合并分析（找共同点）
    const merged = mergeProfiles([profileA, profileB, profileC]);
    
    console.log('\n========== 群体匹配结果 ==========');
    console.log(`共同菜系: ${merged.common_cuisines.join(', ') || '无'}`);
    console.log(`平均口味: 辣${merged.avg_taste_profile.spicy.toFixed(1)}, 甜${merged.avg_taste_profile.sweet.toFixed(1)}`);
    console.log(`所有食材: ${merged.all_ingredients.join(', ')}`);
    console.log(`共同烹饪方式: ${merged.common_cooking_methods.join(', ') || '无'}`);

    // 推荐逻辑（下一步：根据 merged 数据匹配商家）
    console.log('\n========== 商家匹配策略 ==========');
    if (merged.common_cuisines.length > 0) {
      console.log(`优先推荐: ${merged.common_cuisines[0]} 餐厅`);
    } else {
      console.log('无共同菜系，推荐融合菜/自助餐厅');
    }

  } catch (error) {
    console.error('群体分析失败:', error);
  }
}

// ==================== 示例 3: Mock 数据测试（无需 API） ====================

function mockAnalyzeDishes(userId: string, rawDishes: string[]): UserTasteProfile {
  // 模拟 AI 分析结果
  const isSichuan = rawDishes.some(d => ['宫保鸡丁', '麻婆豆腐', '水煮鱼', '辣子鸡', '回锅肉', '酸菜鱼'].some(s => d.includes(s)));
  const isJapanese = rawDishes.some(d => ['寿司', '刺身', '拉面', '天妇罗', '寿喜烧', '乌冬面'].some(s => d.includes(s)));
  const isHomeStyle = rawDishes.some(d => ['红烧肉', '糖醋排骨', '西红柿炒蛋', '可乐鸡翅'].some(s => d.includes(s)));

  const normalizedDishes = rawDishes.map(d => ({
    original: d,
    standard: d.replace('宫爆', '宫保').replace('kung pao chicken', '宫保鸡丁'),
    cuisine: isSichuan ? '川菜' : isJapanese ? '日料' : '家常菜',
    aliases: d === '宫爆鸡丁' ? ['宫保鸡丁', 'kung pao chicken'] : d === 'kung pao chicken' ? ['宫保鸡丁'] : []
  }));

  return {
    user_id: userId,
    preferred_cuisines: [
      { name: isSichuan ? '川菜' : isJapanese ? '日料' : '家常菜', weight: 0.8 },
      { name: '家常菜', weight: 0.2 }
    ],
    taste_profile: {
      spicy: isSichuan ? 0.8 : 0.2,
      sweet: isHomeStyle ? 0.5 : 0.3,
      salty: 0.5,
      sour: 0.3,
      numbing: isSichuan ? 0.6 : 0.1
    },
    preferred_ingredients: ['鸡肉', '猪肉', '豆腐', '蔬菜'],
    cooking_methods: ['爆炒', '红烧', '清蒸'],
    price_level: 2,
    normalized_dishes
  };
}

// 运行 Mock 测试
function runMockTest() {
  console.log('========== Mock 测试：AI 语义分析 ==========\n');

  const userADishes = ['宫保鸡丁', '麻婆豆腐', '水煮鱼', '宫爆鸡丁', 'kung pao chicken', '辣子鸡', '回锅肉', '酸菜鱼', '毛血旺', '口水鸡'];
  const userBDishes = ['糖醋排骨', '红烧肉', '清蒸鱼', '白切鸡', '西红柿炒蛋', '可乐鸡翅', '土豆牛腩', '地三鲜', '木须肉', '炒青菜'];
  const userCDishes = ['寿司', '刺身', '拉面', '天妇罗', '烤鳗鱼', '寿喜烧', '炸鸡', '乌冬面', '咖喱饭', '猪排饭'];

  const profileA = mockAnalyzeDishes('user_a', userADishes);
  const profileB = mockAnalyzeDishes('user_b', userBDishes);
  const profileC = mockAnalyzeDishes('user_c', userCDishes);

  console.log('【用户 A】喜欢川菜，重口味');
  console.log(`  标准化: ${profileA.normalized_dishes.slice(0, 3).map(d => `${d.original}→${d.standard}`).join(', ')}...`);
  console.log(`  口味: 辣${profileA.taste_profile.spicy}, 麻${profileA.taste_profile.numbing}`);

  console.log('\n【用户 B】喜欢家常菜，口味适中');
  console.log(`  口味: 辣${profileB.taste_profile.spicy}, 甜${profileB.taste_profile.sweet}`);

  console.log('\n【用户 C】喜欢日料，清淡');
  console.log(`  口味: 辣${profileC.taste_profile.spicy}, 甜${profileC.taste_profile.sweet}`);

  // 合并分析
  const merged = mergeProfiles([profileA, profileB, profileC]);
  
  console.log('\n========== 群体匹配结果 ==========');
  console.log(`共同菜系: ${merged.common_cuisines.join(', ') || '无共同菜系 😅'}`);
  console.log(`平均辣度: ${merged.avg_taste_profile.spicy.toFixed(1)} (A:0.8, B:0.2, C:0.2)`);
  console.log(`\n💡 结论: 三个人口味差异大，建议找融合菜餐厅或各自点外卖`);
}

// 运行测试
runMockTest();
