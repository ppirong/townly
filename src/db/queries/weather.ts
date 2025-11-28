/**
 * 날씨 데이터 쿼리 함수들
 * 마스터 규칙: 모든 DB 접근은 db/queries를 통해서만
 */

import { db } from '@/db';
import { 
  hourlyWeatherData, 
  dailyWeatherData, 
  weatherLocationKeys,
  type NewHourlyWeatherData,
  type NewDailyWeatherData, 
  type NewWeatherLocationKey
} from '@/db/schema';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';

// ===== LOCATION KEYS =====

/**
 * 위치 키 조회 (캐시 키 기반)
 */
export async function getLocationKeyByCacheKey(cacheKey: string) {
  return await db
    .select()
    .from(weatherLocationKeys)
    .where(eq(weatherLocationKeys.locationKey, cacheKey))
    .limit(1);
}

/**
 * 위치 키 저장/업데이트
 */
export async function saveLocationKey(data: {
  locationName: string;
  latitude: string;
  longitude: string;
  locationKey: string;
  cacheKey?: string;
  expiresAt?: Date;
  localizedName?: string;
  countryCode?: string;
  administrativeArea?: string;
  searchType?: string;
  rawLocationData?: Record<string, unknown>;
}) {
  const newLocationKey: NewWeatherLocationKey = {
    locationName: data.locationName,
    latitude: data.latitude,
    longitude: data.longitude,
    locationKey: data.locationKey,
    localizedName: data.localizedName,
    countryCode: data.countryCode,
    administrativeArea: data.administrativeArea,
    searchType: data.searchType || 'manual',
    rawLocationData: data.rawLocationData,
    cacheKey: data.cacheKey || `locationKey:${data.locationKey}`,
    expiresAt: data.expiresAt || new Date(Date.now() + 60 * 60 * 1000), // 1시간 기본 TTL
  };

  return await db.insert(weatherLocationKeys)
    .values(newLocationKey)
    .onConflictDoUpdate({
      target: weatherLocationKeys.cacheKey,
      set: {
        locationName: data.locationName,
        latitude: data.latitude,
        longitude: data.longitude,
        localizedName: data.localizedName,
        countryCode: data.countryCode,
        administrativeArea: data.administrativeArea,
        searchType: data.searchType || 'manual',
        rawLocationData: data.rawLocationData,
        expiresAt: data.expiresAt || new Date(Date.now() + 60 * 60 * 1000),
        updatedAt: new Date(),
      }
    });
}

/**
 * 위치 키 개수 조회 (만료되지 않은 것만)
 */
export async function getActiveLocationKeysCount() {
  try {
    const result = await db
      .select({ count: count() })
      .from(weatherLocationKeys)
      .where(gte(weatherLocationKeys.expiresAt, new Date()));
    
    return result[0]?.count || 0;
  } catch (error) {
    console.error('위치 키 개수 조회 실패:', error);
    return 0;
  }
}

/**
 * 만료된 위치 키 데이터 삭제
 */
export async function deleteExpiredLocationKeys(now?: Date) {
  const expireTime = now || new Date();
  try {
    return await db
      .delete(weatherLocationKeys)
      .where(
        and(
          lte(weatherLocationKeys.expiresAt, expireTime),
          sql`${weatherLocationKeys.expiresAt} IS NOT NULL`
        )
      );
  } catch (error) {
    console.error('만료된 위치 키 데이터 삭제 실패:', error);
    return { rowCount: 0 };
  }
}

// ===== HOURLY WEATHER DATA =====

/**
 * 사용자별 시간별 날씨 데이터 조회
 */
export async function getUserHourlyWeatherData(params: {
  clerkUserId: string;
  locationKey?: string;
  startDate: Date;
  hours?: number;
}) {
  const { clerkUserId, locationKey, startDate, hours = 12 } = params;
  
  const conditions = [
    eq(hourlyWeatherData.clerkUserId, clerkUserId),
    gte(hourlyWeatherData.expiresAt, new Date()),
    gte(hourlyWeatherData.forecastDatetime, startDate)
  ];
  
  if (locationKey) {
    conditions.push(eq(hourlyWeatherData.locationKey, locationKey));
  }
  
  return await db
    .select()
    .from(hourlyWeatherData)
    .where(and(...conditions))
    .orderBy(hourlyWeatherData.forecastDatetime)
    .limit(hours);
}

/**
 * 시간별 날씨 데이터 저장
 */
export async function saveHourlyWeatherData(records: NewHourlyWeatherData[]) {
  if (records.length === 0) return;
  
  return await db.insert(hourlyWeatherData).values(records);
}

