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

    // 搜索餐厅
    const restaurant = await getRestaurantWithMap(cuisine, location || undefined);

    return NextResponse.json({
      code: 0,
      data: restaurant,
    });

  } catch (error: any) {
    console.error('餐厅搜索失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '搜索失败' },
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

    // 搜索餐厅列表
    const restaurants = await searchNearbyRestaurants(cuisine, location, city);

    return NextResponse.json({
      code: 0,
      data: {
        count: restaurants.length,
        restaurants: restaurants.slice(0, 5), // 只返回前5个
      },
    });

  } catch (error: any) {
    console.error('餐厅搜索失败:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '搜索失败' },
      { status: 500 }
    );
  }
}
