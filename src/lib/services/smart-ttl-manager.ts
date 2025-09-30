/**
 * 스마트 TTL 관리 서비스
 * 데이터 유형별, 시간별 동적 TTL 설정과 사용자별 TTL 관리
 */

import { db } from '@/db';
import { hourlyWeatherData, dailyWeatherData } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * TTL 설정 상수
 */
export const TTL_CONFIG = {
  // 시간별 날씨: 2시간 (실시간성 중요)
  HOURLY_WEATHER: 2 * 60, // 120분
  
  // 일별 날씨: 6시간 (하루 4번 갱신)
  DAILY_WEATHER: 6 * 60, // 360분
  
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

export class SmartTTLManager {
  
  /**
   * 기본 TTL 계산 (데이터 유형별)
   */
  static calculateBaseTTL(dataType: DataType): number {
    switch (dataType) {
      case 'hourly':
        return TTL_CONFIG.HOURLY_WEATHER;
      case 'daily':
        return TTL_CONFIG.DAILY_WEATHER;
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
   */
  static calculateDynamicTTL(dataType: 'hourly' | 'daily', forecastTime: Date): number {
    const now = new Date();
    const hoursDiff = Math.abs(forecastTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (dataType === 'hourly') {
      // 현재 시간에 가까울수록 짧은 TTL (더 자주 갱신 필요)
      if (hoursDiff <= 1) return 30; // 30분 - 현재/다음 시간
      if (hoursDiff <= 6) return 60; // 1시간 - 6시간 이내
      if (hoursDiff <= 24) return 120; // 2시간 - 24시간 이내
      return 180; // 3시간 - 그 이후
    }
    
    if (dataType === 'daily') {
      // 오늘/내일은 짧은 TTL, 먼 미래는 긴 TTL
      if (hoursDiff <= 24) return 180; // 3시간 - 오늘
      if (hoursDiff <= 72) return 360; // 6시간 - 3일 이내
      return 720; // 12시간 - 그 이후
    }
    
    return this.calculateBaseTTL(dataType);
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
          forecastDateTime: hourlyWeatherData.forecastDateTime,
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
   */
  static async calculatePersonalizedTTL(
    clerkUserId: string,
    dataType: 'hourly' | 'daily',
    locationKey: string,
    forecastTime?: Date
  ): Promise<TTLCalculationResult> {
    const pattern = await this.analyzeUserPattern(clerkUserId);
    const baseTTL = forecastTime ? 
      this.calculateDynamicTTL(dataType, forecastTime) : 
      this.calculateBaseTTL(dataType);

    let multiplier = 1;
    const reasoning: string[] = [];

    // 1. 사용 빈도 기반 조정
    if (pattern.frequencyScore > 10) {
      multiplier *= 2.0;
      reasoning.push('고빈도 사용자 (일 10회 이상): TTL 2배 연장');
    } else if (pattern.frequencyScore > 5) {
      multiplier *= 1.5;
      reasoning.push('중빈도 사용자 (일 5-10회): TTL 1.5배 연장');
    } else if (pattern.frequencyScore > 2) {
      multiplier *= 1.2;
      reasoning.push('일반 사용자 (일 2-5회): TTL 1.2배 연장');
    } else {
      reasoning.push('저빈도 사용자: 기본 TTL 적용');
    }

    // 2. 선호 위치 기반 조정
    if (pattern.preferredLocations.includes(locationKey)) {
      multiplier *= 1.3;
      reasoning.push('선호 위치: TTL 1.3배 추가 연장');
    }

    // 3. 시간 선호도 기반 조정
    const currentHour = new Date().getHours();
    if (pattern.timePreference === 'morning' && currentHour >= 6 && currentHour < 12) {
      multiplier *= 1.2;
      reasoning.push('아침 시간대 선호 사용자의 아침 조회: TTL 1.2배 연장');
    } else if (pattern.timePreference === 'evening' && currentHour >= 18 && currentHour < 24) {
      multiplier *= 1.2;
      reasoning.push('저녁 시간대 선호 사용자의 저녁 조회: TTL 1.2배 연장');
    }

    // 4. 최대/최소 TTL 제한
    const personalizedTTL = Math.round(baseTTL * multiplier);
    const maxTTL = dataType === 'hourly' ? 6 * 60 : 24 * 60; // 최대 6시간/24시간
    const minTTL = dataType === 'hourly' ? 30 : 60; // 최소 30분/1시간
    
    const finalTTL = Math.max(minTTL, Math.min(maxTTL, personalizedTTL));
    
    if (finalTTL !== personalizedTTL) {
      reasoning.push(`TTL 범위 제한 적용: ${personalizedTTL}분 → ${finalTTL}분`);
    }

    return {
      baseTTL,
      personalizedTTL: finalTTL,
      multiplier: Math.round(multiplier * 100) / 100,
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
