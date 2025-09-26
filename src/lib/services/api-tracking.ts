/**
 * API 호출 추적 및 통계 서비스
 * AccuWeather, AirKorea 등 외부 API 호출을 기록하고 일일 한도를 관리합니다.
 */

import { db } from '@/db';
import { apiCallLogs, dailyApiStats } from '@/db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import type { NewApiCallLog, NewDailyApiStats } from '@/db/schema';

export type ApiProvider = 'accuweather' | 'airkorea' | 'openai' | 'kakao';

export interface ApiCallRecord {
  provider: ApiProvider;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  httpStatus?: number;
  responseTime?: number;
  isSuccessful?: boolean;
  userId?: string;
  requestParams?: Record<string, any>;
  errorMessage?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface DailyApiStatsData {
  date: string;
  provider: ApiProvider;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  endpointStats: Record<string, any>;
  hourlyStats: Array<{ hour: number; calls: number }>;
}

class ApiTrackingService {
  /**
   * API 호출 기록
   */
  async recordApiCall(record: ApiCallRecord): Promise<void> {
    try {
      const now = new Date();
      const callDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const apiCallData: NewApiCallLog = {
        apiProvider: record.provider,
        apiEndpoint: record.endpoint,
        httpMethod: record.method || 'GET',
        callDate,
        callTime: now,
        httpStatus: record.httpStatus,
        responseTime: record.responseTime,
        isSuccessful: record.isSuccessful ?? true,
        userId: record.userId,
        requestParams: record.requestParams ? JSON.stringify(record.requestParams) : null,
        errorMessage: record.errorMessage,
        userAgent: record.userAgent,
        ipAddress: record.ipAddress,
      };

      await db.insert(apiCallLogs).values(apiCallData);
      
      // 일일 통계 업데이트
      await this.updateDailyStats(record.provider, callDate);
      
    } catch (error) {
      console.error('API 호출 기록 실패:', error);
      // 기록 실패가 메인 로직에 영향을 주지 않도록 에러를 던지지 않음
    }
  }

  /**
   * 특정 날짜의 API 호출 수 조회
   */
  async getDailyCallCount(provider: ApiProvider, date?: string): Promise<number> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const result = await db
        .select({ count: count() })
        .from(apiCallLogs)
        .where(
          and(
            eq(apiCallLogs.apiProvider, provider),
            eq(apiCallLogs.callDate, targetDate)
          )
        );

