/**
 * 사용자 패턴 분석 서비스
 * 사용자의 날씨 조회 패턴을 분석하여 개인화된 TTL 및 캐시 전략 제공
 */

import { db } from '@/db';
import { hourlyWeatherData, dailyWeatherData } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import type { UserPattern, TimePreference } from './smart-ttl-manager';

/**
 * 사용자 활동 패턴
 */
export interface UserActivityPattern {
  userId: string;
  totalQueries: number;
  dailyAverage: number;
  weeklyPattern: Record<string, number>; // 요일별 패턴
  hourlyPattern: Record<string, number>; // 시간대별 패턴
  locationPreferences: Array<{
    locationKey: string;
    count: number;
    percentage: number;
  }>;
  timePreference: TimePreference;
  lastActivity: Date;
  activityLevel: 'low' | 'medium' | 'high' | 'very_high';
  consistencyScore: number; // 0-100, 일정한 패턴인지
}

/**
 * 시스템 전체 패턴 통계
 */
export interface SystemPatternStats {
  totalActiveUsers: number;
  averageQueriesPerUser: number;
  peakHours: number[];
  peakDays: string[];
  mostPopularLocations: Array<{
    locationKey: string;
    userCount: number;
    totalQueries: number;
  }>;
  userSegmentation: {
    lowActivity: number;
    mediumActivity: number;
    highActivity: number;
    veryHighActivity: number;
  };
}

/**
 * TTL 최적화 추천
 */
export interface TTLOptimizationRecommendation {
  userId: string;
  currentEfficiency: number;
  recommendedTTLMultiplier: number;
  recommendations: string[];
  potentialSavings: {
    storageReduction: number; // 저장 공간 절약 %
    apiCallReduction: number; // API 호출 절약 %
  };
  priority: 'low' | 'medium' | 'high';
}

export class UserPatternAnalyzer {

  /**
   * 사용자별 상세 활동 패턴 분석
   */
  static async analyzeUserActivityPattern(clerkUserId: string): Promise<UserActivityPattern> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // 최근 30일간 활동 데이터 수집
      const activities = await db
        .select({
          locationKey: hourlyWeatherData.locationKey,
          createdAt: hourlyWeatherData.createdAt,
          forecastDateTime: hourlyWeatherData.forecastDateTime,
        })
        .from(hourlyWeatherData)
        .where(and(
          eq(hourlyWeatherData.clerkUserId, clerkUserId),
          gte(hourlyWeatherData.createdAt, thirtyDaysAgo)
        ))
        .orderBy(desc(hourlyWeatherData.createdAt));

      const totalQueries = activities.length;
      const daysInPeriod = 30;
      const dailyAverage = totalQueries / daysInPeriod;

      // 요일별 패턴 분석
      const weeklyPattern = this.analyzeWeeklyPattern(activities);
      
      // 시간대별 패턴 분석
      const hourlyPattern = this.analyzeHourlyPattern(activities);
      
      // 위치 선호도 분석
      const locationPreferences = this.analyzeLocationPreferences(activities);
      
      // 시간 선호도 결정
      const timePreference = this.determineTimePreference(hourlyPattern);
      
      // 활동 수준 분류
      const activityLevel = this.classifyActivityLevel(dailyAverage);
      
      // 일관성 점수 계산
      const consistencyScore = this.calculateConsistencyScore(activities);

