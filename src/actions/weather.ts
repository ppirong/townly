'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import * as weatherQueries from '@/db/queries/weather';
import * as locationQueries from '@/db/queries/locations';
import { 
  mapHourlyWeatherForClient,
  mapDailyWeatherForClient,
  mapArraySafely,
  type ClientHourlyWeatherData,
  type ClientDailyWeatherData
} from '@/lib/dto/weather-dto-mappers';
import { 
  hourlyWeatherApiRequestSchema,
  dailyWeatherApiRequestSchema,
  internalHourlyWeatherRequestSchema,
  internalDailyWeatherRequestSchema,
  userWeatherCollectionSchema
} from '@/lib/schemas/weather-schemas';
import type { 
  HourlyWeatherData,
  DailyWeatherResponse,
  DailyWeatherData
} from '@/lib/services/weather';

// 마스터 규칙: 표준 Zod 스키마 사용

/**
 * 사용자별 시간별 날씨 조회 (DB에서만 조회, API 호출 안 함)
 * 마스터 규칙: Zod 검증 + db/queries 사용 + DTO 매퍼 적용
 */
export async function getUserHourlyWeather(input: unknown): Promise<ClientHourlyWeatherData[]> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  // 마스터 규칙: Zod로 데이터 검증
  const validatedData = hourlyWeatherApiRequestSchema.parse(input);
  
  try {
    
    const now = new Date();
    const hours = validatedData.hours || 12;
    
    // 마스터 규칙: db/queries 사용
    const dbRecords = await weatherQueries.getUserHourlyWeatherData({
      clerkUserId: userId,
      startDate: now,
      hours
    });
    
    if (dbRecords.length === 0) {
      return [];
    }
    
    // 마스터 규칙: DTO 매퍼 적용
    const clientData = mapArraySafely(dbRecords, mapHourlyWeatherForClient);
    
    return clientData;
  } catch (error) {
    console.error('사용자 시간별 날씨 조회 실패:', error);
    throw new Error('시간별 날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자별 일별 날씨 조회 (DB에서만 조회, API 호출 안 함)
 * 마스터 규칙: Zod 검증 + db/queries 사용 + DTO 매퍼 적용
 */
export async function getUserDailyWeather(input: unknown): Promise<{ dailyForecasts: ClientDailyWeatherData[] }> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  // 마스터 규칙: Zod로 데이터 검증
  const validatedData = dailyWeatherApiRequestSchema.parse(input);
  
  try {
    
    const today = new Date().toISOString().split('T')[0];
    const days = validatedData.days || 5;
    
    // 마스터 규칙: db/queries 사용
    const dbRecords = await weatherQueries.getUserDailyWeatherData({
      clerkUserId: userId,
      startDate: today,
      days
    });
    
    if (dbRecords.length === 0) {
      return {
        dailyForecasts: [],
      };
    }
    
    // 마스터 규칙: DTO 매퍼 적용
    const dailyForecasts = mapArraySafely(dbRecords, mapDailyWeatherForClient);
    
    return { dailyForecasts };
  } catch (error) {
    console.error('사용자 일별 날씨 조회 실패:', error);
    throw new Error('일별 날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자 위치 기반 날씨 조회 (위도/경도) - DB에서만 조회
 */
export async function getUserWeatherByCoordinates(
  latitude: number,
  longitude: number,
  units: 'metric' | 'imperial' = 'metric'
): Promise<{
  hourlyWeather: ClientHourlyWeatherData[];
  dailyWeather: { dailyForecasts: ClientDailyWeatherData[] };
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    
    // 시간별과 일별 날씨를 병렬로 조회
    const [hourlyWeather, dailyWeather] = await Promise.all([
      getUserHourlyWeather({ latitude, longitude, hours: 12, units }),
      getUserDailyWeather({ latitude, longitude, days: 5, units }),
    ]);
    
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
 * 사용자 저장된 위치의 날씨 조회 - DB에서만 조회
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
    // 마스터 규칙: db/queries 사용
    const userLocation = await locationQueries.getUserLocationByUserId(userId);
    
    if (!userLocation) {
      return null;
    }
    
    
    // 저장된 위치의 날씨 조회 (DB에서만)
    return await getUserWeatherByCoordinates(
      parseFloat(userLocation.latitude),
      parseFloat(userLocation.longitude)
    );
  } catch (error) {
    console.error('사용자 저장된 위치 날씨 조회 실패:', error);
    throw new Error('저장된 위치의 날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 날씨 새로고침 (디버그용) - AccuWeather API 강제 호출 및 DB 저장
 * 캐시를 무시하고 항상 새로운 데이터를 가져옵니다.
 */
export async function refreshWeatherFromAPI(): Promise<{
  success: boolean;
  message: string;
  data?: {
    hourlyWeather: HourlyWeatherData[];
    dailyWeather: DailyWeatherResponse;
  };
  error?: string;
}> {
  const { userId } = await auth();
  
  if (!userId) {
    return {
      success: false,
      message: '로그인이 필요합니다.',
      error: 'Unauthorized'
    };
  }
  
  try {
    
    // 마스터 규칙: db/queries 사용
    const userLocation = await locationQueries.getUserLocationByUserId(userId);
    
    if (!userLocation) {
      return {
        success: false,
        message: '저장된 위치 정보가 없습니다. 먼저 위치를 설정해주세요.',
        error: 'NO_LOCATION'
      };
    }
    const latitude = parseFloat(userLocation.latitude);
    const longitude = parseFloat(userLocation.longitude);
    
    
    // AccuWeather API 직접 호출 (캐시 무시)
    const { getHourlyWeather, getDailyWeather } = await import('@/lib/services/weather');
    
    // 시간별 날씨와 일별 날씨를 병렬로 가져오기
    const [hourlyWeather, dailyWeatherResponse] = await Promise.all([
      getHourlyWeather({
        latitude,
        longitude,
        units: 'metric',
        clerkUserId: userId, // 사용자 ID 전달하여 DB 저장
      }),
      getDailyWeather({
        latitude,
        longitude,
        days: 5,
        units: 'metric',
        clerkUserId: userId, // 사용자 ID 전달하여 DB 저장
      }),
    ]);
    
    
    return {
      success: true,
      message: `날씨 데이터가 성공적으로 갱신되었습니다. (시간별: ${hourlyWeather.length}개, 일별: ${dailyWeatherResponse.dailyForecasts.length}개)`,
      data: {
        hourlyWeather,
        dailyWeather: dailyWeatherResponse,
      }
    };
  } catch (error) {
    console.error('날씨 새로고침 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '날씨 정보를 가져오는데 실패했습니다.';
    
    return {
      success: false,
      message: '날씨 새로고침에 실패했습니다.',
      error: errorMessage
    };
  }
}
