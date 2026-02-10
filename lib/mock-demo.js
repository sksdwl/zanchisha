/**
 * AI 菜品语义分析 - Mock 演示
 * 无需 TypeScript，直接用 Node.js 运行
 * 
 * 运行方式: node lib/mock-demo.js
 */

// ==================== 类型定义（JSDoc）====================

/**
 * @typedef {Object} TasteProfile
 * @property {number} spicy - 辣度 0-1
 * @property {number} sweet - 甜度 0-1
 * @property {number} salty - 咸度 0-1
 * @property {number} sour - 酸度 0-1
 * @property {number} numbing - 麻度 0-1
 */

/**
 * @typedef {Object} UserTasteProfile
 * @property {string} user_id
 * @property {Array<{name: string, weight: number}>} preferred_cuisines
 * @property {TasteProfile} taste_profile
 * @property {string[]} preferred_ingredients
 * @property {string[]} cooking_methods
 * @property {1|2|3|4} price_level
 * @property {Array<{original: string, standard: string, cuisine: string, aliases: string[]}>} normalized_dishes
 */

// ==================== Mock AI 分析函数 ====================

/**
 * 模拟 AI 分析菜品（实际项目中会调用 SecondMe API）
 * @param {string} userId 
 * @param {string[]} rawDishes 
 * @returns {UserTasteProfile}
 */
function mockAnalyzeDishes(userId, rawDishes) {
  // 简单的规则匹配模拟 AI 分析
  const hasSichuan = rawDishes.some(d => 
    /宫保|麻婆|水煮|辣子|回锅|酸菜|毛血旺|口水|鱼香|夫妻肺片|火锅|串串/.test(d)
  );
  const hasJapanese = rawDishes.some(d => 
    /寿司|刺身|拉面|天妇罗|寿喜烧|乌冬|咖喱|猪排|鳗鱼/.test(d)
  );
  const hasCantonese = rawDishes.some(d => 
    /白切|烧鹅|叉烧|蒸|粤/.test(d)
  );

  // 标准化菜品名称
  const normalizedDishes = rawDishes.map(d => {
    let standard = d;
    let cuisine = '家常菜';
    const aliases = [];

    // 处理别名和错别字
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

    return {
      original: d,
      standard,
      cuisine,
      aliases
    };
  });

  // 确定主菜系
  let mainCuisine = '家常菜';
  if (hasSichuan) mainCuisine = '川菜';
  else if (hasJapanese) mainCuisine = '日料';
  else if (hasCantonese) mainCuisine = '粤菜';

  // 计算口味特征
  const tasteProfile = {
    spicy: hasSichuan ? 0.8 : hasJapanese ? 0.1 : 0.3,
    sweet: hasJapanese ? 0.3 : 0.4,
    salty: 0.5,
    sour: hasSichuan ? 0.3 : 0.2,
    numbing: hasSichuan ? 0.6 : 0.1
  };

  // 统计菜系权重
  const cuisineCount = {};
  normalizedDishes.forEach(d => {
    cuisineCount[d.cuisine] = (cuisineCount[d.cuisine] || 0) + 1;
  });
  
  const total = normalizedDishes.length;
  const preferredCuisines = Object.entries(cuisineCount)
    .map(([name, count]) => ({ name, weight: count / total }))
    .sort((a, b) => b.weight - a.weight);

  return {
    user_id: userId,
    preferred_cuisines: preferredCuisines,
    taste_profile: tasteProfile,
    preferred_ingredients: ['鸡肉', '猪肉', '蔬菜', '豆制品'],
    cooking_methods: hasSichuan ? ['爆炒', '红烧', '水煮'] : ['清蒸', '煮', '烤'],
    price_level: hasJapanese ? 3 : 2,
    normalized_dishes: normalizedDishes
  };
}

/**
 * 合并多个用户的口味画像
 * @param {UserTasteProfile[]} profiles 
 */
function mergeProfiles(profiles) {
  // 统计共同喜欢的菜系（出现频率 > 50%）
  const cuisineCount = {};
  profiles.forEach(p => {
    p.preferred_cuisines.forEach(c => {
      cuisineCount[c.name] = (cuisineCount[c.name] || 0) + 1;
    });
  });
  
  const threshold = profiles.length * 0.5;
  const commonCuisines = Object.entries(cuisineCount)
    .filter(([_, count]) => count >= threshold)
    .map(([name, _]) => name);

  // 平均口味特征
  const avgTasteProfile = {
    spicy: average(profiles.map(p => p.taste_profile.spicy)),
    sweet: average(profiles.map(p => p.taste_profile.sweet)),
    salty: average(profiles.map(p => p.taste_profile.salty)),
    sour: average(profiles.map(p => p.taste_profile.sour)),
    numbing: average(profiles.map(p => p.taste_profile.numbing)),
  };

  // 收集所有食材
  const allIngredients = [...new Set(profiles.flatMap(p => p.preferred_ingredients))];

  // 统计共同烹饪方式
  const methodCount = {};
  profiles.forEach(p => {
    p.cooking_methods.forEach(m => {
      methodCount[m] = (methodCount[m] || 0) + 1;
    });
  });
  const commonCookingMethods = Object.entries(methodCount)
    .filter(([_, count]) => count >= threshold)
    .map(([name, _]) => name);

  return {
    common_cuisines: commonCuisines,
    avg_taste_profile: avgTasteProfile,
    all_ingredients: allIngredients,
    common_cooking_methods: commonCookingMethods,
  };
}

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ==================== 演示 ====================

