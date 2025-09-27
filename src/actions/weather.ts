'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { 
  getHourlyWeather, 
  getDailyWeather,
  type HourlyWeatherRequest,
  type DailyWeatherRequest,
  type HourlyWeatherData,
  type DailyWeatherResponse
} from '@/lib/services/weather';

// Zod 스키마 정의
const weatherLocationSchema = z.object({
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  units: z.enum(['metric', 'imperial']).default('metric'),
});

const hourlyWeatherSchema = weatherLocationSchema.extend({
  hours: z.number().min(1).max(24).default(12),
});

const dailyWeatherSchema = weatherLocationSchema.extend({
  days: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal(15)]).default(5),
});

type HourlyWeatherInput = z.infer<typeof hourlyWeatherSchema>;
type DailyWeatherInput = z.infer<typeof dailyWeatherSchema>;

/**
 * 사용자별 시간별 날씨 조회
 */
export async function getUserHourlyWeather(input: HourlyWeatherInput): Promise<HourlyWeatherData[]> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  // Zod로 데이터 검증
  const validatedData = hourlyWeatherSchema.parse(input);
  
  try {
    console.log(`🌤️ 사용자 ${userId} 시간별 날씨 조회 시작`);
    
    // 사용자 ID를 포함하여 날씨 데이터 조회
    const weatherRequest: HourlyWeatherRequest = {
      ...validatedData,
      clerkUserId: userId, // 사용자 ID 추가
    };
    
    const hourlyData = await getHourlyWeather(weatherRequest);
    
    console.log(`✅ 사용자 ${userId} 시간별 날씨 조회 완료: ${hourlyData.length}개 항목`);
    return hourlyData;
  } catch (error) {
    console.error('사용자 시간별 날씨 조회 실패:', error);
    throw new Error('시간별 날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자별 일별 날씨 조회
 */
export async function getUserDailyWeather(input: DailyWeatherInput): Promise<DailyWeatherResponse> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  // Zod로 데이터 검증
  const validatedData = dailyWeatherSchema.parse(input);
  
  try {
    console.log(`🌤️ 사용자 ${userId} 일별 날씨 조회 시작`);
    
    // 사용자 ID를 포함하여 날씨 데이터 조회
    const weatherRequest: DailyWeatherRequest = {
      ...validatedData,
      clerkUserId: userId, // 사용자 ID 추가
    };
    
    const dailyData = await getDailyWeather(weatherRequest);
    
    console.log(`✅ 사용자 ${userId} 일별 날씨 조회 완료: ${dailyData.dailyForecasts.length}개 항목`);
    return dailyData;
  } catch (error) {
    console.error('사용자 일별 날씨 조회 실패:', error);
    throw new Error('일별 날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자 위치 기반 날씨 조회 (위도/경도)
 */
export async function getUserWeatherByCoordinates(
  latitude: number,
  longitude: number,
  units: 'metric' | 'imperial' = 'metric'
): Promise<{
  hourlyWeather: HourlyWeatherData[];
  dailyWeather: DailyWeatherResponse;
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    console.log(`🌤️ 사용자 ${userId} 좌표 기반 날씨 조회 시작: ${latitude}, ${longitude}`);
    
    const baseRequest = {
      latitude,
      longitude,
      units,
      clerkUserId: userId,
    };
    
    // 시간별과 일별 날씨를 병렬로 조회
    const [hourlyWeather, dailyWeather] = await Promise.all([
      getHourlyWeather({ ...baseRequest, hours: 12 }),
      getDailyWeather({ ...baseRequest, days: 5 }),
    ]);
    
    console.log(`✅ 사용자 ${userId} 좌표 기반 날씨 조회 완료`);
    return {
      hourlyWeather,
      dailyWeather,
    };
  } catch (error) {
    console.error('사용자 좌표 기반 날씨 조회 실패:', error);
    throw new Error('위치 기반 날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자 저장된 위치의 날씨 조회
 */
export async function getUserLocationWeather(): Promise<{
  hourlyWeather: HourlyWeatherData[];
  dailyWeather: DailyWeatherResponse;
} | null> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    // 사용자 위치 정보 조회
    const { getUserLocation } = await import('./location');
    const locationResult = await getUserLocation();
    
    if (!locationResult.success || !locationResult.data) {
      console.log(`사용자 ${userId}의 저장된 위치 정보가 없습니다.`);
      return null;
    }
    
    const userLocation = locationResult.data;
    
    console.log(`🌤️ 사용자 ${userId} 저장된 위치 날씨 조회 시작: ${userLocation.latitude}, ${userLocation.longitude}`);
    
    // 저장된 위치의 날씨 조회
    return await getUserWeatherByCoordinates(
      parseFloat(userLocation.latitude),
      parseFloat(userLocation.longitude)
    );
  } catch (error) {
    console.error('사용자 저장된 위치 날씨 조회 실패:', error);
    throw new Error('저장된 위치의 날씨 정보를 가져오는데 실패했습니다.');
  }
}
