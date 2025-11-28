/**
 * 스마트 TTL 관리 서비스 (배치 업데이트 최적화)
 * 6시, 12시, 18시, 24시 배치 업데이트 주기에 맞춘 고정 TTL 전략
 */

import { db } from '@/db';
import { hourlyWeatherData, dailyWeatherData } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * TTL 설정 상수 (배치 업데이트 기반)
 */
export const TTL_CONFIG = {
  // 배치 업데이트 주기 (6시간 고정)
  BATCH_INTERVAL_HOURS: 6,
  
  // 최대 TTL (다음 배치 + 버퍼)
  MAX_TTL_MINUTES: 6 * 60 + 30, // 6.5시간 (30분 안전 버퍼)
  
  // 최소 TTL (긴급 상황용)
  MIN_TTL_MINUTES: 30, // 30분
  
  // 위치 키: 7일 (거의 변하지 않음)
  LOCATION_KEY: 7 * 24 * 60, // 10080분
  
  // 벡터 임베딩: 30일 (AI 학습 데이터)
  WEATHER_EMBEDDING: 30 * 24 * 60, // 43200분
} as const;

export type DataType = 'hourly' | 'daily' | 'location' | 'embedding';
export type TimePreference = 'morning' | 'evening' | 'all_day';

/**
 * 사용자 패턴 분석 결과
 */
export interface UserPattern {
  frequencyScore: number;
  preferredLocations: string[];
  timePreference: TimePreference;
  totalQueries: number;
  avgQueriesPerDay: number;
  recentActivityDays: number;
}

/**
 * TTL 계산 결과
 */
export interface TTLCalculationResult {
  baseTTL: number;
  personalizedTTL: number;
  multiplier: number;
  reasoning: string[];
}

/**
 * 배치 업데이트 시간 (KST 기준)
 */
export const BATCH_HOURS = [0, 6, 12, 18] as const;

/**
 * 다음 배치 실행 시간 계산
 */
export function getNextBatchTime(currentTime: Date = new Date()): Date {
  const current = new Date(currentTime);
  const currentHour = current.getHours();
  
  // 현재 시간보다 큰 다음 배치 시간 찾기
  let nextBatchHour = BATCH_HOURS.find(h => h > currentHour);
  
  if (nextBatchHour === undefined) {
    // 오늘의 마지막 배치(18시)가 지났으면 다음날 0시
    nextBatchHour = 0;
    current.setDate(current.getDate() + 1);
  }
  
  current.setHours(nextBatchHour, 0, 0, 0);
  return current;
}

/**
 * 다음 배치까지 남은 시간 (분)
 */
export function getTimeUntilNextBatch(currentTime: Date = new Date()): number {
  const nextBatch = getNextBatchTime(currentTime);
  const diffMs = nextBatch.getTime() - currentTime.getTime();
  return Math.ceil(diffMs / (1000 * 60)); // 분 단위로 올림
}

/**
 * 배치 기반 TTL 계산 (고정 6시간 전략)
 */
export function calculateBatchBasedTTL(
  dataType: 'weather' | 'airquality' = 'weather'
): number {
  const minutesUntilNextBatch = getTimeUntilNextBatch();
  
  // 최소 30분 보장 (배치 직후에도 최소 캐시 유지)
  const ttl = Math.max(TTL_CONFIG.MIN_TTL_MINUTES, minutesUntilNextBatch);
  
  // 최대 6.5시간 제한 (다음 배치 + 안전 버퍼)
  return Math.min(TTL_CONFIG.MAX_TTL_MINUTES, ttl);
}

export class SmartTTLManager {
  
  /**
   * 기본 TTL 계산 (배치 기반)
   * @deprecated 배치 업데이트 방식에서는 calculateBatchBasedTTL 사용 권장
   */
  static calculateBaseTTL(dataType: DataType): number {
    switch (dataType) {
      case 'hourly':
      case 'daily':
        // 날씨 데이터는 배치 기반 TTL 사용
        return calculateBatchBasedTTL('weather');
      case 'location':
        return TTL_CONFIG.LOCATION_KEY;
      case 'embedding':
        return TTL_CONFIG.WEATHER_EMBEDDING;
      default:
        return 60; // 기본 1시간
    }
  }
  
  /**
   * 시간대별 동적 TTL 계산 (실시간성 고려)
   * @deprecated 배치 업데이트 방식에서는 사용되지 않음 (하위 호환성 유지)
   */
  static calculateDynamicTTL(dataType: 'hourly' | 'daily', forecastTime: Date): number {
    // 배치 업데이트 방식에서는 배치 기반 TTL 사용
    return calculateBatchBasedTTL('weather');
  }