console.log('═══════════════════════════════════════════════════');
console.log('  🍜 咱吃啥 - AI 语义分析演示');
console.log('═══════════════════════════════════════════════════\n');

// 三个用户上传菜品
const userADishes = [
  '宫保鸡丁', '麻婆豆腐', '水煮鱼', '宫爆鸡丁',           // 错别字：宫爆
  'kung pao chicken', '辣子鸡', '回锅肉',                // 英文别名
  '酸菜鱼', '毛血旺', '口水鸡'
];

const userBDishes = [
  '糖醋排骨', '红烧肉', '清蒸鱼', '白切鸡',
  '西红柿炒蛋', '可乐鸡翅', '土豆牛腩',
  '地三鲜', '木须肉', '炒青菜'
];

const userCDishes = [
  '寿司', '刺身', '拉面', '天妇罗',
  '烤鳗鱼', '寿喜烧', '炸鸡',
  '乌冬面', '咖喱饭', '猪排饭'
];

console.log('📤 原始输入数据：\n');
console.log(`用户 A（${userADishes.length} 道菜）: ${userADishes.slice(0, 5).join(', ')}...`);
console.log(`用户 B（${userBDishes.length} 道菜）: ${userBDishes.slice(0, 5).join(', ')}...`);
console.log(`用户 C（${userCDishes.length} 道菜）: ${userCDishes.slice(0, 5).join(', ')}...`);

console.log('\n───────────────────────────────────────────────────');
console.log('🔍 AI 语义分析中...\n');

// AI 分析
const profileA = mockAnalyzeDishes('user_a', userADishes);
const profileB = mockAnalyzeDishes('user_b', userBDishes);
const profileC = mockAnalyzeDishes('user_c', userCDishes);

console.log('【用户 A 口味画像】');
console.log(`  🏷️ 菜系偏好: ${profileA.preferred_cuisines.map(c => `${c.name}(${(c.weight * 100).toFixed(0)}%)`).join(', ')}`);
console.log(`  🌶️ 口味特征: 辣${profileA.taste_profile.spicy.toFixed(1)} 麻${profileA.taste_profile.numbing.toFixed(1)} 甜${profileA.taste_profile.sweet.toFixed(1)}`);
console.log(`  💰 消费层级: ${'💵'.repeat(profileA.price_level)}`);
console.log(`  📝 标准化示例: "宫爆鸡丁" → "宫保鸡丁" (川菜)`);
console.log(`                 "kung pao chicken" → "宫保鸡丁" (川菜)`);

console.log('\n【用户 B 口味画像】');
console.log(`  🏷️ 菜系偏好: ${profileB.preferred_cuisines.map(c => `${c.name}(${(c.weight * 100).toFixed(0)}%)`).join(', ')}`);
console.log(`  🌶️ 口味特征: 辣${profileB.taste_profile.spicy.toFixed(1)} 麻${profileB.taste_profile.numbing.toFixed(1)} 甜${profileB.taste_profile.sweet.toFixed(1)}`);
console.log(`  🍳 烹饪方式: ${profileB.cooking_methods.join(', ')}`);

console.log('\n【用户 C 口味画像】');
console.log(`  🏷️ 菜系偏好: ${profileC.preferred_cuisines.map(c => `${c.name}(${(c.weight * 100).toFixed(0)}%)`).join(', ')}`);
console.log(`  🌶️ 口味特征: 辣${profileC.taste_profile.spicy.toFixed(1)} 麻${profileC.taste_profile.numbing.toFixed(1)} 甜${profileC.taste_profile.sweet.toFixed(1)}`);
console.log(`  💰 消费层级: ${'💵'.repeat(profileC.price_level)}`);

console.log('\n───────────────────────────────────────────────────');
console.log('👥 群体口味匹配...\n');

const merged = mergeProfiles([profileA, profileB, profileC]);

console.log('【群体匹配结果】');
console.log(`  🤝 共同菜系: ${merged.common_cuisines.join(', ') || '无 😅'}`);
console.log(`  📊 平均口味: 辣${merged.avg_taste_profile.spicy.toFixed(1)} 麻${merged.avg_taste_profile.numbing.toFixed(1)} 甜${merged.avg_taste_profile.sweet.toFixed(1)}`);
console.log(`  🥬 涉及食材: ${merged.all_ingredients.join(', ')}`);
console.log(`  🍳 共同烹饪: ${merged.common_cooking_methods.join(', ') || '无'}`);

console.log('\n───────────────────────────────────────────────────');
console.log('💡 推荐策略\n');

if (merged.common_cuisines.length > 0) {
  console.log(`✅ 推荐: ${merged.common_cuisines[0]} 餐厅`);
  console.log(`   理由: 三个人都喜欢 ${merged.common_cuisines[0]}，匹配度最高`);
} else {
  console.log('⚠️  警告: 三个人口味差异较大');
  console.log('   建议 1: 选择融合菜系餐厅（如：创意中餐、亚洲融合菜）');
  console.log('   建议 2: 选择自助餐厅，各自选择喜欢的食物');
  console.log('   建议 3: 分开点餐，各自买自己喜欢的外卖聚餐');
}

console.log('\n═══════════════════════════════════════════════════');
console.log('  ✅ AI 语义分析完成！');
console.log('═══════════════════════════════════════════════════');
