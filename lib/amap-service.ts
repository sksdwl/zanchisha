/**
 * 高德地图API服务
 * 用于搜索餐厅POI、获取地图信息等
 */

// 高德地图POI搜索结果
export interface AmapPOI {
  id: string;
  name: string;
  type: string;
  typecode: string;
  address: string;
  location: string; // "经度,纬度"
  tel: string;
  distance?: string;
  biz_ext?: {
    rating?: string;
    cost?: string;
  };
  photos?: Array<{
    title: string;
    url: string;
  }>;
}

export interface AmapSearchResponse {
  status: string;
  info: string;
  count: string;
  pois: AmapPOI[];
}

// 高德地图配置
const AMAP_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || ''; // 需要申请的高德地图Key
const AMAP_WEB_KEY = process.env.AMAP_WEB_KEY || ''; // 服务端使用的Key

/**
 * 搜索附近的餐厅
 * @param keywords 关键词，如"川菜"、"火锅"
 * @param location 位置，格式"经度,纬度"，不传则使用城市搜索
 * @param city 城市名称或adcode
 * @param radius 搜索半径，单位米
 */
export async function searchNearbyRestaurants(
  keywords: string,
  location?: string,
  city?: string,
  radius: number = 5000
): Promise<AmapPOI[]> {
  try {
    // 优先使用服务端Key，更安全
    const key = AMAP_WEB_KEY || AMAP_KEY;
    
    if (!key) {
      console.warn('高德地图API Key未配置，使用模拟数据');
      return getMockRestaurants(keywords);
    }

    const params = new URLSearchParams({
      key,
      keywords,
      types: '050000', // 餐饮服务
      offset: '10',
      page: '1',
      extensions: 'all', // 返回详细信息包括评分、价格等
    });

    // 如果提供了具体位置，使用周边搜索
    if (location) {
      params.append('location', location);
      params.append('radius', radius.toString());
    } else if (city) {
      // 否则使用城市搜索
      params.append('city', city);
    }

    const url = location 
      ? `https://restapi.amap.com/v3/place/around?${params.toString()}`
      : `https://restapi.amap.com/v3/place/text?${params.toString()}`;

    const response = await fetch(url);
    const data: AmapSearchResponse = await response.json();

    if (data.status === '1' && data.pois) {
      return data.pois.filter(poi => 
        // 过滤掉非餐厅类型的POI
        poi.typecode?.startsWith('0501') || // 中餐厅
        poi.typecode?.startsWith('0502') || // 外国餐厅
        poi.typecode?.startsWith('0503') || // 快餐厅
        poi.typecode?.startsWith('0504') || // 休闲餐饮
        poi.typecode?.startsWith('0505')    // 咖啡厅/茶馆
      );
    }

    console.warn('高德地图API返回异常，使用模拟数据');
    return getMockRestaurants(keywords);
  } catch (error) {
    console.error('高德地图搜索失败:', error);
    return getMockRestaurants(keywords);
  }
}

/**
 * 根据推荐结果获取真实餐厅
 */
export async function getRealRestaurantRecommendation(
  cuisine: string,
  location?: string,
  city: string = '北京'
): Promise<{
  restaurant: AmapPOI | null;
  mapUrl: string;
}> {
  const restaurants = await searchNearbyRestaurants(cuisine, location, city);
  
  if (restaurants.length === 0) {
    return {
      restaurant: null,
      mapUrl: '',
    };
  }

  // 随机选择一家评分较高的餐厅
  const sorted = restaurants
    .filter(r => r.biz_ext?.rating)
    .sort((a, b) => parseFloat(b.biz_ext!.rating!) - parseFloat(a.biz_ext!.rating!));
  
  const restaurant = sorted[0] || restaurants[0];
  
  // 生成高德地图展示链接
  const mapUrl = generateMapUrl(restaurant);
  
  return {
    restaurant,
    mapUrl,
  };
}

/**
 * 生成高德地图链接
 */
function generateMapUrl(poi: AmapPOI): string {
  const [lng, lat] = poi.location.split(',');
  // 使用高德地图URI scheme或H5链接
  return `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(poi.name)}&src=${encodeURIComponent('咱吃啥')}&coordinate=gaode&callnative=1`;
}

