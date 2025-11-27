'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { 
  googleAirQualityService,
  type GoogleAirQualityRequest,
  type GoogleHourlyAirQualityRequest,
  type GoogleDailyAirQualityRequest,
  type ProcessedAirQualityData
} from '@/lib/services/google-air-quality';
import { 
  getGoogleHourlyAirQualityByUser,
  getGoogleDailyAirQualityByUser 
} from '@/db/queries/google-air-quality';
import { getUserLocationByUserId } from '@/db/queries/locations';
import { mapUserLocationForClient } from '@/lib/dto/location-mappers';

// Zod 스키마 정의
const airQualityLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  includeLocalAqi: z.boolean().default(true),
  includeDominantPollutant: z.boolean().default(true),
  includeHealthSuggestion: z.boolean().default(true),
  languageCode: z.string().default('ko'),
});

const hourlyAirQualitySchema = airQualityLocationSchema.extend({
  hours: z.number().min(1).max(90).default(12), // Google API 실제 제한: 최대 90시간
});

const dailyAirQualitySchema = airQualityLocationSchema.extend({
  days: z.number().min(1).max(2).default(2), // 12시간 시간별 데이터로부터 최대 2일 생성 (오늘+내일)
});

type HourlyAirQualityInput = z.infer<typeof hourlyAirQualitySchema>;
type DailyAirQualityInput = z.infer<typeof dailyAirQualitySchema>;

/**
 * 사용자별 현재 대기질 정보 조회
 */
