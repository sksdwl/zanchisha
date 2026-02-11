/**
 * 高德地图餐厅搜索API
 * 根据菜系搜索附近的餐厅
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchNearbyRestaurants, getRestaurantWithMap } from '@/lib/amap-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cuisine, location, city } = body;

    if (!cuisine) {
      return NextResponse.json(
        { code: 400, message: '请提供菜系类型' },
        { status: 400 }
      );
    }

    console.log(`[API] 搜索餐厅: ${cuisine}, 位置: ${location || city || '默认'}`);

    // 搜索餐厅（内部已有降级逻辑）
    const restaurant = await getRestaurantWithMap(cuisine, location || undefined);

    console.log(`[API] 返回餐厅: ${restaurant.name}`);

    return NextResponse.json({
      code: 0,
      data: restaurant,
    });

  } catch (error: any) {
    console.error('[API] 餐厅搜索失败:', error.message);

    // 返回友好的错误信息，但不暴露内部错误
    return NextResponse.json(
      {
        code: 500,
        message: '餐厅搜索暂时不可用，请稍后重试',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// 同时支持GET请求
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cuisine = searchParams.get('cuisine') || '餐厅';
    const location = searchParams.get('location') || undefined;
    const city = searchParams.get('city') || '北京';

    console.log(`[API] GET 搜索餐厅列表: ${cuisine}, 城市: ${city}`);

    // 搜索餐厅列表（内部已有降级逻辑）
    const restaurants = await searchNearbyRestaurants(cuisine, location, city);

    console.log(`[API] 返回 ${restaurants.length} 家餐厅`);

    return NextResponse.json({
      code: 0,
      data: {
        count: restaurants.length,
        restaurants: restaurants.slice(0, 5), // 只返回前5个
      },
    });

  } catch (error: any) {
    console.error('[API] 餐厅列表搜索失败:', error.message);
    return NextResponse.json(
      {
        code: 500,
        message: '餐厅搜索暂时不可用，请稍后重试',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
