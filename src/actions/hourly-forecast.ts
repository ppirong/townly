'use server';

import { airKoreaService } from '@/lib/services/airkorea';
import { auth } from '@clerk/nextjs/server';
import {
  type HourlyForecastRequest,
  type ProcessedHourlyForecast,
} from '@/lib/schemas/airquality';

/**
 * 시간별 대기예보 조회 (등급 정보)
 * informGrade: 지역별 예보등급 (좋음, 보통, 나쁨, 매우나쁨)
 * informData: 예보 날짜 정보 (오늘, 내일, 모레)
 */
export async function getHourlyForecast(
  searchDate: string = new Date().toISOString().split('T')[0]
): Promise<ProcessedHourlyForecast[]> {
  try {
    console.log(`시간별 대기예보 조회 시작: ${searchDate}`);
    
    const response = await airKoreaService.getHourlyForecast({
      searchDate,
      returnType: 'json',
    });

    const processedData = airKoreaService.processHourlyForecastData(response);
    
    console.log(`시간별 대기예보 조회 완료: ${processedData.length}개 항목`);
    return processedData;
  } catch (error) {
    console.error('시간별 대기예보 조회 실패:', error);
    throw new Error('시간별 대기예보를 가져오는데 실패했습니다.');
  }
}

/**
 * 최신 시간별 대기예보 조회
 */
export async function getLatestHourlyForecast(): Promise<ProcessedHourlyForecast[]> {
  try {
    const data = await airKoreaService.getLatestHourlyForecast();
    console.log(`최신 시간별 대기예보 조회 완료: ${data.length}개 항목`);
    return data;
  } catch (error) {
    console.error('최신 시간별 대기예보 조회 실패:', error);
    throw new Error('최신 시간별 대기예보를 가져오는데 실패했습니다.');
  }
}

/**
 * 특정 지역의 시간별 대기예보 필터링
 */
export async function getRegionalHourlyForecast(
  region?: string,
  searchDate: string = new Date().toISOString().split('T')[0]
): Promise<ProcessedHourlyForecast[]> {
  try {
    const allForecasts = await getHourlyForecast(searchDate);
    
    if (!region) {
      return allForecasts;
    }
    
    // 지역별 필터링 (informData에서 지역명 검색)
    const filteredForecasts = allForecasts.filter(forecast => 
      forecast.informData.includes(region) || 
      forecast.informOverall?.includes(region)
    );
    
    console.log(`${region} 지역 시간별 대기예보 필터링 완료: ${filteredForecasts.length}개 항목`);
    return filteredForecasts;
  } catch (error) {
    console.error(`${region} 지역 시간별 대기예보 조회 실패:`, error);
    throw new Error(`${region} 지역의 시간별 대기예보를 가져오는데 실패했습니다.`);
  }
}

/**
 * PM10과 PM2.5 예보 분리 조회
 */
export async function getHourlyForecastByPollutant(
  pollutant: 'PM10' | 'PM25' = 'PM10',
  searchDate: string = new Date().toISOString().split('T')[0]
): Promise<ProcessedHourlyForecast[]> {
  try {
    const allForecasts = await getHourlyForecast(searchDate);
    
    // informCode로 오염물질 필터링
    const filteredForecasts = allForecasts.filter(forecast => 
      forecast.informCode === pollutant
    );
    
    console.log(`${pollutant} 시간별 대기예보 조회 완료: ${filteredForecasts.length}개 항목`);
    return filteredForecasts;
  } catch (error) {
    console.error(`${pollutant} 시간별 대기예보 조회 실패:`, error);
    throw new Error(`${pollutant} 시간별 대기예보를 가져오는데 실패했습니다.`);
  }
}

/**
 * 사용자별 관심 지역 시간별 대기예보 조회
 */
export async function getUserHourlyForecast(
  userRegion: string = '수도권',
  searchDate: string = new Date().toISOString().split('T')[0]
): Promise<{
  pm10Forecast: ProcessedHourlyForecast[];
  pm25Forecast: ProcessedHourlyForecast[];
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('로그인이 필요합니다.');
  }

  try {
    const [pm10Data, pm25Data] = await Promise.all([
      getRegionalHourlyForecast(userRegion, searchDate).then(data => 
        data.filter(item => item.informCode === 'PM10')
      ),
      getRegionalHourlyForecast(userRegion, searchDate).then(data => 
        data.filter(item => item.informCode === 'PM25')
      ),
    ]);

    console.log(`사용자 ${userRegion} 지역 시간별 대기예보 조회 완료`);
    return {
      pm10Forecast: pm10Data,
      pm25Forecast: pm25Data,
    };
  } catch (error) {
    console.error('사용자 시간별 대기예보 조회 실패:', error);
    throw new Error('사용자 시간별 대기예보를 가져오는데 실패했습니다.');
  }
}
