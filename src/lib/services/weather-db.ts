/**
 * 날씨 데이터 데이터베이스 저장 및 조회 서비스
 * AccuWeather API 응답을 데이터베이스에 캐시하여 API 호출을 줄이고 성능을 향상시킵니다.
 */

import { db } from '@/db';
import { 
  hourlyWeatherData, 
  dailyWeatherData, 
  weatherLocationKeys,
  type NewHourlyWeatherData,
  type NewDailyWeatherData, 
  type NewWeatherLocationKey,
  type HourlyWeatherData as DBHourlyWeatherData,
  type DailyWeatherData as DBDailyWeatherData,
  type WeatherLocationKey as DBWeatherLocationKey
} from '@/db/schema';
import { eq, and, gte, lte, desc, count } from 'drizzle-orm';
import type { 
  HourlyWeatherData, 
  DailyWeatherData, 
  DailyWeatherResponse 
} from './weather';
import { weatherVectorDBService } from './weather-vector-db';
import { utcToKst, formatKoreanDate } from '@/lib/utils/timezone';

export class WeatherDatabaseService {

  /**
   * 위치 키를 데이터베이스에 저장
   */
  async saveLocationKey(
    locationKey: string,
    cacheKey: string,
    searchType: 'name' | 'coordinates' = 'name',
    ttlMinutes: number = 1440, // 24시간
    locationName?: string,
    latitude?: number,
    longitude?: number,
    rawLocationData?: any
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      
      const newLocationKey: NewWeatherLocationKey = {
        locationName: locationName || null,
        latitude: latitude?.toString() || null,
        longitude: longitude?.toString() || null,
        locationKey,
        searchType,
        rawLocationData: rawLocationData || null,
        cacheKey,
        expiresAt,
      };

      // 기존 캐시 키가 있으면 업데이트, 없으면 삽입
      await db.insert(weatherLocationKeys)
        .values(newLocationKey)
        .onConflictDoUpdate({
          target: weatherLocationKeys.cacheKey,
          set: {
            locationKey,
            expiresAt,
            updatedAt: new Date(),
          }
        });

      console.log('🗄️ 위치 키 DB 저장:', { cacheKey, locationKey });
    } catch (error) {
      console.error('위치 키 DB 저장 실패:', error);
      // 저장 실패해도 서비스는 계속 동작하도록 에러를 던지지 않음
    }
  }

  /**
   * 위치 키를 데이터베이스에서 조회
   */
  async getLocationKey(cacheKey: string): Promise<string | null> {
    try {
      const result = await db
        .select()
        .from(weatherLocationKeys)
        .where(
          and(
            eq(weatherLocationKeys.cacheKey, cacheKey),
            gte(weatherLocationKeys.expiresAt, new Date())
          )
        )
        .limit(1);

      if (result.length > 0) {
        console.log('🎯 위치 키 DB 캐시 적중:', cacheKey);
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
    latitude?: number,
    longitude?: number,
    clerkUserId?: string
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      
      const dbRecords: NewHourlyWeatherData[] = weatherData.map(data => {
        // weather.ts에서 이미 KST로 변환된 timestamp를 그대로 사용
        // 절대 추가 변환하지 않음!
        const kstDateTime = new Date(data.timestamp);
        
        // 디버깅: 첫 3개 레코드의 시간 확인
        const dataIndex = weatherData.indexOf(data);
        if (dataIndex < 3) {
          console.log(`📅 DB 저장 ${dataIndex}:`);
          console.log(`  - timestamp (KST): ${data.timestamp}`);
          console.log(`  - forecastDate: ${kstDateTime.toISOString().split('T')[0]}`);
          console.log(`  - forecastHour: ${kstDateTime.getHours()}`);
        }
        
        return {
          clerkUserId: clerkUserId || null,
          locationKey,
          locationName,
          latitude: latitude?.toString() || null,
          longitude: longitude?.toString() || null,
          forecastDate: kstDateTime.toISOString().split('T')[0], // KST 기준 날짜
          forecastHour: kstDateTime.getHours(), // KST 기준 시간 (0-23)
          forecastDateTime: kstDateTime, // KST로 저장
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

      // 기존 데이터 삭제 후 새 데이터 삽입
      await db.delete(hourlyWeatherData)
        .where(eq(hourlyWeatherData.cacheKey, cacheKey));

      if (dbRecords.length > 0) {
        const results = await db.insert(hourlyWeatherData).values(dbRecords).returning();
        
        // 사용자별 날씨 데이터인 경우 벡터 임베딩 생성
        if (clerkUserId && results.length > 0) {
          try {
            console.log('🔗 시간별 날씨 데이터 벡터 임베딩 생성 시작...');
            
            const embeddingPromises = weatherData.map(async (data, index) => {
              const dbRecord = results[index];
              return await weatherVectorDBService.saveWeatherEmbedding(
                'hourly',
                locationName,
                {
                  ...data,
                  forecastDate: dbRecord.forecastDate,
                  forecastHour: dbRecord.forecastHour,
                },
                dbRecord.id,
                clerkUserId
              );
            });
            
            await Promise.all(embeddingPromises);
            console.log('✅ 시간별 날씨 벡터 임베딩 생성 완료');
          } catch (embeddingError) {
            console.error('⚠️ 시간별 날씨 벡터 임베딩 생성 실패 (데이터 저장은 성공):', embeddingError);
          }
        }
      }

      console.log('🗄️ 시간별 날씨 DB 저장:', { cacheKey, count: dbRecords.length });
    } catch (error) {
      console.error('시간별 날씨 DB 저장 실패:', error);
      // 저장 실패해도 서비스는 계속 동작하도록 에러를 던지지 않음
    }
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
        .orderBy(hourlyWeatherData.forecastDateTime);

      if (results.length > 0) {
        console.log('🎯 시간별 날씨 DB 캐시 적중:', { cacheKey, count: results.length });
        
        // DB 데이터를 API 형식으로 변환
        return results.map(record => ({
          location: record.locationName,
          timestamp: record.forecastDateTime.toISOString(),
          hour: record.forecastDateTime.toLocaleTimeString('ko-KR', { hour: '2-digit', hour12: false }),
          temperature: record.temperature,
          conditions: record.conditions,
          weatherIcon: record.weatherIcon,
          humidity: record.humidity || 0,
          precipitation: parseFloat(record.precipitation || '0'),
          precipitationProbability: record.precipitationProbability || 0,
          rainProbability: record.rainProbability || 0,
          windSpeed: record.windSpeed || 0,
          units: record.units as 'metric' | 'imperial',
        }));
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
    latitude?: number,
    longitude?: number,
    clerkUserId?: string
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      
      const dbRecords: NewDailyWeatherData[] = weatherResponse.dailyForecasts.map(data => {
        // UTC 시간을 한국 시간으로 변환
        return {
          clerkUserId: clerkUserId || null,
          locationKey,
          locationName,
          latitude: latitude?.toString() || null,
          longitude: longitude?.toString() || null,
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

      // 기존 데이터 삭제 후 새 데이터 삽입
      await db.delete(dailyWeatherData)
        .where(eq(dailyWeatherData.cacheKey, cacheKey));

      if (dbRecords.length > 0) {
        const results = await db.insert(dailyWeatherData).values(dbRecords).returning();
        
        // 사용자별 날씨 데이터인 경우 벡터 임베딩 생성
        if (clerkUserId && results.length > 0) {
          try {
            console.log('🔗 일별 날씨 데이터 벡터 임베딩 생성 시작...');
            
            const embeddingPromises = weatherResponse.dailyForecasts.map(async (data, index) => {
              const dbRecord = results[index];
              return await weatherVectorDBService.saveWeatherEmbedding(
                'daily',
                locationName,
                {
                  ...data,
                  forecastDate: dbRecord.forecastDate,
                  dayOfWeek: dbRecord.dayOfWeek,
                },
                dbRecord.id,
                clerkUserId
              );
            });
            
            await Promise.all(embeddingPromises);
            console.log('✅ 일별 날씨 벡터 임베딩 생성 완료');
          } catch (embeddingError) {
            console.error('⚠️ 일별 날씨 벡터 임베딩 생성 실패 (데이터 저장은 성공):', embeddingError);
          }
        }
      }

      console.log('🗄️ 일별 날씨 DB 저장:', { cacheKey, count: dbRecords.length });
    } catch (error) {
      console.error('일별 날씨 DB 저장 실패:', error);
      // 저장 실패해도 서비스는 계속 동작하도록 에러를 던지지 않음
    }
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
        console.log('🎯 일별 날씨 DB 캐시 적중:', { cacheKey, count: results.length });
        
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
   */
  async cleanupExpiredData(): Promise<void> {
    try {
      const now = new Date();
      
      // 만료된 시간별 날씨 데이터 삭제
      const hourlyDeleted = await db
        .delete(hourlyWeatherData)
        .where(lte(hourlyWeatherData.expiresAt, now));

      // 만료된 일별 날씨 데이터 삭제
      const dailyDeleted = await db
        .delete(dailyWeatherData)
        .where(lte(dailyWeatherData.expiresAt, now));

      // 만료된 위치 키 데이터 삭제
      const locationDeleted = await db
        .delete(weatherLocationKeys)
        .where(lte(weatherLocationKeys.expiresAt, now));

      console.log('🧹 만료된 날씨 캐시 정리 완료:', {
        hourlyDeleted: hourlyDeleted.rowCount,
        dailyDeleted: dailyDeleted.rowCount,
        locationDeleted: locationDeleted.rowCount,
      });
    } catch (error) {
      console.error('날씨 캐시 정리 실패:', error);
    }
  }

  /**
   * 캐시 통계 조회
   */
  async getCacheStats(): Promise<{
    hourlyRecords: number;
    dailyRecords: number;
    locationKeys: number;
  }> {
    try {
      const now = new Date();
      
      const [hourlyCount] = await db
        .select({ count: count() })
        .from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.expiresAt, now));

      const [dailyCount] = await db
        .select({ count: count() })
        .from(dailyWeatherData)
        .where(gte(dailyWeatherData.expiresAt, now));

      const [locationCount] = await db
        .select({ count: count() })
        .from(weatherLocationKeys)
        .where(gte(weatherLocationKeys.expiresAt, now));

      return {
        hourlyRecords: hourlyCount.count,
        dailyRecords: dailyCount.count,
        locationKeys: locationCount.count,
      };
    } catch (error) {
      console.error('캐시 통계 조회 실패:', error);
      return {
        hourlyRecords: 0,
        dailyRecords: 0,
        locationKeys: 0,
      };
    }
  }
}

// 싱글톤 인스턴스
export const weatherDbService = new WeatherDatabaseService();
