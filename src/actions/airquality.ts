'use server';

import { airKoreaService } from '@/lib/services/airkorea';
import { z } from 'zod';
import type { AirQualityResponse, NearbyStationResponse, WeeklyForecastResponse, ProcessedWeeklyForecast } from '@/lib/schemas/airquality';
import { wgs84ToTm } from '@/lib/utils/coordinate';
import { findNearbyStations } from '@/lib/data/stations';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { userSelectedStations } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 미세먼지/대기질 관련 Server Actions
 */

// 시도별 대기질 조회 스키마
const getSidoAirQualitySchema = z.object({
  sidoName: z.string().min(1, '시도명은 필수입니다'),
  numOfRows: z.number().min(1).max(100).default(50),
});

// 측정소별 대기질 조회 스키마
const getStationAirQualitySchema = z.object({
  stationName: z.string().min(1, '측정소명은 필수입니다'),
  dataTerm: z.enum(['DAILY', 'MONTH', '3MONTH']).default('DAILY'),
  numOfRows: z.number().min(1).max(100).default(24),
});

// 근접측정소 조회 스키마
const getNearbyStationsSchema = z.object({
  latitude: z.number().min(-90).max(90, '위도는 -90도에서 90도 사이여야 합니다'),
  longitude: z.number().min(-180).max(180, '경도는 -180도에서 180도 사이여야 합니다'),
});

// 주간예보 조회 스키마
const getWeeklyForecastSchema = z.object({
  searchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다').optional(),
});

/**
 * 서울시 실시간 대기질 정보 조회
 */
