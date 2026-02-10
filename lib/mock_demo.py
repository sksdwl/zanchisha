#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 菜品语义分析 - Mock 演示
"""

import re
from typing import List, Dict, Any
from dataclasses import dataclass
from collections import Counter

@dataclass
class TasteProfile:
    spicy: float      # 辣度 0-1
    sweet: float      # 甜度 0-1
    salty: float      # 咸度 0-1
    sour: float       # 酸度 0-1
    numbing: float    # 麻度 0-1

@dataclass
class CuisinePreference:
    name: str
    weight: float

@dataclass
class NormalizedDish:
    original: str
    standard: str
    cuisine: str
    aliases: List[str]

@dataclass
class UserTasteProfile:
    user_id: str
    preferred_cuisines: List[CuisinePreference]
    taste_profile: TasteProfile
    preferred_ingredients: List[str]
    cooking_methods: List[str]
    price_level: int  # 1-4
    normalized_dishes: List[NormalizedDish]

def mock_analyze_dishes(user_id: str, raw_dishes: List[str]) -> UserTasteProfile:
    """模拟 AI 分析菜品"""
    
    # 检测菜系
    sichuan_pattern = r'宫保|宫爆|麻婆|水煮|辣子|回锅|酸菜|毛血旺|口水|鱼香|夫妻肺片|火锅|串串'
    japanese_pattern = r'寿司|刺身|拉面|天妇罗|寿喜烧|乌冬|咖喱|猪排|鳗鱼'
    cantonese_pattern = r'白切|烧鹅|叉烧|蒸|粤'
    
    has_sichuan = any(re.search(sichuan_pattern, d) for d in raw_dishes)
    has_japanese = any(re.search(japanese_pattern, d) for d in raw_dishes)
    has_cantonese = any(re.search(cantonese_pattern, d) for d in raw_dishes)
    
    # 标准化菜品
    normalized_dishes = []
    for d in raw_dishes:
        standard = d
        cuisine = '家常菜'
        aliases = []
        
        if re.search(r'宫保|宫爆|kung pao', d, re.IGNORECASE):
            standard = '宫保鸡丁'
            cuisine = '川菜'
            if '宫爆' in d:
                aliases.append('宫保鸡丁（错别字纠正）')
            if re.search(r'kung pao', d, re.IGNORECASE):
                aliases.append('kung pao chicken')
        elif '麻婆豆腐' in d:
            standard = '麻婆豆腐'
            cuisine = '川菜'
        elif '水煮鱼' in d:
            standard = '水煮鱼'
            cuisine = '川菜'
        elif '红烧肉' in d:
            standard = '红烧肉'
            cuisine = '家常菜'
        elif '寿司' in d:
            standard = '寿司'
            cuisine = '日料'
        elif '刺身' in d:
            standard = '刺身'
            cuisine = '日料'
        elif '拉面' in d:
            standard = '拉面'
            cuisine = '日料'
            
        normalized_dishes.append(NormalizedDish(d, standard, cuisine, aliases))
    
    # 确定主菜系和口味
    main_cuisine = '家常菜'
    if has_sichuan:
        main_cuisine = '川菜'
    elif has_japanese:
        main_cuisine = '日料'
    elif has_cantonese:
        main_cuisine = '粤菜'
    
    taste_profile = TasteProfile(
        spicy=0.8 if has_sichuan else 0.1 if has_japanese else 0.3,
        sweet=0.3 if has_japanese else 0.4,
        salty=0.5,
        sour=0.3 if has_sichuan else 0.2,
        numbing=0.6 if has_sichuan else 0.1
    )
    
    # 统计菜系权重
    cuisine_count = Counter([d.cuisine for d in normalized_dishes])
    total = len(normalized_dishes)
    preferred_cuisines = [
        CuisinePreference(name, count/total) 
        for name, count in cuisine_count.most_common()
    ]
    
    return UserTasteProfile(
        user_id=user_id,
        preferred_cuisines=preferred_cuisines,
        taste_profile=taste_profile,
        preferred_ingredients=['鸡肉', '猪肉', '蔬菜', '豆制品'],
        cooking_methods=['爆炒', '红烧', '水煮'] if has_sichuan else ['清蒸', '煮', '烤'],
        price_level=3 if has_japanese else 2,
        normalized_dishes=normalized_dishes
    )

def merge_profiles(profiles: List[UserTasteProfile]) -> Dict[str, Any]:
    """合并多个用户的口味画像"""
    
    # 统计共同菜系（>50%）
    cuisine_count = Counter()
    for p in profiles:
        for c in p.preferred_cuisines:
            cuisine_count[c.name] += 1
    
    threshold = len(profiles) * 0.5
    common_cuisines = [name for name, count in cuisine_count.items() if count >= threshold]
    
    # 平均口味
    avg_taste = TasteProfile(
        spicy=sum(p.taste_profile.spicy for p in profiles) / len(profiles),
        sweet=sum(p.taste_profile.sweet for p in profiles) / len(profiles),
        salty=sum(p.taste_profile.salty for p in profiles) / len(profiles),
        sour=sum(p.taste_profile.sour for p in profiles) / len(profiles),
        numbing=sum(p.taste_profile.numbing for p in profiles) / len(profiles),
    )
    
    # 所有食材
    all_ingredients = list(set(
        ing for p in profiles for ing in p.preferred_ingredients
    ))
    
    # 共同烹饪方式
    method_count = Counter()
    for p in profiles:
        for m in p.cooking_methods:
            method_count[m] += 1
    common_methods = [name for name, count in method_count.items() if count >= threshold]
    
    return {
        'common_cuisines': common_cuisines,
        'avg_taste_profile': avg_taste,
        'all_ingredients': all_ingredients,
        'common_cooking_methods': common_methods
    }

def main():
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print('===================================================')
    print('  咱吃啥 - AI 语义分析演示')
    print('===================================================\n')
    
    # 三个用户的输入
    user_a_dishes = [
        '宫保鸡丁', '麻婆豆腐', '水煮鱼', '宫爆鸡丁',
        'kung pao chicken', '辣子鸡', '回锅肉',
        '酸菜鱼', '毛血旺', '口水鸡'
    ]
    
    user_b_dishes = [
        '糖醋排骨', '红烧肉', '清蒸鱼', '白切鸡',
        '西红柿炒蛋', '可乐鸡翅', '土豆牛腩',
        '地三鲜', '木须肉', '炒青菜'
    ]
    
    user_c_dishes = [
        '寿司', '刺身', '拉面', '天妇罗',
        '烤鳗鱼', '寿喜烧', '炸鸡',
        '乌冬面', '咖喱饭', '猪排饭'
    ]
    
    print('📤 原始输入数据：\n')
    print(f'用户 A（{len(user_a_dishes)} 道菜）: {", ".join(user_a_dishes[:5])}...')
    print(f'用户 B（{len(user_b_dishes)} 道菜）: {", ".join(user_b_dishes[:5])}...')
    print(f'用户 C（{len(user_c_dishes)} 道菜）: {", ".join(user_c_dishes[:5])}...')
    
    print('\n───────────────────────────────────────────────────')
    print('🔍 AI 语义分析中...\n')
    
    # AI 分析
    profile_a = mock_analyze_dishes('user_a', user_a_dishes)
    profile_b = mock_analyze_dishes('user_b', user_b_dishes)
    profile_c = mock_analyze_dishes('user_c', user_c_dishes)
    
    # 展示结果
    print('【用户 A 口味画像】')
    cuisines_a = ", ".join([f"{c.name}({c.weight*100:.0f}%)" for c in profile_a.preferred_cuisines])
    print(f'  🏷️ 菜系偏好: {cuisines_a}')
    print(f'  🌶️ 口味特征: 辣{profile_a.taste_profile.spicy:.1f} 麻{profile_a.taste_profile.numbing:.1f} 甜{profile_a.taste_profile.sweet:.1f}')
    print(f'  💰 消费层级: {"💵" * profile_a.price_level}')
    print(f'  📝 标准化示例: "宫爆鸡丁" → "宫保鸡丁" (川菜)')
    print(f'                 "kung pao chicken" → "宫保鸡丁" (川菜)')
    
    print('\n【用户 B 口味画像】')
    cuisines_b = ", ".join([f"{c.name}({c.weight*100:.0f}%)" for c in profile_b.preferred_cuisines])
    print(f'  🏷️ 菜系偏好: {cuisines_b}')
    print(f'  🌶️ 口味特征: 辣{profile_b.taste_profile.spicy:.1f} 麻{profile_b.taste_profile.numbing:.1f} 甜{profile_b.taste_profile.sweet:.1f}')
    print(f'  🍳 烹饪方式: {", ".join(profile_b.cooking_methods)}')
    
    print('\n【用户 C 口味画像】')
    cuisines_c = ", ".join([f"{c.name}({c.weight*100:.0f}%)" for c in profile_c.preferred_cuisines])
    print(f'  🏷️ 菜系偏好: {cuisines_c}')
    print(f'  🌶️ 口味特征: 辣{profile_c.taste_profile.spicy:.1f} 麻{profile_c.taste_profile.numbing:.1f} 甜{profile_c.taste_profile.sweet:.1f}')
    print(f'  💰 消费层级: {"💵" * profile_c.price_level}')
    
    print('\n───────────────────────────────────────────────────')
    print('👥 群体口味匹配...\n')
    
    merged = merge_profiles([profile_a, profile_b, profile_c])
    
    print('【群体匹配结果】')
    print(f'  🤝 共同菜系: {", ".join(merged["common_cuisines"]) or "无 😅"}')
    avg = merged['avg_taste_profile']
    print(f'  📊 平均口味: 辣{avg.spicy:.1f} 麻{avg.numbing:.1f} 甜{avg.sweet:.1f}')
    print(f'  🥬 涉及食材: {", ".join(merged["all_ingredients"])}')
    print(f'  🍳 共同烹饪: {", ".join(merged["common_cooking_methods"]) or "无"}')
    
    print('\n───────────────────────────────────────────────────')
    print('💡 推荐策略\n')
    
    if merged['common_cuisines']:
        print(f'✅ 推荐: {merged["common_cuisines"][0]} 餐厅')
        print(f'   理由: 三个人都喜欢 {merged["common_cuisines"][0]}，匹配度最高')
    else:
        print('⚠️  警告: 三个人口味差异较大')
        print('   建议 1: 选择融合菜系餐厅（如：创意中餐、亚洲融合菜）')
        print('   建议 2: 选择自助餐厅，各自选择喜欢的食物')
        print('   建议 3: 分开点餐，各自买自己喜欢的外卖聚餐')
    
    print('\n═══════════════════════════════════════════════════')
    print('  ✅ AI 语义分析完成！')
    print('═══════════════════════════════════════════════════')

if __name__ == '__main__':
    main()
