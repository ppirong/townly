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
  hours: z.number().min(1).max(96).default(12),
});

const dailyAirQualitySchema = airQualityLocationSchema.extend({
  days: z.number().min(1).max(7).default(7),
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
    console.log(`🌬️ 사용자 ${userId} 현재 대기질 조회 시작: ${latitude}, ${longitude}`);
    
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
    
    console.log(`✅ 사용자 ${userId} 현재 대기질 조회 완료`);
    return processedData;
  } catch (error) {
    console.error('사용자 현재 대기질 조회 실패:', error);
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
    console.log(`🌬️ 사용자 ${userId} 시간별 대기질 조회 시작: ${validatedData.latitude}, ${validatedData.longitude}`);
    
    const request: GoogleHourlyAirQualityRequest = {
      ...validatedData,
      clerkUserId: userId,
    };
    
    const hourlyData = await googleAirQualityService.getHourlyAirQualityWithTTL(request);
    
    console.log(`✅ 사용자 ${userId} 시간별 대기질 조회 완료: ${hourlyData.length}개 항목`);
    return hourlyData;
  } catch (error) {
    console.error('사용자 시간별 대기질 조회 실패:', error);
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
    console.log(`🌬️ 사용자 ${userId} 일별 대기질 조회 시작: ${validatedData.latitude}, ${validatedData.longitude}`);
    
    const request: GoogleDailyAirQualityRequest = {
      ...validatedData,
      clerkUserId: userId,
    };
    
    const dailyData = await googleAirQualityService.getDailyAirQualityWithTTL(request);
    
    console.log(`✅ 사용자 ${userId} 일별 대기질 조회 완료: ${dailyData.length}개 항목`);
    return dailyData;
  } catch (error) {
    console.error('사용자 일별 대기질 조회 실패:', error);
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
    console.log(`🌬️ 사용자 ${userId} 좌표 기반 대기질 조회 시작: ${latitude}, ${longitude}`);
    
    // 현재, 시간별, 일별 대기질을 병렬로 조회
    const [currentAirQuality, hourlyAirQuality, dailyAirQuality] = await Promise.all([
      getCurrentAirQuality(latitude, longitude),
      getHourlyAirQuality({ 
        latitude, 
        longitude, 
        hours: 12,
        includeLocalAqi: true,
        includeDominantPollutant: true,
        includeHealthSuggestion: true,
        languageCode: 'ko'
      }),
      getDailyAirQuality({ 
        latitude, 
        longitude, 
        days: 7,
        includeLocalAqi: true,
        includeDominantPollutant: true,
        includeHealthSuggestion: true,
        languageCode: 'ko'
      }),
    ]);
    
    console.log(`✅ 사용자 ${userId} 좌표 기반 대기질 조회 완료`);
    return {
      currentAirQuality,
      hourlyAirQuality,
      dailyAirQuality,
    };
  } catch (error) {
    console.error('사용자 좌표 기반 대기질 조회 실패:', error);
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
    const { getUserLocation } = await import('./location');
    const locationResult = await getUserLocation();
    
    if (!locationResult.success || !locationResult.data) {
      console.log(`사용자 ${userId}의 저장된 위치 정보가 없습니다.`);
      return null;
    }
    
    const userLocation = locationResult.data;
    
    console.log(`🌬️ 사용자 ${userId} 저장된 위치 대기질 조회 시작: ${userLocation.latitude}, ${userLocation.longitude}`);
    
    // 저장된 위치의 대기질 조회
    return await getUserAirQualityByCoordinates(
      parseFloat(userLocation.latitude),
      parseFloat(userLocation.longitude)
    );
  } catch (error) {
    console.error('사용자 저장된 위치 대기질 조회 실패:', error);
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
    console.error('Google Air Quality API 사용량 조회 실패:', error);
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
    console.log(`🔄 사용자 ${userId} 대기질 데이터 새로고침 시작: ${latitude}, ${longitude}`);
    
    // 캐시를 무시하고 새로운 데이터 조회
    const result = await getUserAirQualityByCoordinates(latitude, longitude);
    
    console.log(`✅ 사용자 ${userId} 대기질 데이터 새로고침 완료`);
    return result;
  } catch (error) {
    console.error('대기질 데이터 새로고침 실패:', error);
    throw new Error('대기질 데이터를 새로고침하는데 실패했습니다.');
  }
}