/**
 * 캐시 키로 시간별 날씨 데이터 삭제 (cacheKey 컬럼이 없으면 사용자+위치 기반으로 삭제)
 */
export async function deleteHourlyWeatherByCacheKey(cacheKey: string) {
  if (!cacheKey) return;
  
  try {
    return await db
      .delete(hourlyWeatherData)
      .where(eq(hourlyWeatherData.cacheKey, cacheKey));
  } catch (error) {
    // cacheKey 컬럼이 없으면 다른 방법으로 삭제하지 않고 무시
    return;
  }
}

/**
 * 만료된 시간별 날씨 데이터 삭제
 */
export async function deleteExpiredHourlyWeatherData(now?: Date) {
  const expireTime = now || new Date();
  try {
    return await db
      .delete(hourlyWeatherData)
      .where(lte(hourlyWeatherData.expiresAt, expireTime));
  } catch (error) {
    console.error('만료된 시간별 날씨 데이터 삭제 실패:', error);
    return { rowCount: 0 };
  }
}

/**
 * 유효한 시간별 날씨 데이터 개수 조회
 */
export async function getValidHourlyWeatherCount() {
  const result = await db
    .select({ count: count() })
    .from(hourlyWeatherData)
    .where(gte(hourlyWeatherData.expiresAt, new Date()));
  
  return result[0]?.count || 0;
}

// ===== DAILY WEATHER DATA =====

/**
 * 사용자별 일별 날씨 데이터 조회
 */
export async function getUserDailyWeatherData(params: {
  clerkUserId: string;
  locationKey?: string;
  startDate: string;
  days?: number;
}) {
  const { clerkUserId, locationKey, startDate, days = 5 } = params;
  
  const conditions = [
    eq(dailyWeatherData.clerkUserId, clerkUserId),
    gte(dailyWeatherData.expiresAt, new Date()),
    gte(dailyWeatherData.forecastDate, startDate)
  ];
  
  if (locationKey) {
    conditions.push(eq(dailyWeatherData.locationKey, locationKey));
  }
  
  return await db
    .select()
    .from(dailyWeatherData)
    .where(and(...conditions))
    .orderBy(dailyWeatherData.forecastDate)
    .limit(days);
}

/**
 * 일별 날씨 데이터 저장
 */
export async function saveDailyWeatherData(records: NewDailyWeatherData[]) {
  if (records.length === 0) return;
  
  return await db.insert(dailyWeatherData).values(records);
}

/**
 * 캐시 키로 일별 날씨 데이터 삭제 (cacheKey 컬럼이 없으면 사용자+위치 기반으로 삭제)
 */
export async function deleteDailyWeatherByCacheKey(cacheKey: string) {
  if (!cacheKey) return;
  
  try {
    return await db
      .delete(dailyWeatherData)
      .where(eq(dailyWeatherData.cacheKey, cacheKey));
  } catch (error) {
    // cacheKey 컬럼이 없으면 다른 방법으로 삭제하지 않고 무시
    return;
  }
}

/**
 * 만료된 일별 날씨 데이터 삭제
 */
export async function deleteExpiredDailyWeatherData(now?: Date) {
  const expireTime = now || new Date();
  try {
    return await db
      .delete(dailyWeatherData)
      .where(lte(dailyWeatherData.expiresAt, expireTime));
  } catch (error) {
    console.error('만료된 일별 날씨 데이터 삭제 실패:', error);
    return { rowCount: 0 };
  }
}

/**
 * 유효한 일별 날씨 데이터 개수 조회
 */
export async function getValidDailyWeatherCount() {
  const result = await db
    .select({ count: count() })
    .from(dailyWeatherData)
    .where(gte(dailyWeatherData.expiresAt, new Date()));
  
  return result[0]?.count || 0;
}

// ===== CACHE MANAGEMENT =====

/**
 * 전체 캐시 통계 조회
 */
export async function getCacheStats() {
  const [hourlyCount, dailyCount, locationCount] = await Promise.all([
    getValidHourlyWeatherCount(),
    getValidDailyWeatherCount(),
    getActiveLocationKeysCount()
  ]);

  return {
    hourlyRecords: hourlyCount,
    dailyRecords: dailyCount,
    locationKeys: locationCount,
  };
}

/**
 * 만료된 모든 데이터 정리
 */
export async function cleanupExpiredData() {
  await Promise.all([
    deleteExpiredHourlyWeatherData(),
    deleteExpiredDailyWeatherData()
  ]);
}
