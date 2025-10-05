'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/db';
import { hourlyWeatherData, dailyWeatherData, userLocations } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import type { 
  HourlyWeatherData,
  DailyWeatherResponse,
  DailyWeatherData
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
 * 사용자별 시간별 날씨 조회 (DB에서만 조회, API 호출 안 함)
 */
export async function getUserHourlyWeather(input: HourlyWeatherInput): Promise<HourlyWeatherData[]> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  // Zod로 데이터 검증
  const validatedData = hourlyWeatherSchema.parse(input);
  
  try {
    console.log(`🌤️ 사용자 ${userId} 시간별 날씨 조회 시작 (DB에서만)`);
    
    // 현재 시각 이후의 데이터만 조회
    const now = new Date();
    const hours = validatedData.hours || 12;
    const maxForecastTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
    
    // DB에서 사용자별 시간별 날씨 데이터 조회
    const dbRecords = await db
      .select()
      .from(hourlyWeatherData)
      .where(and(
        eq(hourlyWeatherData.clerkUserId, userId),
        gte(hourlyWeatherData.forecastDateTime, now),
        lte(hourlyWeatherData.forecastDateTime, maxForecastTime),
        gte(hourlyWeatherData.expiresAt, now) // 만료되지 않은 데이터만
      ))
      .orderBy(hourlyWeatherData.forecastDateTime)
      .limit(hours);
    
    if (dbRecords.length === 0) {
      console.log(`⚠️ 사용자 ${userId}의 시간별 날씨 데이터가 DB에 없습니다. 스케줄러가 실행되기를 기다려주세요.`);
      return [];
    }
    
    // DB 레코드를 API 형식으로 변환
    const weatherData: HourlyWeatherData[] = dbRecords.map(record => ({
      location: record.locationName,
      timestamp: record.forecastDateTime.toISOString(),
      hour: `${record.forecastHour.toString().padStart(2, '0')}시`,
      temperature: record.temperature,
      conditions: record.conditions,
      weatherIcon: record.weatherIcon,
      humidity: record.humidity || 0,
      precipitation: parseFloat(record.precipitation || '0'),
      precipitationProbability: record.precipitationProbability || 0,
      rainProbability: record.rainProbability || 0,
      windSpeed: record.windSpeed || 0,
      units: record.units as 'metric' | 'imperial',
    }));
    
    console.log(`✅ 사용자 ${userId} 시간별 날씨 조회 완료: ${weatherData.length}개 항목 (DB)`);
    return weatherData;
  } catch (error) {
    console.error('사용자 시간별 날씨 조회 실패:', error);
    throw new Error('시간별 날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자별 일별 날씨 조회 (DB에서만 조회, API 호출 안 함)
 */
export async function getUserDailyWeather(input: DailyWeatherInput): Promise<DailyWeatherResponse> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  // Zod로 데이터 검증
  const validatedData = dailyWeatherSchema.parse(input);
  
  try {
    console.log(`🌤️ 사용자 ${userId} 일별 날씨 조회 시작 (DB에서만)`);
    
    // 오늘 날짜 이후의 데이터만 조회
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const days = validatedData.days || 5;
    
    // DB에서 사용자별 일별 날씨 데이터 조회
    const dbRecords = await db
      .select()
      .from(dailyWeatherData)
      .where(and(
        eq(dailyWeatherData.clerkUserId, userId),
        gte(dailyWeatherData.forecastDate, today),
        gte(dailyWeatherData.expiresAt, now) // 만료되지 않은 데이터만
      ))
      .orderBy(dailyWeatherData.forecastDate)
      .limit(days);
    
    if (dbRecords.length === 0) {
      console.log(`⚠️ 사용자 ${userId}의 일별 날씨 데이터가 DB에 없습니다. 스케줄러가 실행되기를 기다려주세요.`);
      return {
        dailyForecasts: [],
      };
    }
    
    // DB 레코드를 API 형식으로 변환
    const dailyForecasts: DailyWeatherData[] = dbRecords.map(record => ({
      location: record.locationName,
      timestamp: new Date(record.forecastDate + 'T00:00:00').toISOString(),
      date: record.forecastDate,
      dayOfWeek: record.dayOfWeek,
      temperature: record.temperature,
      highTemp: record.highTemp,
      lowTemp: record.lowTemp,
      conditions: record.conditions,
      weatherIcon: record.weatherIcon,
      humidity: 0,
      precipitation: 0,
      precipitationProbability: record.precipitationProbability || 0,
      rainProbability: record.rainProbability || 0,
      windSpeed: 0,
      units: record.units as 'metric' | 'imperial',
      dayWeather: record.dayWeather as any,
      nightWeather: record.nightWeather as any,
    }));
    
    const response: DailyWeatherResponse = {
      headline: dbRecords[0]?.headline as any,
      dailyForecasts,
    };
    
    console.log(`✅ 사용자 ${userId} 일별 날씨 조회 완료: ${dailyForecasts.length}개 항목 (DB)`);
    return response;
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
  hourlyWeather: HourlyWeatherData[];
  dailyWeather: DailyWeatherResponse;
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    console.log(`🌤️ 사용자 ${userId} 좌표 기반 날씨 조회 시작 (DB에서만): ${latitude}, ${longitude}`);
    
    // 시간별과 일별 날씨를 병렬로 조회
    const [hourlyWeather, dailyWeather] = await Promise.all([
      getUserHourlyWeather({ hours: 12, units }),
      getUserDailyWeather({ days: 5, units }),
    ]);
    
    console.log(`✅ 사용자 ${userId} 좌표 기반 날씨 조회 완료 (DB)`);
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
    // 사용자 위치 정보 조회 (user_locations 테이블에서)
    const userLocationRecords = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.clerkUserId, userId))
      .limit(1);
    
    if (userLocationRecords.length === 0) {
      console.log(`사용자 ${userId}의 저장된 위치 정보가 없습니다.`);
      return null;
    }
    
    const userLocation = userLocationRecords[0];
    
    console.log(`🌤️ 사용자 ${userId} 저장된 위치 날씨 조회 시작 (DB에서만): ${userLocation.latitude}, ${userLocation.longitude}`);
    
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
    console.log(`🔄 날씨 새로고침 시작 (디버그 모드) - 사용자: ${userId}`);
    
    // 사용자 위치 정보 조회
    const userLocationRecords = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.clerkUserId, userId))
      .limit(1);
    
    if (userLocationRecords.length === 0) {
      return {
        success: false,
        message: '저장된 위치 정보가 없습니다. 먼저 위치를 설정해주세요.',
        error: 'NO_LOCATION'
      };
    }
    
    const userLocation = userLocationRecords[0];
    const latitude = parseFloat(userLocation.latitude);
    const longitude = parseFloat(userLocation.longitude);
    
    console.log(`📍 위치: ${latitude}, ${longitude}`);
    
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
    
    console.log(`✅ AccuWeather API 호출 성공`);
    console.log(`   - 시간별 날씨: ${hourlyWeather.length}개 항목`);
    console.log(`   - 일별 날씨: ${dailyWeatherResponse.dailyForecasts.length}개 항목`);
    
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