  /**
   * 사용자별 접근 패턴 분석
   */
  static async analyzeUserPattern(clerkUserId: string): Promise<UserPattern> {
    try {
      // 최근 30일간 사용자 활동 분석
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const recentActivity = await db
        .select({
          locationKey: hourlyWeatherData.locationKey,
          createdAt: hourlyWeatherData.createdAt,
          forecastDatetime: hourlyWeatherData.forecastDatetime,
        })
        .from(hourlyWeatherData)
        .where(and(
          eq(hourlyWeatherData.clerkUserId, clerkUserId),
          gte(hourlyWeatherData.createdAt, thirtyDaysAgo)
        ));

      const totalQueries = recentActivity.length;
      const recentActivityDays = Math.max(1, Math.ceil((Date.now() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24)));
      const avgQueriesPerDay = totalQueries / recentActivityDays;
      const frequencyScore = avgQueriesPerDay;
      
      // 자주 조회하는 위치 추출
      const locationCounts = recentActivity.reduce((acc, item) => {
        acc[item.locationKey] = (acc[item.locationKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const preferredLocations = Object.entries(locationCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([location]) => location);

      // 시간 선호도 분석
      const hours = recentActivity.map(item => new Date(item.createdAt).getHours());
      const morningCount = hours.filter(h => h >= 6 && h < 12).length;
      const eveningCount = hours.filter(h => h >= 18 && h < 24).length;
      const totalCount = hours.length;
      
      let timePreference: TimePreference = 'all_day';
      if (totalCount > 0) {
        const morningRatio = morningCount / totalCount;
        const eveningRatio = eveningCount / totalCount;
        
        if (morningRatio > 0.4) timePreference = 'morning';
        else if (eveningRatio > 0.4) timePreference = 'evening';
      }

      return {
        frequencyScore,
        preferredLocations,
        timePreference,
        totalQueries,
        avgQueriesPerDay: Math.round(avgQueriesPerDay * 100) / 100,
        recentActivityDays,
      };
    } catch (error) {
      console.error('사용자 패턴 분석 실패:', error);
      // 기본값 반환
      return {
        frequencyScore: 1,
        preferredLocations: [],
        timePreference: 'all_day',
        totalQueries: 0,
        avgQueriesPerDay: 0,
        recentActivityDays: 30,
      };
    }
  }

  /**
   * 패턴 기반 개인화된 TTL 계산
   * @deprecated 배치 업데이트 방식에서는 calculateBatchUpdatePriority 사용 권장
   */
  static async calculatePersonalizedTTL(
    clerkUserId: string,
    dataType: 'hourly' | 'daily',
    locationKey: string,
    forecastTime?: Date
  ): Promise<TTLCalculationResult> {
    // 배치 방식에서는 고정 TTL 사용
    const baseTTL = calculateBatchBasedTTL('weather');
    
    return {
      baseTTL,
      personalizedTTL: baseTTL,
      multiplier: 1.0,
      reasoning: ['배치 업데이트 방식: 다음 배치 시간까지 고정 TTL 사용'],
    };
  }

  /**
   * 배치 업데이트 우선순위 계산 (새로운 방식)
   * TTL multiplier 대신 배치 우선순위 점수 반환
   */
  static async calculateBatchUpdatePriority(
    clerkUserId: string
  ): Promise<{ score: number; reasoning: string[] }> {
    const pattern = await this.analyzeUserPattern(clerkUserId);
    
    let score = 50; // 기본 점수
    const reasoning: string[] = [];

    // 1. 사용 빈도 (최대 +30점)
    if (pattern.avgQueriesPerDay > 10) {
      score += 30;
      reasoning.push('고빈도 사용자 (일 10회 이상): 최우선 업데이트');
    } else if (pattern.avgQueriesPerDay > 5) {
      score += 15;
      reasoning.push('중빈도 사용자 (일 5-10회): 우선 업데이트');
    } else if (pattern.avgQueriesPerDay > 2) {
      score += 8;
      reasoning.push('일반 사용자 (일 2-5회): 정상 우선순위');
    }

    // 2. 최근 활동성 (최대 +20점)
    if (pattern.recentActivityDays < 3) {
      score += 20;
      reasoning.push('최근 3일 이내 활동: 최우선 업데이트');
    } else if (pattern.recentActivityDays < 7) {
      score += 10;
      reasoning.push('최근 7일 이내 활동: 우선 업데이트');
    }

    // 3. 시간대 패턴 매칭 (최대 +10점)
    const currentHour = new Date().getHours();
    if (pattern.timePreference === 'morning' && currentHour >= 6 && currentHour < 12) {
      score += 10;
      reasoning.push('아침 시간대 선호 사용자: 현재 시간 최적화');
    } else if (pattern.timePreference === 'evening' && currentHour >= 18 && currentHour < 24) {
      score += 10;
      reasoning.push('저녁 시간대 선호 사용자: 현재 시간 최적화');
    }

    // 4. 활동 총량 (최대 +10점)
    if (pattern.totalQueries > 100) {
      score += 10;
      reasoning.push('활발한 사용자 (100회 이상): 우선 처리');
    } else if (pattern.totalQueries > 50) {
      score += 5;
      reasoning.push('활동적인 사용자 (50회 이상): 정상 우선순위');
    }

    return {
      score: Math.min(100, score),
      reasoning,
    };
  }

  /**
   * 사용자별 캐시 키 생성
   */
  static generateUserCacheKey(
    baseKey: string,
    clerkUserId: string,
    additionalSuffix?: string
  ): string {
    const userKey = `${baseKey}:user:${clerkUserId}`;
    return additionalSuffix ? `${userKey}:${additionalSuffix}` : userKey;
  }

  /**
   * TTL 최적화 권장사항 생성
   */
  static generateTTLRecommendations(pattern: UserPattern): {
    recommendations: string[];
    optimizationScore: number;
  } {
    const recommendations: string[] = [];
    let optimizationScore = 0;

    // 사용 빈도 분석
    if (pattern.frequencyScore > 5) {
      recommendations.push('고빈도 사용자로 분류되어 캐시 TTL이 자동으로 연장됩니다.');
      optimizationScore += 30;
    }

    // 선호 위치 분석
    if (pattern.preferredLocations.length > 0) {
      recommendations.push(`선호 위치 ${pattern.preferredLocations.length}곳의 데이터가 더 오래 캐시됩니다.`);
      optimizationScore += 25;
    }

    // 시간 패턴 분석
    if (pattern.timePreference !== 'all_day') {
      recommendations.push(`${pattern.timePreference === 'morning' ? '아침' : '저녁'} 시간대 최적화가 적용됩니다.`);
      optimizationScore += 20;
    }

    // 전체 활동 수준 분석
    if (pattern.totalQueries > 50) {
      recommendations.push('활발한 사용자로 분류되어 개인화된 캐시 최적화가 활성화됩니다.');
      optimizationScore += 25;
    } else if (pattern.totalQueries < 10) {
      recommendations.push('사용량이 적어 표준 캐시 정책이 적용됩니다.');
      optimizationScore += 10;
    }

    // 기본 추천사항
    if (recommendations.length === 0) {
      recommendations.push('현재 표준 TTL 정책이 적용되고 있습니다.');
      optimizationScore = 50; // 기본 점수
    }

    return {
      recommendations,
      optimizationScore: Math.min(100, optimizationScore),
    };
  }

  /**
   * TTL 성능 통계 조회
   */
  static async getTTLPerformanceStats(): Promise<{
    totalCachedItems: number;
    averageTTL: number;
    cacheHitRate: number;
    expiredItemsToday: number;
    storageEfficiency: number;
  }> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 전체 캐시된 아이템 수
      const totalItems = await db.select({ count: sql<number>`count(*)` })
        .from(hourlyWeatherData);

      // 아직 유효한 캐시 아이템 수
      const validItems = await db.select({ count: sql<number>`count(*)` })
        .from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.expiresAt, now));

      // 평균 TTL 계산 (분 단위)
      const avgTTLQuery = await db.select({
        avgTTL: sql<number>`AVG(EXTRACT(EPOCH FROM (expires_at - created_at)) / 60)`
      }).from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.expiresAt, now));

