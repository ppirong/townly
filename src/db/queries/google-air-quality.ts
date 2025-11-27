import { db } from '@/db';
import { googleHourlyAirQualityData, googleDailyAirQualityData } from '@/db/schema';
import { eq, and, lte, gte } from 'drizzle-orm';
import type { NewGoogleHourlyAirQualityData, NewGoogleDailyAirQualityData } from '@/db/schema';

/**
 * 사용자별 Google 시간별 대기질 데이터 조회
 */
export async function getGoogleHourlyAirQualityByUser(
  clerkUserId: string | null,
  latitude: string,
  longitude: string,
  startTime?: Date,
  endTime?: Date
) {
  const baseConditions = [
    eq(googleHourlyAirQualityData.latitude, latitude),
    eq(googleHourlyAirQualityData.longitude, longitude)
  ];

  // clerkUserId가 있는 경우에만 조건에 추가
  if (clerkUserId) {
    baseConditions.push(eq(googleHourlyAirQualityData.clerkUserId, clerkUserId));
  }

  let query = db
    .select()
    .from(googleHourlyAirQualityData)
    .where(and(...baseConditions));

  if (startTime && endTime) {
    const timeConditions = [
      ...baseConditions,
      gte(googleHourlyAirQualityData.forecastDateTime, startTime),
      lte(googleHourlyAirQualityData.forecastDateTime, endTime)
    ];
    
    query = db
      .select()
      .from(googleHourlyAirQualityData)
      .where(and(...timeConditions));
  }

  return await query;
}

/**
 * 사용자별 Google 일별 대기질 데이터 조회
 */
export async function getGoogleDailyAirQualityByUser(
  clerkUserId: string | null,
  latitude: string,
  longitude: string,
  startDate?: string,
  endDate?: string
) {
  const baseConditions = [
    eq(googleDailyAirQualityData.latitude, latitude),
    eq(googleDailyAirQualityData.longitude, longitude)
  ];

  // clerkUserId가 있는 경우에만 조건에 추가
  if (clerkUserId) {
    baseConditions.push(eq(googleDailyAirQualityData.clerkUserId, clerkUserId));
  }

  let query = db
    .select()
    .from(googleDailyAirQualityData)
    .where(and(...baseConditions));

  if (startDate && endDate) {
    const dateConditions = [
      ...baseConditions,
      gte(googleDailyAirQualityData.forecastDate, startDate),
      lte(googleDailyAirQualityData.forecastDate, endDate)
    ];
    
    query = db
      .select()
      .from(googleDailyAirQualityData)
      .where(and(...dateConditions));
  }

  return await query;
}

/**
 * Google 시간별 대기질 데이터 생성
 */
export async function createGoogleHourlyAirQualityData(data: NewGoogleHourlyAirQualityData) {
  const result = await db
    .insert(googleHourlyAirQualityData)
    .values(data)
    .returning();
  
  return result[0];
}

/**
 * Google 시간별 대기질 데이터 upsert (삽입 또는 업데이트)
 */
export async function upsertGoogleHourlyAirQualityData(data: NewGoogleHourlyAirQualityData) {
  // 기존 데이터 확인
  const existing = await db
    .select()
    .from(googleHourlyAirQualityData)
    .where(eq(googleHourlyAirQualityData.cacheKey, data.cacheKey!))
    .limit(1);

  if (existing.length > 0) {
    // 업데이트
    const result = await db
      .update(googleHourlyAirQualityData)
      .set({ ...data, lastUpdated: new Date() })
      .where(eq(googleHourlyAirQualityData.cacheKey, data.cacheKey!))
      .returning();
    return result[0];
  } else {
    // 삽입
    const result = await db
      .insert(googleHourlyAirQualityData)
      .values(data)
      .returning();
    return result[0];
  }
}

/**
 * Google 일별 대기질 데이터 생성
 */
export async function createGoogleDailyAirQualityData(data: NewGoogleDailyAirQualityData) {
  const result = await db
    .insert(googleDailyAirQualityData)
    .values(data)
    .returning();
  
  return result[0];
}

/**
 * 사용자의 이전 시간별 대기질 데이터 삭제
 */
export async function deleteOldGoogleHourlyAirQualityData(
  clerkUserId: string,
  latitude: string,
  longitude: string,
  beforeTime: Date
) {
  // clerkUserId가 nullable이므로 조건을 조정
  const whereConditions = [
    eq(googleHourlyAirQualityData.latitude, latitude),
    eq(googleHourlyAirQualityData.longitude, longitude),
    lte(googleHourlyAirQualityData.forecastDateTime, beforeTime)
  ];

  // clerkUserId가 있는 경우에만 조건에 추가
  if (clerkUserId) {
    whereConditions.push(eq(googleHourlyAirQualityData.clerkUserId, clerkUserId));
  }

  const result = await db
    .delete(googleHourlyAirQualityData)
    .where(and(...whereConditions))
    .returning();
  
  return result;
}

/**
 * 사용자의 이전 일별 대기질 데이터 삭제
 */
export async function deleteOldGoogleDailyAirQualityData(
  clerkUserId: string | null,
  latitude: string,
  longitude: string,
  beforeDate: string
) {
  const whereConditions = [
    eq(googleDailyAirQualityData.latitude, latitude),
    eq(googleDailyAirQualityData.longitude, longitude),
    lte(googleDailyAirQualityData.forecastDate, beforeDate)
  ];

  // clerkUserId가 있는 경우에만 조건에 추가
  if (clerkUserId) {
    whereConditions.push(eq(googleDailyAirQualityData.clerkUserId, clerkUserId));
  }

  const result = await db
    .delete(googleDailyAirQualityData)
    .where(and(...whereConditions))
    .returning();
  
  return result;
}

/**
 * 만료된 Google 대기질 데이터 삭제
 */
export async function deleteExpiredGoogleAirQualityData() {
  const now = new Date();
  
  const hourlyResult = await db
    .delete(googleHourlyAirQualityData)
    .where(lte(googleHourlyAirQualityData.expiresAt, now))
    .returning();
  
  const dailyResult = await db
    .delete(googleDailyAirQualityData)
    .where(lte(googleDailyAirQualityData.expiresAt, now))
    .returning();
  
  return {
    deletedHourly: hourlyResult.length,
    deletedDaily: dailyResult.length
  };
}
