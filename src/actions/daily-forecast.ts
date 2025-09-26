'use server';

import { airKoreaService } from '@/lib/services/airkorea';
import { z } from 'zod';
import type { SevenDayForecast } from '@/lib/schemas/airquality';

/**
 * 7일간 대기질 예보 조회 서버 액션
 */

const getSevenDayForecastSchema = z.object({
  userRegion: z.string().optional().default('서울'),
});

type GetSevenDayForecastInput = z.infer<typeof getSevenDayForecastSchema>;

export async function getSevenDayForecast(input: Partial<GetSevenDayForecastInput> = {}): Promise<SevenDayForecast[]> {
  try {
    // 입력 데이터 검증
    const validatedData = getSevenDayForecastSchema.parse(input);
    
    // 7일간 대기질 예보 조회
    const forecastData = await airKoreaService.getSevenDayForecast(validatedData.userRegion);
    
    return forecastData;
  } catch (error) {
    console.error('7일간 대기질 예보 조회 실패:', error);
    throw new Error('7일간 대기질 예보를 가져오는데 실패했습니다.');
  }
}

/**
 * 일별 대기질 예보 조회 서버 액션 (오늘~+2일)
 */
export async function getDailyForecast() {
  try {
    const forecastData = await airKoreaService.getLatestDailyForecast();
    return forecastData;
  } catch (error) {
    console.error('일별 대기질 예보 조회 실패:', error);
    throw new Error('일별 대기질 예보를 가져오는데 실패했습니다.');
  }
}

/**
 * 주간 대기질 예보 조회 서버 액션 (기존)
 */
export async function getWeeklyForecast() {
  try {
    const forecastData = await airKoreaService.getLatestWeeklyForecast();
    return forecastData;
  } catch (error) {
    console.error('주간 대기질 예보 조회 실패:', error);
    throw new Error('주간 대기질 예보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자 지역별 7일간 대기질 예보 조회
 */
const getUserRegionalForecastSchema = z.object({
  region: z.string().min(1, '지역을 입력해주세요'),
});

type GetUserRegionalForecastInput = z.infer<typeof getUserRegionalForecastSchema>;

export async function getUserRegionalForecast(input: GetUserRegionalForecastInput): Promise<SevenDayForecast[]> {
  try {
    // 입력 데이터 검증
    const validatedData = getUserRegionalForecastSchema.parse(input);
    
    // 해당 지역의 7일간 대기질 예보 조회
    const forecastData = await airKoreaService.getSevenDayForecast(validatedData.region);
    
    return forecastData;
  } catch (error) {
    console.error('지역별 대기질 예보 조회 실패:', error);
    throw new Error('지역별 대기질 예보를 가져오는데 실패했습니다.');
  }
}
