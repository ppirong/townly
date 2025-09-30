/**
 * 스마트 TTL과 사용자별 관리를 지원하는 개선된 날씨 데이터베이스 서비스
 * 기존 데이터를 보존하면서 사용자별 독립적인 데이터 관리 제공
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
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { 
  HourlyWeatherData, 
  DailyWeatherData, 
  DailyWeatherResponse 
} from './weather';
import { weatherVectorDBService } from './weather-vector-db';
import { formatKoreanDate } from '@/lib/utils/timezone';
import { SmartTTLManager, type TTLCalculationResult } from './smart-ttl-manager';
import { weatherCache } from './weather-cache';

export class SmartWeatherDatabaseService {

  /**
   * 스마트 TTL을 적용한 시간별 날씨 데이터 저장
   * 기존 데이터를 보존하면서 사용자별 독립적 관리
   */
  async saveHourlyWeatherDataSmart(
    locationKey: string,
    locationName: string,
    weatherData: HourlyWeatherData[],
    latitude: number,
    longitude: number,
    clerkUserId: string
  ): Promise<{
    saved: number;
    updated: number;
    skipped: number;
    ttlInfo: TTLCalculationResult[];
  }> {
    if (!clerkUserId) {
      throw new Error('시간별 날씨 데이터 저장 시 사용자 ID(clerkUserId)는 필수입니다.');
    }
    
    try {
      let savedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const ttlInfo: TTLCalculationResult[] = [];

      // 1. 사용자별 캐시 키 생성
      const baseCacheKey = weatherCache.getHourlyWeatherCacheKey(locationKey, 'metric');
      const userCacheKey = weatherCache.getUserSpecificCacheKey(baseCacheKey, clerkUserId);

      // 2. 만료된 사용자 데이터만 정리
      await this.cleanupExpiredUserData(clerkUserId, 'hourly');

      // 3. 각 시간별 데이터 처리
      for (const data of weatherData) {
        const forecastTime = new Date(data.timestamp);
        
        // 스마트 TTL 계산
        const ttlResult = await SmartTTLManager.calculatePersonalizedTTL(
          clerkUserId,
          'hourly',
          locationKey,
          forecastTime
        );
        ttlInfo.push(ttlResult);

        const expiresAt = new Date(Date.now() + ttlResult.personalizedTTL * 60 * 1000);
        const forecastDate = formatKoreanDate(data.timestamp, true);
        const forecastHour = forecastTime.getHours();

        // 기존 데이터 확인
        const existing = await db
          .select()
          .from(hourlyWeatherData)
          .where(and(
            eq(hourlyWeatherData.clerkUserId, clerkUserId),
            eq(hourlyWeatherData.forecastDate, forecastDate),
            eq(hourlyWeatherData.forecastHour, forecastHour),
            eq(hourlyWeatherData.locationKey, locationKey)
          ))
          .limit(1);

        const record: NewHourlyWeatherData = {
          clerkUserId,
          locationKey,
          locationName: `${latitude},${longitude}`,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          forecastDate,
          forecastHour,
          forecastDateTime: new Date(data.timestamp),
          temperature: data.temperature,
          conditions: data.conditions,
          weatherIcon: data.weatherIcon || null,
          humidity: data.humidity || null,
          precipitation: data.precipitation?.toString() || null,
          precipitationProbability: data.precipitationProbability || null,
          rainProbability: data.rainProbability || null,
          windSpeed: data.windSpeed || null,
          units: data.units,
          rawData: data,
          cacheKey: userCacheKey,
          expiresAt,
        };

        if (existing.length === 0) {
          // 새 데이터 삽입
          const result = await db.insert(hourlyWeatherData).values(record).returning();
          savedCount++;

          // 벡터 임베딩 생성
          if (result.length > 0) {
            try {
              await weatherVectorDBService.saveWeatherEmbedding(
                'hourly',
                locationName,
                {
                  ...data,
                  forecastDate,
                  forecastHour,
                },
                result[0].id,
                clerkUserId
              );
            } catch (embeddingError) {
              console.error('⚠️ 시간별 날씨 벡터 임베딩 생성 실패:', embeddingError);
            }
          }

          console.log(`📝 새로운 시간별 데이터 추가: ${forecastDate} ${forecastHour}시 (TTL: ${ttlResult.personalizedTTL}분)`);
        } else {
          // 기존 데이터가 만료 예정이거나 더 신선한 정보가 있는 경우 업데이트
          const existingData = existing[0];
          const shouldUpdate = 
            new Date(existingData.expiresAt).getTime() < Date.now() + (60 * 60 * 1000) || // 1시간 내 만료 예정
            new Date(existingData.updatedAt).getTime() < Date.now() - (30 * 60 * 1000); // 30분 이상 오래된 데이터

          if (shouldUpdate) {
            await db
              .update(hourlyWeatherData)
              .set({
                temperature: record.temperature,
                conditions: record.conditions,
                weatherIcon: record.weatherIcon,
                humidity: record.humidity,
                precipitation: record.precipitation,
                precipitationProbability: record.precipitationProbability,
                rainProbability: record.rainProbability,
                windSpeed: record.windSpeed,
                rawData: record.rawData,
                expiresAt: record.expiresAt,
                updatedAt: new Date(),
              })
              .where(eq(hourlyWeatherData.id, existingData.id));
            
            updatedCount++;
            console.log(`🔄 기존 시간별 데이터 업데이트: ${forecastDate} ${forecastHour}시 (TTL: ${ttlResult.personalizedTTL}분)`);
          } else {
            skippedCount++;
            console.log(`⏭️ 시간별 데이터 스킵 (최신 데이터 존재): ${forecastDate} ${forecastHour}시`);
          }
        }
      }

      console.log(`✅ 시간별 날씨 데이터 처리 완료: 저장 ${savedCount}개, 업데이트 ${updatedCount}개, 스킵 ${skippedCount}개`);
      
      return {
        saved: savedCount,
        updated: updatedCount,
        skipped: skippedCount,
        ttlInfo,
      };
    } catch (error) {
      console.error('스마트 시간별 날씨 DB 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 스마트 TTL을 적용한 일별 날씨 데이터 저장
   */
  async saveDailyWeatherDataSmart(
    locationKey: string,
    locationName: string,
    weatherResponse: DailyWeatherResponse,
    days: number,
    units: string,
    latitude: number,
    longitude: number,
    clerkUserId: string
  ): Promise<{
    saved: number;
    updated: number;
    skipped: number;
    ttlInfo: TTLCalculationResult[];
  }> {
    if (!clerkUserId) {
      throw new Error('일별 날씨 데이터 저장 시 사용자 ID(clerkUserId)는 필수입니다.');
    }
    
    try {
      let savedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const ttlInfo: TTLCalculationResult[] = [];

      // 1. 사용자별 캐시 키 생성
      const baseCacheKey = weatherCache.getDailyWeatherCacheKey(locationKey, days, 'metric');
      const userCacheKey = weatherCache.getUserSpecificCacheKey(baseCacheKey, clerkUserId);

      // 2. 만료된 사용자 데이터만 정리
      await this.cleanupExpiredUserData(clerkUserId, 'daily');

      // 3. 각 일별 데이터 처리
      for (const data of weatherResponse.dailyForecasts) {
        const forecastTime = new Date(data.timestamp);
        
        // 스마트 TTL 계산
        const ttlResult = await SmartTTLManager.calculatePersonalizedTTL(
          clerkUserId,
          'daily',
          locationKey,
          forecastTime
        );
        ttlInfo.push(ttlResult);

        const expiresAt = new Date(Date.now() + ttlResult.personalizedTTL * 60 * 1000);
        const forecastDate = formatKoreanDate(data.timestamp, true);

        // 기존 데이터 확인
        const existing = await db
          .select()
          .from(dailyWeatherData)
          .where(and(
            eq(dailyWeatherData.clerkUserId, clerkUserId),
            eq(dailyWeatherData.forecastDate, forecastDate),
            eq(dailyWeatherData.locationKey, locationKey)
          ))
          .limit(1);

        const record: NewDailyWeatherData = {
          clerkUserId,
          locationKey,
          locationName: `${latitude},${longitude}`,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          forecastDate,
          dayOfWeek: data.dayOfWeek,
          temperature: data.temperature,
          highTemp: data.highTemp,
          lowTemp: data.lowTemp,
          conditions: data.conditions,
          weatherIcon: data.weatherIcon || null,
          precipitationProbability: data.precipitationProbability || null,
          rainProbability: data.rainProbability || null,
          dayWeather: data.dayWeather || null,
          nightWeather: data.nightWeather || null,
          headline: weatherResponse.headline || null,
          units,
          forecastDays: days,
          rawData: data,
          cacheKey: userCacheKey,
          expiresAt,
        };

        if (existing.length === 0) {
          // 새 데이터 삽입
          const result = await db.insert(dailyWeatherData).values(record).returning();
          savedCount++;

          // 벡터 임베딩 생성
          if (result.length > 0) {
            try {
              await weatherVectorDBService.saveWeatherEmbedding(
                'daily',
                locationName,
                {
                  ...data,
                  forecastDate,
                  dayOfWeek: data.dayOfWeek,
                },
                result[0].id,
                clerkUserId
              );
            } catch (embeddingError) {
              console.error('⚠️ 일별 날씨 벡터 임베딩 생성 실패:', embeddingError);
            }
          }

          console.log(`📝 새로운 일별 데이터 추가: ${forecastDate} (TTL: ${ttlResult.personalizedTTL}분)`);
        } else {
          // 기존 데이터 업데이트 로직
          const existingData = existing[0];
          const shouldUpdate = 
            new Date(existingData.expiresAt).getTime() < Date.now() + (2 * 60 * 60 * 1000) || // 2시간 내 만료 예정
            new Date(existingData.updatedAt).getTime() < Date.now() - (60 * 60 * 1000); // 1시간 이상 오래된 데이터

          if (shouldUpdate) {
            await db
              .update(dailyWeatherData)
              .set({
                temperature: record.temperature,
                highTemp: record.highTemp,
                lowTemp: record.lowTemp,
                conditions: record.conditions,
                weatherIcon: record.weatherIcon,
                precipitationProbability: record.precipitationProbability,
                rainProbability: record.rainProbability,
                dayWeather: record.dayWeather,
                nightWeather: record.nightWeather,
                headline: record.headline,
                rawData: record.rawData,
                expiresAt: record.expiresAt,
                updatedAt: new Date(),
              })
              .where(eq(dailyWeatherData.id, existingData.id));
            
            updatedCount++;
            console.log(`🔄 기존 일별 데이터 업데이트: ${forecastDate} (TTL: ${ttlResult.personalizedTTL}분)`);
          } else {
            skippedCount++;
            console.log(`⏭️ 일별 데이터 스킵 (최신 데이터 존재): ${forecastDate}`);
          }
        }
      }

      console.log(`✅ 일별 날씨 데이터 처리 완료: 저장 ${savedCount}개, 업데이트 ${updatedCount}개, 스킵 ${skippedCount}개`);
      
      return {
        saved: savedCount,
        updated: updatedCount,
        skipped: skippedCount,
        ttlInfo,
      };
    } catch (error) {
      console.error('스마트 일별 날씨 DB 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자별 만료된 데이터만 정리
   */
  private async cleanupExpiredUserData(
    clerkUserId: string, 
    dataType: 'hourly' | 'daily'
  ): Promise<number> {
    try {
      const now = new Date();
      let deletedCount = 0;

      if (dataType === 'hourly') {
        const result = await db
          .delete(hourlyWeatherData)
          .where(and(
            eq(hourlyWeatherData.clerkUserId, clerkUserId),
            lte(hourlyWeatherData.expiresAt, now)
          ));
        deletedCount = result.rowCount || 0;
      } else {
        const result = await db
          .delete(dailyWeatherData)
          .where(and(
            eq(dailyWeatherData.clerkUserId, clerkUserId),
            lte(dailyWeatherData.expiresAt, now)
          ));
        deletedCount = result.rowCount || 0;
      }

      if (deletedCount > 0) {
        console.log(`🧹 사용자 ${clerkUserId}의 만료된 ${dataType} 데이터 ${deletedCount}개 정리 완료`);
      }

      return deletedCount;
    } catch (error) {
      console.error(`사용자별 만료 데이터 정리 실패 (${dataType}):`, error);
      return 0;
    }
  }

  /**
   * 사용자별 날씨 데이터 조회 (TTL 고려)
   */
  async getUserWeatherData(
    clerkUserId: string,
    dataType: 'hourly' | 'daily',
    locationKey?: string,
    limit: number = 24
  ): Promise<any[]> {
    try {
      const now = new Date();
      
      const baseConditions = [
        eq(dataType === 'hourly' ? hourlyWeatherData.clerkUserId : dailyWeatherData.clerkUserId, clerkUserId),
        gte(dataType === 'hourly' ? hourlyWeatherData.expiresAt : dailyWeatherData.expiresAt, now)
      ];

      if (locationKey) {
        baseConditions.push(
          eq(dataType === 'hourly' ? hourlyWeatherData.locationKey : dailyWeatherData.locationKey, locationKey)
        );
      }

      if (dataType === 'hourly') {
        return await db
          .select()
          .from(hourlyWeatherData)
          .where(and(...baseConditions))
          .orderBy(desc(hourlyWeatherData.forecastDateTime))
          .limit(limit);
      } else {
        return await db
          .select()
          .from(dailyWeatherData)
          .where(and(...baseConditions))
          .orderBy(desc(dailyWeatherData.forecastDate))
          .limit(limit);
      }
    } catch (error) {
      console.error('사용자별 날씨 데이터 조회 실패:', error);
      return [];
    }
  }

  /**
   * 사용자별 캐시 통계
   */
  async getUserCacheStats(clerkUserId: string): Promise<{
    hourlyCount: number;
    dailyCount: number;
    expiredHourly: number;
    expiredDaily: number;
    totalStorageUsed: number;
    averageTTL: {
      hourly: number;
      daily: number;
    };
  }> {
    try {
      const now = new Date();

      // 시간별 데이터 통계
      const hourlyStats = await db
        .select({
          total: sql<number>`count(*)`,
          expired: sql<number>`count(*) filter (where expires_at <= ${now})`,
          avgTTL: sql<number>`avg(extract(epoch from (expires_at - created_at)) / 60)`
        })
        .from(hourlyWeatherData)
        .where(eq(hourlyWeatherData.clerkUserId, clerkUserId));

      // 일별 데이터 통계
      const dailyStats = await db
        .select({
          total: sql<number>`count(*)`,
          expired: sql<number>`count(*) filter (where expires_at <= ${now})`,
          avgTTL: sql<number>`avg(extract(epoch from (expires_at - created_at)) / 60)`
        })
        .from(dailyWeatherData)
        .where(eq(dailyWeatherData.clerkUserId, clerkUserId));

      const hourlyData = hourlyStats[0] || { total: 0, expired: 0, avgTTL: 0 };
      const dailyData = dailyStats[0] || { total: 0, expired: 0, avgTTL: 0 };

      return {
        hourlyCount: hourlyData.total - hourlyData.expired,
        dailyCount: dailyData.total - dailyData.expired,
        expiredHourly: hourlyData.expired,
        expiredDaily: dailyData.expired,
        totalStorageUsed: (hourlyData.total - hourlyData.expired) + (dailyData.total - dailyData.expired),
        averageTTL: {
          hourly: Math.round(hourlyData.avgTTL || 0),
          daily: Math.round(dailyData.avgTTL || 0),
        },
      };
    } catch (error) {
      console.error('사용자별 캐시 통계 조회 실패:', error);
      return {
        hourlyCount: 0,
        dailyCount: 0,
        expiredHourly: 0,
        expiredDaily: 0,
        totalStorageUsed: 0,
        averageTTL: { hourly: 0, daily: 0 },
      };
    }
  }

  /**
   * 전체 시스템 TTL 최적화 통계
   */
  async getSystemOptimizationStats(): Promise<{
    totalUsers: number;
    averageUserCacheSize: number;
    totalCacheHits: number;
    storageEfficiency: number;
    optimizationScore: number;
  }> {
    try {
      const now = new Date();

      // 전체 사용자 수
      const userStats = await db
        .selectDistinct({ userId: hourlyWeatherData.clerkUserId })
        .from(hourlyWeatherData);

      // 캐시 효율성 통계
      const cacheStats = await db
        .select({
          totalItems: sql<number>`count(*)`,
          validItems: sql<number>`count(*) filter (where expires_at > ${now})`,
        })
        .from(hourlyWeatherData);

      const totalUsers = userStats.length;
      const cacheData = cacheStats[0] || { totalItems: 0, validItems: 0 };
      const storageEfficiency = cacheData.totalItems > 0 ? 
        (cacheData.validItems / cacheData.totalItems) * 100 : 100;

      return {
        totalUsers,
        averageUserCacheSize: totalUsers > 0 ? Math.round(cacheData.validItems / totalUsers) : 0,
        totalCacheHits: cacheData.validItems,
        storageEfficiency: Math.round(storageEfficiency * 100) / 100,
        optimizationScore: Math.min(100, Math.round(storageEfficiency + (totalUsers > 0 ? 20 : 0))),
      };
    } catch (error) {
      console.error('시스템 최적화 통계 조회 실패:', error);
      return {
        totalUsers: 0,
        averageUserCacheSize: 0,
        totalCacheHits: 0,
        storageEfficiency: 0,
        optimizationScore: 0,
      };
    }
  }
}

// 싱글톤 인스턴스
export const smartWeatherDbService = new SmartWeatherDatabaseService();