      // 오늘 만료된 아이템 수
      const expiredToday = await db.select({ count: sql<number>`count(*)` })
        .from(hourlyWeatherData)
        .where(and(
          gte(hourlyWeatherData.expiresAt, todayStart),
          lte(hourlyWeatherData.expiresAt, now)
        ));

      const totalCount = totalItems[0]?.count || 0;
      const validCount = validItems[0]?.count || 0;
      const avgTTL = avgTTLQuery[0]?.avgTTL || 0;
      const expiredCount = expiredToday[0]?.count || 0;

      const cacheHitRate = totalCount > 0 ? (validCount / totalCount) * 100 : 0;
      const storageEfficiency = totalCount > 0 ? (validCount / totalCount) * 100 : 100;

      return {
        totalCachedItems: totalCount,
        averageTTL: Math.round(avgTTL * 100) / 100,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        expiredItemsToday: expiredCount,
        storageEfficiency: Math.round(storageEfficiency * 100) / 100,
      };
    } catch (error) {
      console.error('TTL 성능 통계 조회 실패:', error);
      return {
        totalCachedItems: 0,
        averageTTL: 0,
        cacheHitRate: 0,
        expiredItemsToday: 0,
        storageEfficiency: 0,
      };
    }
  }
}

// 싱글톤 인스턴스
export const smartTTLManager = new SmartTTLManager();