export async function getCurrentAirQuality(
  latitude: number,
  longitude: number
): Promise<ProcessedAirQualityData> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    
    const request: GoogleAirQualityRequest = {
      latitude,
      longitude,
      clerkUserId: userId,
      includeLocalAqi: true,
      includeDominantPollutant: true,
      includeHealthSuggestion: true,
      languageCode: 'ko',
    };
    
    const currentData = await googleAirQualityService.getCurrentAirQuality(request);
    const processedData = googleAirQualityService.processAirQualityData(currentData);
    
    return processedData;
  } catch (error) {
    throw new Error('현재 대기질 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자별 시간별 대기질 예보 조회
 */
export async function getHourlyAirQuality(input: HourlyAirQualityInput): Promise<ProcessedAirQualityData[]> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  // Zod로 데이터 검증
  const validatedData = hourlyAirQualitySchema.parse(input);
  
  try {
    
    const request: GoogleHourlyAirQualityRequest = {
      ...validatedData,
      clerkUserId: userId,
    };
    
    const hourlyData = await googleAirQualityService.getHourlyAirQualityWithTTL(request);
    
    return hourlyData;
  } catch (error) {
    throw new Error('시간별 대기질 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자별 일별 대기질 예보 조회
 */
export async function getDailyAirQuality(input: DailyAirQualityInput): Promise<ProcessedAirQualityData[]> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  // Zod로 데이터 검증
  const validatedData = dailyAirQualitySchema.parse(input);
  
  try {
    
    const request: GoogleDailyAirQualityRequest = {
      ...validatedData,
      clerkUserId: userId,
    };
    
    const dailyData = await googleAirQualityService.getDailyAirQualityWithTTL(request);
    
    return dailyData;
  } catch (error) {
    throw new Error('일별 대기질 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자 위치 기반 대기질 조회 (위도/경도)
 */
export async function getUserAirQualityByCoordinates(
  latitude: number,
  longitude: number
): Promise<{
  currentAirQuality: ProcessedAirQualityData;
  hourlyAirQuality: ProcessedAirQualityData[];
  dailyAirQuality: ProcessedAirQualityData[];
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    
    // 현재, 시간별, 일별 대기질을 병렬로 조회
    const [currentAirQuality, hourlyResponse, dailyAirQuality] = await Promise.all([
      googleAirQualityService.getCurrentAirQuality({ 
        latitude, 
        longitude, 
        includeLocalAqi: true,
        includeDominantPollutant: true,
        includeHealthSuggestion: true,
        languageCode: 'ko'
      }),
      googleAirQualityService.getHourlyForecast({ 
        latitude, 
        longitude, 
        hours: 12,
        includeLocalAqi: true,
        includeDominantPollutant: true,
        includeHealthSuggestion: true,
        languageCode: 'ko'
      }),
      googleAirQualityService.getDailyAirQualityWithTTL({ 
        latitude, 
        longitude, 
        days: 2,
        includeLocalAqi: true,
        includeDominantPollutant: true,
        includeHealthSuggestion: true,
        languageCode: 'ko'
      }),
    ]);

    // 현재 대기질 데이터 처리
    const processedCurrentAirQuality = googleAirQualityService.processAirQualityData(currentAirQuality);
    
    // 시간별 응답에서 실제 데이터 추출
    const hourlyAirQuality = hourlyResponse.hourlyForecasts?.map(forecast => 
      googleAirQualityService.processAirQualityData(forecast)
    ) || [];
    
    return {
      currentAirQuality: processedCurrentAirQuality,
      hourlyAirQuality,
      dailyAirQuality,
    };
  } catch (error) {
    throw new Error('위치 기반 대기질 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자 저장된 위치의 대기질 조회
 */
export async function getUserLocationAirQuality(): Promise<{
  currentAirQuality: ProcessedAirQualityData;
  hourlyAirQuality: ProcessedAirQualityData[];
  dailyAirQuality: ProcessedAirQualityData[];
} | null> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    // 사용자 위치 정보 조회
    const dbLocation = await getUserLocationByUserId(userId);
    
    if (!dbLocation) {
      return null;
    }
    
    const userLocation = mapUserLocationForClient(dbLocation);
    
    
    // 저장된 위치의 대기질 조회
    return await getUserAirQualityByCoordinates(
      parseFloat(userLocation.latitude),
      parseFloat(userLocation.longitude)
    );
  } catch (error) {
    throw new Error('저장된 위치의 대기질 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * Google Air Quality API 사용량 통계 조회
 */
export async function getGoogleAirQualityApiUsage(date?: string): Promise<{
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTime: number;
  dailyLimit: number;
  remainingCalls: number;
  usagePercentage: number;
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    const stats = await googleAirQualityService.getApiUsageStats(date);
    
    // Google Air Quality API 무료 한도: 월 10,000회 (일 약 333회로 계산)
    const dailyLimit = 333;
    const remainingCalls = Math.max(0, dailyLimit - stats.totalCalls);
    const usagePercentage = Math.round((stats.totalCalls / dailyLimit) * 100);
    
    return {
      ...stats,
      dailyLimit,
      remainingCalls,
      usagePercentage,
    };
  } catch (error) {
    throw new Error('API 사용량 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 대기질 데이터 새로고침
 */
export async function refreshAirQualityData(
  latitude: number,
  longitude: number
): Promise<{
  currentAirQuality: ProcessedAirQualityData;
  hourlyAirQuality: ProcessedAirQualityData[];
  dailyAirQuality: ProcessedAirQualityData[];
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    
    // 캐시를 무시하고 새로운 데이터 조회
    const result = await getUserAirQualityByCoordinates(latitude, longitude);
    
    return result;
  } catch (error) {
    throw new Error('대기질 데이터를 새로고침하는데 실패했습니다.');
  }
}

/**
 * 사용자별 저장된 90시간 대기질 데이터 조회
 * (스케줄러가 미리 수집해둔 데이터를 데이터베이스에서 조회)
 */
export async function getStored90HourAirQuality(
  latitude: number,
  longitude: number
): Promise<ProcessedAirQualityData[]> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    
    const storedData = await googleAirQualityService.getStored90HourData(
      userId,
      latitude,
      longitude
    );
    
    return storedData;
  } catch (error) {
    throw new Error('저장된 대기질 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 수동으로 90시간 대기질 데이터 수집 (디버그용)
 */
export async function manualCollect90HourData(
  latitude: number,
  longitude: number
): Promise<{ success: boolean; message: string; dataCount: number }> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }
  
  try {
    
    await googleAirQualityService.collectAndStore90HourDataForUser(
      userId,
      latitude,
      longitude
    );
    
    // 저장된 데이터 개수 확인
    const storedData = await googleAirQualityService.getStored90HourData(
      userId,
      latitude,
      longitude
    );
    
    return {
      success: true,
      message: `90시간 대기질 데이터 ${storedData.length}개 수집 완료`,
      dataCount: storedData.length,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '데이터 수집 실패',
      dataCount: 0,
    };
  }
}