export async function getSeoulAirQuality(): Promise<AirQualityResponse> {
  try {
    return await airKoreaService.getSeoulAirQuality();
  } catch (error) {
    console.error('서울 대기질 정보 조회 실패:', error);
    throw new Error('서울 대기질 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 시도별 실시간 대기질 정보 조회
 */
export async function getSidoAirQuality(input: z.infer<typeof getSidoAirQualitySchema>): Promise<AirQualityResponse> {
  const validatedData = getSidoAirQualitySchema.parse(input);
  
  try {
    return await airKoreaService.getSidoRealtimeAirQuality({
      sidoName: validatedData.sidoName,
      numOfRows: validatedData.numOfRows,
      pageNo: 1,
      returnType: 'json',
      ver: '1.3',
    });
  } catch (error) {
    console.error(`${validatedData.sidoName} 대기질 정보 조회 실패:`, error);
    throw new Error(`${validatedData.sidoName} 대기질 정보를 가져오는데 실패했습니다.`);
  }
}

/**
 * 측정소별 시간별 대기질 정보 조회
 */
export async function getStationHourlyAirQuality(input: z.infer<typeof getStationAirQualitySchema>): Promise<AirQualityResponse> {
  const validatedData = getStationAirQualitySchema.parse(input);
  
  try {
    return await airKoreaService.getRealtimeAirQuality({
      stationName: validatedData.stationName,
      dataTerm: validatedData.dataTerm,
      numOfRows: validatedData.numOfRows,
      pageNo: 1,
      returnType: 'json',
      ver: '1.3',
    });
  } catch (error) {
    console.error(`${validatedData.stationName} 시간별 대기질 정보 조회 실패:`, error);
    throw new Error(`${validatedData.stationName} 시간별 대기질 정보를 가져오는데 실패했습니다.`);
  }
}

/**
 * 측정소별 일별 대기질 정보 조회
 */
export async function getStationDailyAirQuality(input: z.infer<typeof getStationAirQualitySchema>): Promise<AirQualityResponse> {
  const validatedData = getStationAirQualitySchema.parse({
    ...input,
    dataTerm: '3MONTH', // 일별 조회는 3개월 데이터 사용
    numOfRows: 90, // 90일
  });
  
  try {
    return await airKoreaService.getRealtimeAirQuality({
      stationName: validatedData.stationName,
      dataTerm: validatedData.dataTerm,
      numOfRows: validatedData.numOfRows,
      pageNo: 1,
      returnType: 'json',
      ver: '1.3',
    });
  } catch (error) {
    console.error(`${validatedData.stationName} 일별 대기질 정보 조회 실패:`, error);
    throw new Error(`${validatedData.stationName} 일별 대기질 정보를 가져오는데 실패했습니다.`);
  }
}

/**
 * 주요 도시 대기질 정보 조회
 */
export async function getMajorCitiesAirQuality(): Promise<Record<string, AirQualityResponse>> {
  try {
    return await airKoreaService.getMajorCitiesAirQuality();
  } catch (error) {
    console.error('주요 도시 대기질 정보 조회 실패:', error);
    throw new Error('주요 도시 대기질 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 특정 지역의 주요 측정소 목록 가져오기 (서울 기준)
 */
export async function getSeoulStations(): Promise<string[]> {
  try {
    const data = await airKoreaService.getSeoulAirQuality();
    const stations = data.response.body.items
      .map(item => item.stationName)
      .filter((station): station is string => !!station)
      .slice(0, 10); // 상위 10개 측정소
    
    return stations;
  } catch (error) {
    console.error('서울 측정소 목록 조회 실패:', error);
    throw new Error('측정소 목록을 가져오는데 실패했습니다.');
  }
}

/**
 * 위치 기반 근접측정소 조회 (로컬 데이터베이스 사용)
 */
export async function getNearbyStationsLocal(input: z.infer<typeof getNearbyStationsSchema>): Promise<Array<{
  stationName: string;
  sido: string;
  distance: number;
  address: string;
}>> {
  const validatedData = getNearbyStationsSchema.parse(input);
  
  try {
    console.log(`위치 기반 측정소 조회: lat=${validatedData.latitude}, lng=${validatedData.longitude}`);
    
    // 로컬 데이터베이스에서 근접 측정소 조회
    const nearbyStations = findNearbyStations(
      validatedData.latitude, 
      validatedData.longitude, 
      50000, // 50km 반경
      10 // 최대 10개
    );
    
    return nearbyStations.map(station => ({
      stationName: station.name,
      sido: station.sido,
      distance: Math.round(station.distance),
      address: station.address,
    }));
  } catch (error) {
    console.error('근접측정소 조회 실패:', error);
    throw new Error('근처 측정소를 찾는데 실패했습니다.');
  }
}

/**
 * 위치 기반 근접측정소 조회 (API 사용 - 백업용)
 */
export async function getNearbyStations(input: z.infer<typeof getNearbyStationsSchema>): Promise<NearbyStationResponse> {
  const validatedData = getNearbyStationsSchema.parse(input);
  
  try {
    // WGS84 좌표를 TM 좌표로 변환
    const { tmX, tmY } = wgs84ToTm(validatedData.latitude, validatedData.longitude);
    
    console.log(`위치 기반 측정소 조회: lat=${validatedData.latitude}, lng=${validatedData.longitude} -> tmX=${tmX}, tmY=${tmY}`);
    
    return await airKoreaService.getNearbyStations({
      tmX,
      tmY,
      returnType: 'json',
      ver: '1.3',
    });
  } catch (error) {
    console.error('근접측정소 조회 실패:', error);
    throw new Error('근처 측정소를 찾는데 실패했습니다.');
  }
}

/**
 * 위치 기반 자동 측정소 선택 및 대기질 정보 조회 (로컬 데이터베이스 사용)
 */
export async function getAirQualityByLocation(input: z.infer<typeof getNearbyStationsSchema>): Promise<{
  nearestStation: string;
  sido: string;
  distance: number;
  address: string;
  airQualityData?: AirQualityResponse;
}> {
  const validatedData = getNearbyStationsSchema.parse(input);
  
  try {
    // 1. 로컬 데이터베이스에서 근접측정소 조회
    const nearbyStations = await getNearbyStationsLocal(validatedData);
    
    if (!nearbyStations.length) {
      throw new Error('근처에 측정소가 없습니다.');
    }
    
    // 2. 가장 가까운 측정소 선택
    const nearest = nearbyStations[0];
    
    console.log(`가장 가까운 측정소: ${nearest.stationName} (${nearest.sido}) - 거리: ${nearest.distance}m`);
    
    // 3. 해당 측정소의 대기질 정보 조회 시도
    let airQualityData: AirQualityResponse | undefined;
    try {
      airQualityData = await getStationHourlyAirQuality({
        stationName: nearest.stationName,
        dataTerm: 'DAILY',
        numOfRows: 1,
      });
    } catch (error) {
      console.warn(`측정소 ${nearest.stationName}의 대기질 정보 조회 실패:`, error);
      // 대기질 정보가 없어도 측정소 정보는 반환
    }
    
    return {
      nearestStation: nearest.stationName,
      sido: nearest.sido,
      distance: nearest.distance,
      address: nearest.address,
      airQualityData,
    };
  } catch (error) {
    console.error('위치 기반 대기질 정보 조회 실패:', error);
    throw new Error('위치 기반 대기질 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자별 선택된 측정소 정보 저장
 */
export async function saveSelectedStation(input: {
  stationName: string;
  sido: string;
  isAutoSelected: boolean;
  distance?: number;
  stationAddress?: string;
  userLatitude?: number;
  userLongitude?: number;
}): Promise<{ success: boolean; message: string }> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }
  
  try {
    // 기존 선택된 측정소가 있는지 확인
    const existingStation = await db
      .select()
      .from(userSelectedStations)
      .where(eq(userSelectedStations.clerkUserId, userId));
    
    const stationData = {
      clerkUserId: userId,
      stationName: input.stationName,
      sido: input.sido,
      isAutoSelected: input.isAutoSelected,
      distance: input.distance || null,
      stationAddress: input.stationAddress || null,
      userLatitude: input.userLatitude?.toString() || null,
      userLongitude: input.userLongitude?.toString() || null,
      isDefault: true,
      selectedAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (existingStation.length > 0) {
      // 기존 데이터 업데이트
      await db
        .update(userSelectedStations)
        .set(stationData)
        .where(eq(userSelectedStations.clerkUserId, userId));
      
      console.log(`사용자 ${userId}의 측정소 정보 업데이트: ${input.stationName}`);
    } else {
      // 새 데이터 삽입
      await db.insert(userSelectedStations).values(stationData);
      
      console.log(`사용자 ${userId}의 측정소 정보 저장: ${input.stationName}`);
    }
    
    return {
      success: true,
      message: `${input.stationName} 측정소가 저장되었습니다.`
    };
  } catch (error) {
    console.error('측정소 정보 저장 실패:', error);
    throw new Error('측정소 정보를 저장하는데 실패했습니다.');
  }
}

/**
 * 사용자의 저장된 측정소 정보 조회
 */
export async function getSavedStation(): Promise<{
  stationName: string;
  sido: string;
  isAutoSelected: boolean;
  distance?: number;
  stationAddress?: string;
  selectedAt: Date;
} | null> {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }
  
  try {
    const savedStation = await db
      .select()
      .from(userSelectedStations)
      .where(eq(userSelectedStations.clerkUserId, userId));
    
    if (savedStation.length === 0) {
      return null;
    }
    
    const station = savedStation[0];
    return {
      stationName: station.stationName,
      sido: station.sido,
      isAutoSelected: station.isAutoSelected,
      distance: station.distance || undefined,
      stationAddress: station.stationAddress || undefined,
      selectedAt: station.selectedAt,
    };
  } catch (error) {
    console.error('저장된 측정소 정보 조회 실패:', error);
    return null;
  }
}

/**
 * 미세먼지 주간예보 조회
 */
export async function getWeeklyForecast(input?: z.infer<typeof getWeeklyForecastSchema>): Promise<WeeklyForecastResponse> {
  const validatedData = getWeeklyForecastSchema.parse(input || {});
  
  try {
    // 날짜가 제공되지 않으면 오늘 날짜 사용
    const searchDate = validatedData.searchDate || new Date().toISOString().split('T')[0];
    
    return await airKoreaService.getWeeklyForecast({
      searchDate,
      returnType: 'json',
    });
  } catch (error) {
    console.error('미세먼지 주간예보 조회 실패:', error);
    throw new Error('미세먼지 주간예보를 가져오는데 실패했습니다.');
  }
}

/**
 * 처리된 미세먼지 주간예보 조회
 */
export async function getProcessedWeeklyForecast(input?: z.infer<typeof getWeeklyForecastSchema>): Promise<ProcessedWeeklyForecast[]> {
  try {
    const response = await getWeeklyForecast(input);
    return airKoreaService.processWeeklyForecastData(response);
  } catch (error) {
    console.error('처리된 주간예보 조회 실패:', error);
    throw new Error('주간예보 데이터를 처리하는데 실패했습니다.');
  }
}

/**
 * 최신 미세먼지 주간예보 조회 (오늘 기준)
 */
export async function getLatestWeeklyForecast(): Promise<ProcessedWeeklyForecast[]> {
  try {
    return await airKoreaService.getLatestWeeklyForecast();
  } catch (error) {
    console.error('최신 주간예보 조회 실패:', error);
    throw new Error('최신 미세먼지 주간예보를 가져오는데 실패했습니다.');
  }
}

// TypeScript 타입 내보내기
export type GetSidoAirQualityInput = z.infer<typeof getSidoAirQualitySchema>;
export type GetStationAirQualityInput = z.infer<typeof getStationAirQualitySchema>;
export type GetNearbyStationsInput = z.infer<typeof getNearbyStationsSchema>;
export type GetWeeklyForecastInput = z.infer<typeof getWeeklyForecastSchema>;