      return {
        userId: clerkUserId,
        totalQueries,
        dailyAverage: Math.round(dailyAverage * 100) / 100,
        weeklyPattern,
        hourlyPattern,
        locationPreferences,
        timePreference,
        lastActivity: activities.length > 0 ? new Date(activities[0].createdAt) : new Date(),
        activityLevel,
        consistencyScore,
      };
    } catch (error) {
      console.error('사용자 활동 패턴 분석 실패:', error);
      return this.getDefaultPattern(clerkUserId);
    }
  }

  /**
   * 요일별 패턴 분석
   */
  private static analyzeWeeklyPattern(activities: any[]): Record<string, number> {
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const pattern: Record<string, number> = {};
    
    weekdays.forEach(day => pattern[day] = 0);
    
    activities.forEach(activity => {
      const dayOfWeek = new Date(activity.createdAt).getDay();
      const dayName = weekdays[dayOfWeek];
      pattern[dayName]++;
    });

    return pattern;
  }

  /**
   * 시간대별 패턴 분석
   */
  private static analyzeHourlyPattern(activities: any[]): Record<string, number> {
    const pattern: Record<string, number> = {};
    
    // 0-23시 초기화
    for (let i = 0; i < 24; i++) {
      pattern[i.toString()] = 0;
    }
    
    activities.forEach(activity => {
      const hour = new Date(activity.createdAt).getHours();
      pattern[hour.toString()]++;
    });

    return pattern;
  }

  /**
   * 위치 선호도 분석
   */
  private static analyzeLocationPreferences(activities: any[]): Array<{
    locationKey: string;
    count: number;
    percentage: number;
  }> {
    const locationCounts: Record<string, number> = {};
    
    activities.forEach(activity => {
      locationCounts[activity.locationKey] = (locationCounts[activity.locationKey] || 0) + 1;
    });

    const total = activities.length;
    return Object.entries(locationCounts)
      .map(([locationKey, count]) => ({
        locationKey,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // 상위 5개 위치
  }

  /**
   * 시간 선호도 결정
   */
  private static determineTimePreference(hourlyPattern: Record<string, number>): TimePreference {
    const morningHours = [6, 7, 8, 9, 10, 11];
    const eveningHours = [18, 19, 20, 21, 22, 23];
    
    const morningTotal = morningHours.reduce((sum, hour) => sum + (hourlyPattern[hour.toString()] || 0), 0);
    const eveningTotal = eveningHours.reduce((sum, hour) => sum + (hourlyPattern[hour.toString()] || 0), 0);
    const totalQueries = Object.values(hourlyPattern).reduce((sum, count) => sum + count, 0);
    
    if (totalQueries === 0) return 'all_day';
    
    const morningRatio = morningTotal / totalQueries;
    const eveningRatio = eveningTotal / totalQueries;
    
    if (morningRatio > 0.4 && morningRatio > eveningRatio * 1.5) return 'morning';
    if (eveningRatio > 0.4 && eveningRatio > morningRatio * 1.5) return 'evening';
    
    return 'all_day';
  }

  /**
   * 활동 수준 분류
   */
  private static classifyActivityLevel(dailyAverage: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (dailyAverage >= 15) return 'very_high';
    if (dailyAverage >= 8) return 'high';
    if (dailyAverage >= 3) return 'medium';
    return 'low';
  }

  /**
   * 일관성 점수 계산 (패턴의 규칙성)
   */
  private static calculateConsistencyScore(activities: any[]): number {
    if (activities.length < 7) return 0; // 최소 7일 데이터 필요
    
    // 일별 조회 수의 표준편차를 이용한 일관성 측정
    const dailyCounts: Record<string, number> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.createdAt).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    
    const counts = Object.values(dailyCounts);
    const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / counts.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 표준편차가 낮을수록 일관성이 높음 (0-100 점수로 변환)
    const consistencyScore = Math.max(0, 100 - (standardDeviation / average) * 100);
    
    return Math.round(consistencyScore);
  }

  /**
   * 기본 패턴 반환 (데이터 부족 시)
   */
  private static getDefaultPattern(clerkUserId: string): UserActivityPattern {
    return {
      userId: clerkUserId,
      totalQueries: 0,
      dailyAverage: 0,
      weeklyPattern: {},
      hourlyPattern: {},
      locationPreferences: [],
      timePreference: 'all_day',
      lastActivity: new Date(),
      activityLevel: 'low',
      consistencyScore: 0,
    };
  }

  /**
   * 시스템 전체 패턴 통계 분석
   */
  static async analyzeSystemPatterns(): Promise<SystemPatternStats> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      // 활성 사용자 수
      const activeUsers = await db
        .selectDistinct({ userId: hourlyWeatherData.clerkUserId })
        .from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.createdAt, thirtyDaysAgo));

      // 전체 쿼리 통계
      const totalQueries = await db
        .select({ count: sql<number>`count(*)` })
        .from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.createdAt, thirtyDaysAgo));

      // 시간대별 통계
      const hourlyStats = await db
        .select({
          hour: sql<number>`extract(hour from created_at)`,
          count: sql<number>`count(*)`
        })
        .from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.createdAt, thirtyDaysAgo))
        .groupBy(sql`extract(hour from created_at)`)
        .orderBy(sql`count(*) desc`);

      // 요일별 통계
      const dailyStats = await db
        .select({
          dayOfWeek: sql<number>`extract(dow from created_at)`,
          count: sql<number>`count(*)`
        })
        .from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.createdAt, thirtyDaysAgo))
        .groupBy(sql`extract(dow from created_at)`)
        .orderBy(sql`count(*) desc`);

      // 인기 위치 통계
      const locationStats = await db
        .select({
          locationKey: hourlyWeatherData.locationKey,
          userCount: sql<number>`count(distinct clerk_user_id)`,
          totalQueries: sql<number>`count(*)`
        })
        .from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.createdAt, thirtyDaysAgo))
        .groupBy(hourlyWeatherData.locationKey)
        .orderBy(sql`count(*) desc`)
        .limit(10);

      // 사용자 세분화
      const userActivityLevels = await this.analyzeUserSegmentation();

      const totalActiveUsers = activeUsers.length;
      const averageQueriesPerUser = totalActiveUsers > 0 ? 
        (totalQueries[0]?.count || 0) / totalActiveUsers : 0;

      const peakHours = hourlyStats.slice(0, 3).map(stat => stat.hour);
      const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      const peakDays = dailyStats.slice(0, 2).map(stat => dayNames[stat.dayOfWeek]);

      return {
        totalActiveUsers,
        averageQueriesPerUser: Math.round(averageQueriesPerUser * 100) / 100,
        peakHours,
        peakDays,
        mostPopularLocations: locationStats.map(stat => ({
          locationKey: stat.locationKey,
          userCount: stat.userCount,
          totalQueries: stat.totalQueries,
        })),
        userSegmentation: userActivityLevels,
      };
    } catch (error) {
      console.error('시스템 패턴 분석 실패:', error);
      return {
        totalActiveUsers: 0,
        averageQueriesPerUser: 0,
        peakHours: [],
        peakDays: [],
        mostPopularLocations: [],
        userSegmentation: {
          lowActivity: 0,
          mediumActivity: 0,
          highActivity: 0,
          veryHighActivity: 0,
        },
      };
    }
  }

  /**
   * 사용자 세분화 분석
   */
  private static async analyzeUserSegmentation(): Promise<{
    lowActivity: number;
    mediumActivity: number;
    highActivity: number;
    veryHighActivity: number;
  }> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const userActivityCounts = await db
        .select({
          userId: hourlyWeatherData.clerkUserId,
          queryCount: sql<number>`count(*)`
        })
        .from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.createdAt, thirtyDaysAgo))
        .groupBy(hourlyWeatherData.clerkUserId);

      const segmentation = {
        lowActivity: 0,      // 0-89 queries (0-3/day)
        mediumActivity: 0,   // 90-239 queries (3-8/day)
        highActivity: 0,     // 240-449 queries (8-15/day)
        veryHighActivity: 0, // 450+ queries (15+/day)
      };

      userActivityCounts.forEach(user => {
        const dailyAverage = user.queryCount / 30;
        
        if (dailyAverage >= 15) segmentation.veryHighActivity++;
        else if (dailyAverage >= 8) segmentation.highActivity++;
        else if (dailyAverage >= 3) segmentation.mediumActivity++;
        else segmentation.lowActivity++;
      });

      return segmentation;
    } catch (error) {
      console.error('사용자 세분화 분석 실패:', error);
      return {
        lowActivity: 0,
        mediumActivity: 0,
        highActivity: 0,
        veryHighActivity: 0,
      };
    }
  }

  /**
   * TTL 최적화 추천 생성
   */
  static async generateTTLOptimizationRecommendation(clerkUserId: string): Promise<TTLOptimizationRecommendation> {
    try {
      const pattern = await this.analyzeUserActivityPattern(clerkUserId);
      const recommendations: string[] = [];
      let recommendedTTLMultiplier = 1.0;
      let priority: 'low' | 'medium' | 'high' = 'medium';
      
      // 활동 수준 기반 추천
      switch (pattern.activityLevel) {
        case 'very_high':
          recommendedTTLMultiplier = 2.5;
          priority = 'high';
          recommendations.push('매우 활발한 사용자로 TTL을 2.5배 연장하여 캐시 효율성을 극대화합니다.');
          recommendations.push('자주 조회하는 위치의 데이터를 더 오래 보존합니다.');
          break;
        case 'high':
          recommendedTTLMultiplier = 2.0;
          priority = 'high';
          recommendations.push('활발한 사용자로 TTL을 2배 연장하여 API 호출을 줄입니다.');
          break;
        case 'medium':
          recommendedTTLMultiplier = 1.5;
          priority = 'medium';
          recommendations.push('중간 수준 사용자로 TTL을 1.5배 연장합니다.');
          break;
        case 'low':
          recommendedTTLMultiplier = 1.0;
          priority = 'low';
          recommendations.push('저빈도 사용자로 표준 TTL을 적용합니다.');
          break;
      }

      // 일관성 기반 추천
      if (pattern.consistencyScore > 70) {
        recommendedTTLMultiplier *= 1.2;
        recommendations.push('규칙적인 사용 패턴으로 TTL을 추가 연장합니다.');
      }

      // 위치 선호도 기반 추천
      if (pattern.locationPreferences.length > 0) {
        const topLocation = pattern.locationPreferences[0];
        if (topLocation.percentage > 50) {
          recommendations.push(`주요 위치(${topLocation.percentage}% 사용)의 데이터 보존 기간을 연장합니다.`);
        }
      }

      // 시간 선호도 기반 추천
      if (pattern.timePreference !== 'all_day') {
        recommendations.push(`${pattern.timePreference === 'morning' ? '아침' : '저녁'} 시간대에 최적화된 캐시 전략을 적용합니다.`);
      }

      // 잠재적 절약 효과 계산
      const potentialSavings = {
        storageReduction: Math.max(0, (recommendedTTLMultiplier - 1) * 15), // TTL 연장으로 인한 중복 저장 감소
        apiCallReduction: Math.max(0, (recommendedTTLMultiplier - 1) * 25), // 캐시 히트 증가로 인한 API 호출 감소
      };

      // 현재 효율성 계산 (0-100)
      const currentEfficiency = Math.min(100, 
        pattern.consistencyScore * 0.4 + 
        Math.min(pattern.dailyAverage * 10, 40) + 
        (pattern.locationPreferences.length > 0 ? 20 : 0)
      );

      return {
        userId: clerkUserId,
        currentEfficiency: Math.round(currentEfficiency),
        recommendedTTLMultiplier: Math.round(recommendedTTLMultiplier * 100) / 100,
        recommendations,
        potentialSavings: {
          storageReduction: Math.round(potentialSavings.storageReduction),
          apiCallReduction: Math.round(potentialSavings.apiCallReduction),
        },
        priority,
      };
    } catch (error) {
      console.error('TTL 최적화 추천 생성 실패:', error);
      return {
        userId: clerkUserId,
        currentEfficiency: 50,
        recommendedTTLMultiplier: 1.0,
        recommendations: ['기본 TTL 정책을 적용합니다.'],
        potentialSavings: { storageReduction: 0, apiCallReduction: 0 },
        priority: 'low',
      };
    }
  }

  /**
   * 모든 활성 사용자에 대한 최적화 추천 배치 생성
   */
  static async generateBatchOptimizationRecommendations(): Promise<TTLOptimizationRecommendation[]> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const activeUsers = await db
        .selectDistinct({ userId: hourlyWeatherData.clerkUserId })
        .from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.createdAt, thirtyDaysAgo));

      const recommendations = await Promise.all(
        activeUsers
          .filter(user => user.userId) // null이 아닌 userId만 필터링
          .map(user => this.generateTTLOptimizationRecommendation(user.userId!))
      );

      // 우선순위 순으로 정렬
      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    } catch (error) {
      console.error('배치 최적화 추천 생성 실패:', error);
      return [];
    }
  }
}

// 싱글톤 인스턴스
export const userPatternAnalyzer = new UserPatternAnalyzer();