      return result[0]?.count || 0;
    } catch (error) {
      console.error('일일 호출 수 조회 실패:', error);
      return 0;
    }
  }

  /**
   * 현재 날짜의 API 호출 수 조회
   */
  async getTodayCallCount(provider: ApiProvider): Promise<number> {
    return this.getDailyCallCount(provider);
  }

  /**
   * 특정 API 제공자의 일일 통계 조회
   */
  async getDailyStats(provider: ApiProvider, date?: string): Promise<DailyApiStatsData | null> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const stats = await db
        .select()
        .from(dailyApiStats)
        .where(
          and(
            eq(dailyApiStats.apiProvider, provider),
            eq(dailyApiStats.statDate, targetDate)
          )
        )
        .limit(1);

      if (stats.length === 0) return null;

      const stat = stats[0];
      return {
        date: stat.statDate,
        provider: stat.apiProvider as ApiProvider,
        totalCalls: stat.totalCalls,
        successfulCalls: stat.successfulCalls,
        failedCalls: stat.failedCalls,
        avgResponseTime: stat.avgResponseTime || 0,
        maxResponseTime: stat.maxResponseTime || 0,
        minResponseTime: stat.minResponseTime || 0,
        endpointStats: stat.endpointStats as Record<string, any> || {},
        hourlyStats: stat.hourlyStats as Array<{ hour: number; calls: number }> || [],
      };
    } catch (error) {
      console.error('일일 통계 조회 실패:', error);
      return null;
    }
  }

  /**
   * 최근 N일간의 API 호출 통계 조회
   */
  async getRecentStats(provider: ApiProvider, days: number = 7): Promise<DailyApiStatsData[]> {
    try {
      const stats = await db
        .select()
        .from(dailyApiStats)
        .where(eq(dailyApiStats.apiProvider, provider))
        .orderBy(desc(dailyApiStats.statDate))
        .limit(days);

      return stats.map(stat => ({
        date: stat.statDate,
        provider: stat.apiProvider as ApiProvider,
        totalCalls: stat.totalCalls,
        successfulCalls: stat.successfulCalls,
        failedCalls: stat.failedCalls,
        avgResponseTime: stat.avgResponseTime || 0,
        maxResponseTime: stat.maxResponseTime || 0,
        minResponseTime: stat.minResponseTime || 0,
        endpointStats: stat.endpointStats as Record<string, any> || {},
        hourlyStats: stat.hourlyStats as Array<{ hour: number; calls: number }> || [],
      }));
    } catch (error) {
      console.error('최근 통계 조회 실패:', error);
      return [];
    }
  }

  /**
   * 일일 통계 업데이트
   */
  private async updateDailyStats(provider: ApiProvider, date: string): Promise<void> {
    try {
      // 현재 날짜의 통계 계산
      const stats = await db
        .select({
          totalCalls: count(),
          successfulCalls: sql<number>`COUNT(CASE WHEN ${apiCallLogs.isSuccessful} = true THEN 1 END)`,
          failedCalls: sql<number>`COUNT(CASE WHEN ${apiCallLogs.isSuccessful} = false THEN 1 END)`,
          avgResponseTime: sql<number>`AVG(${apiCallLogs.responseTime})`,
          maxResponseTime: sql<number>`MAX(${apiCallLogs.responseTime})`,
          minResponseTime: sql<number>`MIN(${apiCallLogs.responseTime})`,
        })
        .from(apiCallLogs)
        .where(
          and(
            eq(apiCallLogs.apiProvider, provider),
            eq(apiCallLogs.callDate, date)
          )
        );

      const stat = stats[0];
      
      // 시간대별 통계 계산
      const hourlyStats = await db
        .select({
          hour: sql<number>`EXTRACT(HOUR FROM ${apiCallLogs.callTime})`,
          calls: count(),
        })
        .from(apiCallLogs)
        .where(
          and(
            eq(apiCallLogs.apiProvider, provider),
            eq(apiCallLogs.callDate, date)
          )
        )
        .groupBy(sql`EXTRACT(HOUR FROM ${apiCallLogs.callTime})`);

      // 엔드포인트별 통계 계산
      const endpointStats = await db
        .select({
          endpoint: apiCallLogs.apiEndpoint,
          calls: count(),
          successful: sql<number>`COUNT(CASE WHEN ${apiCallLogs.isSuccessful} = true THEN 1 END)`,
        })
        .from(apiCallLogs)
        .where(
          and(
            eq(apiCallLogs.apiProvider, provider),
            eq(apiCallLogs.callDate, date)
          )
        )
        .groupBy(apiCallLogs.apiEndpoint);

      const endpointStatsObj = endpointStats.reduce((acc, ep) => {
        acc[ep.endpoint] = {
          calls: ep.calls,
          successful: ep.successful,
          failed: ep.calls - ep.successful,
        };
        return acc;
      }, {} as Record<string, any>);

      const dailyStatData: NewDailyApiStats = {
        statDate: date,
        apiProvider: provider,
        totalCalls: stat.totalCalls,
        successfulCalls: stat.successfulCalls,
        failedCalls: stat.failedCalls,
        avgResponseTime: Math.round(stat.avgResponseTime) || null,
        maxResponseTime: stat.maxResponseTime || null,
        minResponseTime: stat.minResponseTime || null,
        endpointStats: JSON.stringify(endpointStatsObj),
        hourlyStats: JSON.stringify(hourlyStats),
        lastUpdated: new Date(),
        isFinalized: false,
      };

      // 기존 통계가 있으면 업데이트, 없으면 삽입
      const existing = await db
        .select({ id: dailyApiStats.id })
        .from(dailyApiStats)
        .where(
          and(
            eq(dailyApiStats.apiProvider, provider),
            eq(dailyApiStats.statDate, date)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(dailyApiStats)
          .set({
            ...dailyStatData,
            updatedAt: new Date(),
          })
          .where(eq(dailyApiStats.id, existing[0].id));
      } else {
        await db.insert(dailyApiStats).values(dailyStatData);
      }

    } catch (error) {
      console.error('일일 통계 업데이트 실패:', error);
    }
  }

  /**
   * 일일 통계 초기화 (자정에 실행)
   */
  async resetDailyStats(): Promise<void> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 어제 통계를 확정 상태로 변경
      await db
        .update(dailyApiStats)
        .set({
          isFinalized: true,
          lastUpdated: new Date(),
        })
        .where(eq(dailyApiStats.statDate, yesterdayStr));

      console.log(`✅ 일일 API 통계 초기화 완료: ${yesterdayStr}`);
    } catch (error) {
      console.error('일일 통계 초기화 실패:', error);
    }
  }

  /**
   * 특정 API 제공자의 한도 확인
   */
  async checkApiLimit(provider: ApiProvider, dailyLimit: number): Promise<{
    currentCalls: number;
    limit: number;
    remaining: number;
    percentage: number;
    canMakeRequest: boolean;
  }> {
    const currentCalls = await this.getTodayCallCount(provider);
    const remaining = Math.max(0, dailyLimit - currentCalls);
    const percentage = Math.round((currentCalls / dailyLimit) * 100);

    return {
      currentCalls,
      limit: dailyLimit,
      remaining,
      percentage,
      canMakeRequest: currentCalls < dailyLimit,
    };
  }

  /**
   * 모든 API 제공자의 오늘 호출 통계
   */
  async getAllTodayStats(): Promise<Record<ApiProvider, DailyApiStatsData | null>> {
    const providers: ApiProvider[] = ['accuweather', 'airkorea', 'openai', 'kakao'];
    const stats: Record<string, DailyApiStatsData | null> = {};

    await Promise.all(
      providers.map(async (provider) => {
        stats[provider] = await this.getDailyStats(provider);
      })
    );

    return stats as Record<ApiProvider, DailyApiStatsData | null>;
  }
}

export const apiTrackingService = new ApiTrackingService();