/**
 * 生成静态地图图片URL
 */
export function generateStaticMapUrl(
  location: string,
  name: string,
  zoom: number = 15
): string {
  const key = AMAP_KEY;
  if (!key) return '';
  
  const [lng, lat] = location.split(',');
  return `https://restapi.amap.com/v3/staticmap?key=${key}&location=${lng},${lat}&zoom=${zoom}&size=600*300&markers=large,0xFF0000,${encodeURIComponent(name)}:${lng},${lat}`;
}

// 模拟餐厅数据（当API Key未配置或请求失败时使用）
function getMockRestaurants(keywords: string): AmapPOI[] {
  const mockData: Record<string, AmapPOI[]> = {
    '川菜': [
      {
        id: 'mock_1',
        name: '蜀香园川菜馆',
        type: '中餐厅;川菜馆',
        typecode: '050101',
        address: '朝阳区建国路88号',
        location: '116.481488,39.990464',
        tel: '010-12345678',
        biz_ext: { rating: '4.5', cost: '80' },
      },
      {
        id: 'mock_2',
        name: '川味人家',
        type: '中餐厅;川菜馆',
        typecode: '050101',
        address: '海淀区中关村大街1号',
        location: '116.310316,39.992093',
        tel: '010-87654321',
        biz_ext: { rating: '4.3', cost: '65' },
      },
    ],
    '火锅': [
      {
        id: 'mock_3',
        name: '海底捞火锅',
        type: '中餐厅;火锅店',
        typecode: '050117',
        address: '西城区西单北大街110号',
        location: '116.375282,39.914305',
        tel: '010-11112222',
        biz_ext: { rating: '4.8', cost: '120' },
      },
      {
        id: 'mock_4',
        name: '小龙坎老火锅',
        type: '中餐厅;火锅店',
        typecode: '050117',
        address: '东城区王府井大街255号',
        location: '116.410876,39.912345',
        tel: '010-33334444',
        biz_ext: { rating: '4.4', cost: '100' },
      },
    ],
    '粤菜': [
      {
        id: 'mock_5',
        name: '广州酒家',
        type: '中餐厅;粤菜馆',
        typecode: '050103',
        address: '朝阳区三里屯路19号',
        location: '116.455393,39.936454',
        tel: '010-55556666',
        biz_ext: { rating: '4.6', cost: '150' },
      },
    ],
    '日料': [
      {
        id: 'mock_6',
        name: '樱之味日本料理',
        type: '外国餐厅;日本料理',
        typecode: '050201',
        address: '朝阳区亮马桥路48号',
        location: '116.462312,39.949876',
        tel: '010-77778888',
        biz_ext: { rating: '4.5', cost: '200' },
      },
    ],
  };

  // 根据关键词匹配
  for (const key of Object.keys(mockData)) {
    if (keywords.includes(key)) {
      return mockData[key];
    }
  }

  // 默认返回
  return [
    {
      id: 'mock_default',
      name: '美食坊',
      type: '中餐厅',
      typecode: '050100',
      address: '市中心繁华地段',
      location: '116.397428,39.90923',
      tel: '010-99998888',
      biz_ext: { rating: '4.2', cost: '60' },
    },
  ];
}

/**
 * 客户端调用：获取餐厅推荐（带地图信息）
 */
export async function getRestaurantWithMap(
  cuisine: string,
  location?: string
): Promise<{
  name: string;
  address: string;
  rating: string;
  cost: string;
  tel: string;
  mapUrl: string;
  staticMapUrl: string;
  location: string;
}> {
  const result = await getRealRestaurantRecommendation(cuisine, location);
  
  if (!result.restaurant) {
    throw new Error('未找到合适的餐厅');
  }

  const poi = result.restaurant;
  
  return {
    name: poi.name,
    address: poi.address,
    rating: poi.biz_ext?.rating || '4.0',
    cost: poi.biz_ext?.cost || '50',
    tel: poi.tel || '暂无电话',
    mapUrl: result.mapUrl,
    staticMapUrl: generateStaticMapUrl(poi.location, poi.name),
    location: poi.location,
  };
}
