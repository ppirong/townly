/**
 * 기존 날씨 데이터를 벡터 DB에 일괄 임베딩하는 마이그레이션 서비스
 */

import { db } from '@/db';
import { hourlyWeatherData, dailyWeatherData, weatherEmbeddings } from '@/db/schema';
import { weatherVectorDBService } from './weather-vector-db';
import { gte, desc, sql } from 'drizzle-orm';

export interface MigrationResult {
  success: boolean;
  embeddingsCreated: number;
  errors: string[];
  duration: number;
}

export class WeatherDataMigrationService {
  
  /**
   * 모든 기존 날씨 데이터를 벡터 DB에 임베딩
   */
  async migrateAllWeatherData(): Promise<MigrationResult> {
    const startTime = Date.now();
    let embeddingsCreated = 0;
    const errors: string[] = [];

    try {
      console.log('🔄 날씨 데이터 마이그레이션 시작');
      
      // 1. 시간별 날씨 데이터 임베딩
      console.log('📊 시간별 날씨 데이터 임베딩 중...');
      const hourlyResult = await this.migrateHourlyWeatherData();
      embeddingsCreated += hourlyResult.count;
      errors.push(...hourlyResult.errors);

      // 2. 일별 날씨 데이터 임베딩
      console.log('📅 일별 날씨 데이터 임베딩 중...');
      const dailyResult = await this.migrateDailyWeatherData();
      embeddingsCreated += dailyResult.count;
      errors.push(...dailyResult.errors);

      const duration = Date.now() - startTime;
      
      console.log(`✅ 마이그레이션 완료: ${embeddingsCreated}개 임베딩 생성, ${duration}ms 소요`);
      
      return {
        success: true,
        embeddingsCreated,
        errors,
        duration
      };

    } catch (error) {
      console.error('❌ 마이그레이션 실패:', error);
      
      return {
        success: false,
        embeddingsCreated,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 시간별 날씨 데이터 임베딩
   */
  private async migrateHourlyWeatherData(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      // 최근 7일 데이터만 임베딩 (너무 많으면 제한)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const hourlyData = await db
        .select()
        .from(hourlyWeatherData)
        .where(gte(hourlyWeatherData.forecastDate, cutoffDate.toISOString().split('T')[0]))
        .orderBy(desc(hourlyWeatherData.createdAt))
        .limit(100); // 최대 100개로 제한

      console.log(`🔍 ${hourlyData.length}개의 시간별 데이터 발견`);

      for (const data of hourlyData) {
        try {
          await this.createHourlyEmbedding(data);
          count++;
          
          if (count % 10 === 0) {
            console.log(`⚡ 시간별 데이터 ${count}개 임베딩 완료`);
          }
        } catch (error) {
          const errorMsg = `시간별 데이터 ${data.id} 임베딩 실패: ${error}`;
          console.warn('⚠️', errorMsg);
          errors.push(errorMsg);
        }
      }

    } catch (error) {
      errors.push(`시간별 데이터 조회 실패: ${error}`);
    }

    return { count, errors };
  }

  /**
   * 일별 날씨 데이터 임베딩
   */
  private async migrateDailyWeatherData(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      // 최근 30일 데이터만 임베딩
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const dailyData = await db
        .select()
        .from(dailyWeatherData)
        .where(gte(dailyWeatherData.forecastDate, cutoffDate.toISOString().split('T')[0]))
        .orderBy(desc(dailyWeatherData.createdAt))
        .limit(200); // 최대 200개로 제한

      console.log(`🔍 ${dailyData.length}개의 일별 데이터 발견`);

      for (const data of dailyData) {
        try {
          await this.createDailyEmbedding(data);
          count++;
          
          if (count % 5 === 0) {
            console.log(`⚡ 일별 데이터 ${count}개 임베딩 완료`);
          }
        } catch (error) {
          const errorMsg = `일별 데이터 ${data.id} 임베딩 실패: ${error}`;
          console.warn('⚠️', errorMsg);
          errors.push(errorMsg);
        }
      }

    } catch (error) {
      errors.push(`일별 데이터 조회 실패: ${error}`);
    }

    return { count, errors };
  }

  /**
   * 시간별 날씨 데이터를 임베딩으로 변환
   */
  private async createHourlyEmbedding(data: any): Promise<void> {
    const hour = new Date(data.forecastDateTime).getHours();
    
    const content = `${data.locationName} ${data.forecastDate} ${hour}시 날씨: ${data.conditions}, 기온 ${data.temperature}°C, 강수확률 ${data.precipitationProbability}%, 습도 ${data.humidity}%`;
    
    const metadata = {
      temperature: data.temperature,
      conditions: data.conditions,
      precipitationProbability: data.precipitationProbability,
      humidity: data.humidity,
      windSpeed: data.windSpeed,
      weatherIcon: data.weatherIcon,
      location: data.locationName,
      date: data.forecastDate,
      hour: hour
    };

    await weatherVectorDBService.createEmbedding(
      data.clerkUserId || 'system',
      'hourly',
      data.locationName,
      data.forecastDate,
      hour,
      content,
      metadata,
      data.id
    );
  }

  /**
   * 일별 날씨 데이터를 임베딩으로 변환
   */
  private async createDailyEmbedding(data: any): Promise<void> {
    const content = `${data.locationName} ${data.forecastDate} (${data.dayOfWeek}) 날씨: ${data.conditions}, 최고기온 ${data.highTemp}°C, 최저기온 ${data.lowTemp}°C, 강수확률 ${data.precipitationProbability}%`;
    
    const metadata = {
      highTemp: data.highTemp,
      lowTemp: data.lowTemp,
      temperature: data.temperature,
      conditions: data.conditions,
      precipitationProbability: data.precipitationProbability,
      weatherIcon: data.weatherIcon,
      location: data.locationName,
      date: data.forecastDate,
      dayOfWeek: data.dayOfWeek,
      dayWeather: data.dayWeather,
      nightWeather: data.nightWeather
    };

    await weatherVectorDBService.createEmbedding(
      data.clerkUserId || 'system',
      'daily',
      data.locationName,
      data.forecastDate,
      undefined,
      content,
      metadata,
      data.id
    );
  }

  /**
   * 중복 임베딩 제거
   */
  async removeDuplicateEmbeddings(): Promise<number> {
    try {
      console.log('🧹 중복 임베딩 정리 중...');
      
      // 중복 제거 로직 (weather_data_id가 같은 경우)
      const result = await db.execute(sql`
        DELETE FROM weather_embeddings a USING weather_embeddings b 
        WHERE a.id < b.id 
        AND a.weather_data_id = b.weather_data_id 
        AND a.weather_data_id IS NOT NULL
      `);
      
      console.log(`✅ ${result.rowCount || 0}개의 중복 임베딩 제거됨`);
      return result.rowCount || 0;
      
    } catch (error) {
      console.error('❌ 중복 제거 실패:', error);
      return 0;
    }
  }

  /**
   * 임베딩 통계 조회
   */
  async getEmbeddingStats(): Promise<any> {
    try {
      const stats = await db
        .select({
          contentType: weatherEmbeddings.contentType,
          locationName: weatherEmbeddings.locationName,
          count: sql`count(*)`
        })
        .from(weatherEmbeddings)
        .groupBy(weatherEmbeddings.contentType, weatherEmbeddings.locationName);

      const total = await db
        .select({ count: sql`count(*)` })
        .from(weatherEmbeddings);

      return {
        total: total[0]?.count || 0,
        byType: stats.reduce((acc, row) => {
          const type = row.contentType;
          if (!acc[type]) acc[type] = 0;
          acc[type] += Number(row.count);
          return acc;
        }, {} as Record<string, number>),
        byLocation: stats.reduce((acc, row) => {
          const location = row.locationName;
          if (!acc[location]) acc[location] = 0;
          acc[location] += Number(row.count);
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      console.error('❌ 통계 조회 실패:', error);
      return { total: 0, byType: {}, byLocation: {} };
    }
  }
}

// 싱글톤 인스턴스
export const weatherDataMigrationService = new WeatherDataMigrationService();
