import { db } from '@/db';
import { apiCallLogs, dailyApiStats } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import type { NewApiCallLog, NewDailyApiStats } from '@/db/schema';

/**
 * API 호출 로그 생성
 */
export async function createApiCallLog(data: NewApiCallLog) {
  const result = await db
    .insert(apiCallLogs)
    .values(data)
    .returning();
  
  return result[0];
}

/**
 * 특정 날짜의 API 호출 로그 조회
 */
export async function getApiCallLogsByDate(
  apiProvider: string,
  date: string
) {
  return await db
    .select()
    .from(apiCallLogs)
    .where(
      and(
        eq(apiCallLogs.apiProvider, apiProvider),
        eq(apiCallLogs.callDate, date)
      )
    );
}

/**
 * 특정 기간의 API 호출 로그 조회
 */
export async function getApiCallLogsByDateRange(
  apiProvider: string,
  startDate: string,
  endDate: string
) {
  return await db
    .select()
    .from(apiCallLogs)
    .where(
      and(
        eq(apiCallLogs.apiProvider, apiProvider),
        gte(apiCallLogs.callDate, startDate),
        lte(apiCallLogs.callDate, endDate)
      )
    );
}

/**
 * API 사용량 통계 조회 (특정 날짜)
 */
export async function getApiUsageStatsByDate(
  apiProvider: string,
  date?: string
) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const stats = await db
    .select()
    .from(apiCallLogs)
    .where(
      and(
        eq(apiCallLogs.apiProvider, apiProvider),
        eq(apiCallLogs.callDate, targetDate)
      )
    );

  const totalCalls = stats.length;
  const successfulCalls = stats.filter(s => s.httpStatus && s.httpStatus >= 200 && s.httpStatus < 300).length;
  const failedCalls = totalCalls - successfulCalls;
  const avgResponseTime = totalCalls > 0 
    ? Math.round(stats.reduce((sum, s) => sum + (s.responseTime || 0), 0) / totalCalls)
    : 0;

  return {
    totalCalls,
    successfulCalls,
    failedCalls,
    avgResponseTime,
    date: targetDate
  };
}

/**
 * 일별 API 통계 생성
 */
export async function createDailyApiStats(data: NewDailyApiStats) {
  const result = await db
    .insert(dailyApiStats)
    .values(data)
    .returning();
  
  return result[0];
}

/**
 * 일별 API 통계 조회
 */
export async function getDailyApiStats(
  apiProvider: string,
  statDate: string
) {
  const result = await db
    .select()
    .from(dailyApiStats)
    .where(
      and(
        eq(dailyApiStats.apiProvider, apiProvider),
        eq(dailyApiStats.statDate, statDate)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

/**
 * 일별 API 통계 업데이트
 */
export async function updateDailyApiStats(
  apiProvider: string,
  statDate: string,
  data: Partial<Omit<NewDailyApiStats, 'apiProvider' | 'statDate'>>
) {
  const result = await db
    .update(dailyApiStats)
    .set({
      ...data,
      lastUpdated: new Date(),
      updatedAt: new Date()
    })
    .where(
      and(
        eq(dailyApiStats.apiProvider, apiProvider),
        eq(dailyApiStats.statDate, statDate)
      )
    )
    .returning();
  
  return result[0] || null;
}

/**
 * 일별 API 통계 upsert
 */
export async function upsertDailyApiStats(data: NewDailyApiStats) {
  const existing = await getDailyApiStats(data.apiProvider, data.statDate);
  
  if (existing) {
    return await updateDailyApiStats(data.apiProvider, data.statDate, data);
  } else {
    return await createDailyApiStats(data);
  }
}
