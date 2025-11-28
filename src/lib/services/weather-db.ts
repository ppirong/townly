/**
 * 날씨 데이터 데이터베이스 저장 및 조회 서비스
 * 마스터 규칙: DB 접근은 db/queries를 통해서만, DTO 매퍼 필수 사용
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
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';
import * as weatherQueries from '@/db/queries/weather';
import { 
  mapHourlyWeatherForClient,
  mapDailyWeatherForClient,
  mapCacheStatsForClient,
  type ClientHourlyWeatherData,
  type ClientDailyWeatherData,
  type ClientCacheStats
} from '@/lib/dto/weather-dto-mappers';
import { 
  locationSchema,
  coordinateLocationSchema,
  hourlyWeatherInputSchema,
  dailyWeatherInputSchema,
  type LocationInput
} from '@/lib/schemas/weather-schemas';
import type { 
  HourlyWeatherData, 
  DailyWeatherData, 
  DailyWeatherResponse 
} from './weather';
import { formatKoreanDate } from '@/lib/utils/timezone';

export class WeatherDatabaseService {

  /**
   * 위치 키를 데이터베이스에 저장
   * 마스터 규칙: Zod 검증 + db/queries 사용
   */
  async saveLocationKey(
    locationKey: string,
    locationName: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    try {
      // Zod 검증 (좌표 전용 스키마 사용)
      const validatedData = coordinateLocationSchema.parse({
        locationName,
        latitude, // 숫자 그대로 전달 (스키마에서 변환)
        longitude, // 숫자 그대로 전달 (스키마에서 변환)
        locationKey,
      });

      // db/queries를 통한 저장 (TTL 포함)
      const ttlMinutes = 60; // 1시간 TTL
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      
      await weatherQueries.saveLocationKey({
        locationName: validatedData.locationName,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        locationKey: validatedData.locationKey,
        cacheKey: `locationKey:${validatedData.locationKey}`,
        expiresAt,
        searchType: 'api', // API를 통해 저장된 위치
      });

    } catch (error) {
      console.error('위치 키 DB 저장 실패:', error);
      // 저장 실패해도 서비스는 계속 동작하도록 에러를 던지지 않음
    }
  }

  /**
   * 위치 키를 데이터베이스에서 조회
   * 마스터 규칙: db/queries 사용
   */
  async getLocationKey(locationKey: string): Promise<string | null> {
    try {
      const result = await weatherQueries.getLocationKeyByCacheKey(locationKey);

      if (result.length > 0) {
        return result[0].locationKey;
      }

      return null;
    } catch (error) {
      console.error('위치 키 DB 조회 실패:', error);
      return null;
    }
  }

  /**
   * 시간별 날씨 데이터를 데이터베이스에 저장
   */
  async saveHourlyWeatherData(
    locationKey: string,
    locationName: string,
    weatherData: HourlyWeatherData[],
    cacheKey: string,
    ttlMinutes: number = 10,
    latitude: number,
    longitude: number,
    clerkUserId: string // 필수 파라미터로 변경
  ): Promise<void> {
    if (!clerkUserId) {
      throw new Error('시간별 날씨 데이터 저장 시 사용자 ID(clerkUserId)는 필수입니다.');
    }
    
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      
      const dbRecords: NewHourlyWeatherData[] = weatherData.map(data => {
        // weather.ts에서 이미 KST로 변환된 timestamp를 그대로 사용
        // 절대 추가 변환하지 않음!
        
        // ✅ data.timestamp에서 직접 날짜와 시간 추출 (추가 변환 없이)
        // data.timestamp 형태: "2025-10-07T21:00:00.000Z" (이미 KST 시간)
        const forecastDate = data.timestamp.split('T')[0]; // YYYY-MM-DD
        const forecastHour = parseInt(data.timestamp.split('T')[1].split(':')[0], 10); // KST 시간
        const kstDateTime = new Date(data.timestamp); // KST 시간으로 저장
        
        
        return {
          clerkUserId,
          locationKey,
          locationName: `${latitude},${longitude}`, // 좌표로 대체
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          forecastDate, // 환경 무관 KST 기준 날짜
          forecastHour, // 환경 무관 KST 기준 시간 (0-23)
          forecastDatetime: kstDateTime, // KST로 저장
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
          cacheKey,
          expiresAt,
        };
      });

      // 마스터 규칙: db/queries 사용
      await weatherQueries.deleteHourlyWeatherByCacheKey(cacheKey);

      if (dbRecords.length > 0) {
        await weatherQueries.saveHourlyWeatherData(dbRecords);
      }

    } catch (error) {
      console.error('시간별 날씨 DB 저장 실패:', error);
      // 저장 실패해도 서비스는 계속 동작하도록 에러를 던지지 않음
    }
  }

  /**
   * 기존 시간별 날씨 데이터에 대해 임베딩 생성 (캐시에서 가져온 데이터용)
   * 현재 벡터 임베딩 기능은 비활성화되어 있습니다.
   */
  async generateEmbeddingsForExistingHourlyData(
    weatherData: HourlyWeatherData[],
    locationName: string,
    clerkUserId: string
  ): Promise<void> {
    // 벡터 임베딩 기능 비활성화됨
    return;
  }

  /**
   * 시간별 날씨 데이터를 데이터베이스에서 조회
   */
  async getHourlyWeatherData(cacheKey: string): Promise<HourlyWeatherData[] | null> {
    try {
      const results = await db
        .select()
        .from(hourlyWeatherData)
        .where(
          and(
            eq(hourlyWeatherData.cacheKey, cacheKey),
            gte(hourlyWeatherData.expiresAt, new Date())
          )
        )
        .orderBy(hourlyWeatherData.forecastDatetime);

      if (results.length > 0) {
        
        // DB 데이터를 API 형식으로 변환
        return results.map(record => {
          // ✅ forecast_datetime에서 직접 시간 추출 (정확한 KST 시간)
          // PostgreSQL timestamp는 시간대 정보 없이 저장되므로 UTC 메서드로 KST 값 추출
          const hour = record.forecastDatetime.getUTCHours();
          
          return {
            location: record.locationName,
            timestamp: record.forecastDatetime.toISOString(),
            hour: `${hour.toString().padStart(2, '0')}시`, // forecast_datetime에서 추출한 정확한 시간
            forecastDate: record.forecastDatetime.toISOString().split('T')[0], // YYYY-MM-DD
            forecastHour: hour, // 0-23
            temperature: record.temperature,
            conditions: record.conditions,
            weatherIcon: record.weatherIcon,
            humidity: record.humidity || 0,
            precipitation: parseFloat(record.precipitation || '0'),
            precipitationProbability: record.precipitationProbability || 0,
            rainProbability: record.rainProbability || 0,
            windSpeed: record.windSpeed || 0,
            units: record.units as 'metric' | 'imperial',
          };
        });
      }

      return null;
    } catch (error) {
      console.error('시간별 날씨 DB 조회 실패:', error);
      return null;
    }
  }

  /**
   * 일별 날씨 데이터를 데이터베이스에 저장
   */
  async saveDailyWeatherData(
    locationKey: string,
    locationName: string,
    weatherResponse: DailyWeatherResponse,
    days: number,
    units: string,
    cacheKey: string,
    ttlMinutes: number = 30,
    latitude: number,
    longitude: number,
    clerkUserId: string // 필수 파라미터로 변경
  ): Promise<void> {
    if (!clerkUserId) {
      throw new Error('일별 날씨 데이터 저장 시 사용자 ID(clerkUserId)는 필수입니다.');
    }
    
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      
      const dbRecords: NewDailyWeatherData[] = weatherResponse.dailyForecasts.map(data => {
        // UTC 시간을 한국 시간으로 변환
        return {
          clerkUserId,
          locationKey,
          locationName: `${latitude},${longitude}`, // 좌표로 대체
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          forecastDate: formatKoreanDate(data.timestamp, true), // 한국 시간 기준 날짜
          dayOfWeek: data.dayOfWeek, // 이미 한국 시간 기준으로 계산됨
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
          cacheKey,
          expiresAt,
        };
      });

      // 마스터 규칙: db/queries 사용
      await weatherQueries.deleteDailyWeatherByCacheKey(cacheKey);

      if (dbRecords.length > 0) {
        await weatherQueries.saveDailyWeatherData(dbRecords);
      }

    } catch (error) {
      console.error('일별 날씨 DB 저장 실패:', error);
      // 저장 실패해도 서비스는 계속 동작하도록 에러를 던지지 않음
    }
  }

  /**
   * 기존 일별 날씨 데이터에 대해 임베딩 생성 (캐시에서 가져온 데이터용)
   * 현재 벡터 임베딩 기능은 비활성화되어 있습니다.
   */
  async generateEmbeddingsForExistingDailyData(
    weatherResponse: DailyWeatherResponse,
    locationName: string,
    clerkUserId: string
  ): Promise<void> {
    // 벡터 임베딩 기능 비활성화됨
    return;
  }

  /**
   * 일별 날씨 데이터를 데이터베이스에서 조회
   */
  async getDailyWeatherData(cacheKey: string): Promise<DailyWeatherResponse | null> {
    try {
      const results = await db
        .select()
        .from(dailyWeatherData)
        .where(
          and(
            eq(dailyWeatherData.cacheKey, cacheKey),
            gte(dailyWeatherData.expiresAt, new Date())
          )
        )
        .orderBy(dailyWeatherData.forecastDate);

      if (results.length > 0) {
        
        // DB 데이터를 API 형식으로 변환
        const dailyForecasts: DailyWeatherData[] = results.map(record => ({
          location: record.locationName,
          timestamp: new Date(record.forecastDate + 'T00:00:00').toISOString(),
          date: record.forecastDate,
          dayOfWeek: record.dayOfWeek,
          temperature: record.temperature,
          highTemp: record.highTemp,
          lowTemp: record.lowTemp,
          conditions: record.conditions,
          weatherIcon: record.weatherIcon,
          humidity: 0, // 일별 예보에는 습도 정보 제한적
          precipitation: 0, // 일별 예보에는 실제 강수량 제한적
          precipitationProbability: record.precipitationProbability || 0,
          rainProbability: record.rainProbability || 0,
          windSpeed: 0, // 일별 예보에는 바람 속도 제한적
          units: record.units as 'metric' | 'imperial',
          dayWeather: record.dayWeather as any,
          nightWeather: record.nightWeather as any,
        }));

        return {
          headline: results[0].headline as any,
          dailyForecasts,
        };
      }

      return null;
    } catch (error) {
      console.error('일별 날씨 DB 조회 실패:', error);
      return null;
    }
  }

  /**
   * 만료된 캐시 데이터 정리
   * 마스터 규칙: db/queries 사용
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date();
      
      // 마스터 규칙: db/queries를 통한 삭제
      const hourlyDeleted = await weatherQueries.deleteExpiredHourlyWeatherData(now);
      const dailyDeleted = await weatherQueries.deleteExpiredDailyWeatherData(now);
      const locationDeleted = await weatherQueries.deleteExpiredLocationKeys(now);

    } catch (error) {
      console.error('날씨 캐시 정리 실패:', error);
    }
  }

  /**
   * 특정 위치의 모든 캐시 데이터 강제 삭제 (만료 시간 관계없이)
   */
  async forceDeleteLocationCaches(locationCacheKey: string): Promise<void> {
    try {
      // 1. 해당 위치의 위치 키 정보 조회
      const locationKeyData = await db
        .select()
        .from(weatherLocationKeys)
        .where(eq(weatherLocationKeys.cacheKey, locationCacheKey));

      if (locationKeyData.length === 0) {
        return;
      }

      const locationKey = locationKeyData[0].locationKey;
      
      // 2. 해당 위치키와 관련된 모든 캐시 삭제
      // 시간별 날씨 데이터 삭제 (캐시키에 locationKey가 포함된 모든 데이터)
      const hourlyDeleted = await db
        .delete(hourlyWeatherData)
        .where(sql`${hourlyWeatherData.cacheKey} LIKE '%' || ${locationKey} || '%'`);

      // 일별 날씨 데이터 삭제 (캐시키에 locationKey가 포함된 모든 데이터)
      const dailyDeleted = await db
        .delete(dailyWeatherData)
        .where(sql`${dailyWeatherData.cacheKey} LIKE '%' || ${locationKey} || '%'`);

      // 위치 키 자체도 삭제
      const locationDeleted = await db
        .delete(weatherLocationKeys)
        .where(eq(weatherLocationKeys.locationKey, locationKey));

    } catch (error) {
      console.error('특정 위치 캐시 강제 삭제 실패:', error);
      throw error;
    }
  }

  /**
   * 캐시 통계 조회
   */
  /**
   * 캐시 통계 조회
   * 마스터 규칙: db/queries 사용 + DTO 매퍼 적용
   */
  async getCacheStats(): Promise<ClientCacheStats> {
    try {
      const stats = await weatherQueries.getCacheStats();
      return mapCacheStatsForClient(stats);
    } catch (error) {
      console.error('캐시 통계 조회 실패:', error);
      return mapCacheStatsForClient({
        hourlyRecords: 0,
        dailyRecords: 0,
        locationKeys: 0,
      });
    }
  }
}

// 싱글톤 인스턴스
export const weatherDbService = new WeatherDatabaseService();
