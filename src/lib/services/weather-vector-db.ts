/**
 * 날씨 벡터 데이터베이스 서비스
 * 날씨 데이터를 임베딩하여 저장하고 유사도 검색을 수행합니다.
 */

import { db } from '@/db';
import { weatherEmbeddings, hourlyWeatherData, dailyWeatherData } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { openaiEmbeddingService } from './openai-embedding';
import type { WeatherEmbedding, NewWeatherEmbedding } from '@/db/schema';

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
  contentType: string;
  locationName: string;
  forecastDate?: string;
  forecastHour?: number;
}

export interface EmbeddingBatch {
  contentType: string;
  locationName: string;
  forecastDate?: string;
  forecastHour?: number;
  content: string;
  metadata: Record<string, any>;
  weatherDataId?: string;
  clerkUserId?: string;
}

export class WeatherVectorDBService {

  /**
   * 날씨 데이터를 임베딩하여 벡터 DB에 저장
   */
  async saveWeatherEmbedding(
    contentType: string,
    locationName: string,
    weatherData: any,
    weatherDataId?: string,
    clerkUserId?: string
  ): Promise<string> {
    try {
      // 날씨 데이터를 자연어 텍스트로 변환
      const content = openaiEmbeddingService.weatherDataToText(weatherData, contentType);
      
      // 임베딩 생성
      const embeddingResult = await openaiEmbeddingService.createEmbedding(content);
      
      // 메타데이터 준비
      const metadata = {
        temperature: weatherData.temperature,
        conditions: weatherData.conditions,
        precipitationProbability: weatherData.precipitationProbability,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        weatherIcon: weatherData.weatherIcon,
        highTemp: weatherData.highTemp,
        lowTemp: weatherData.lowTemp,
        dayWeather: weatherData.dayWeather,
        nightWeather: weatherData.nightWeather,
        units: weatherData.units || 'metric',
        source: weatherData.source || 'api'
      };

      // 데이터베이스에 저장
      const insertData: NewWeatherEmbedding = {
        clerkUserId: clerkUserId || null,
        contentType,
        locationName,
        forecastDate: weatherData.forecastDate,
        forecastHour: weatherData.forecastHour,
        content,
        embedding: JSON.stringify(embeddingResult.embedding),
        metadata,
        weatherDataId
      };

      const result = await db.insert(weatherEmbeddings).values(insertData).returning();
      
      console.log('💾 날씨 임베딩 저장 완료:', {
        id: result[0].id,
        contentType,
        locationName,
        tokensUsed: embeddingResult.tokensUsed
      });

      return result[0].id;
    } catch (error) {
      console.error('❌ 날씨 임베딩 저장 실패:', error);
      throw new Error('날씨 임베딩 저장에 실패했습니다.');
    }
  }

  /**
   * 여러 날씨 데이터를 배치로 임베딩하여 저장
   */
  async saveBatchWeatherEmbeddings(embeddingBatch: EmbeddingBatch[]): Promise<string[]> {
    try {
      // 모든 텍스트를 한 번에 임베딩 생성
      const contents = embeddingBatch.map(item => item.content);
      const embeddingResults = await openaiEmbeddingService.createBatchEmbeddings(contents);

      // 배치 삽입 데이터 준비
      const insertData: NewWeatherEmbedding[] = embeddingBatch.map((item, index) => ({
        clerkUserId: item.clerkUserId || null,
        contentType: item.contentType,
        locationName: item.locationName,
        forecastDate: item.forecastDate,
        forecastHour: item.forecastHour,
        content: item.content,
        embedding: JSON.stringify(embeddingResults[index].embedding),
        metadata: item.metadata,
        weatherDataId: item.weatherDataId
      }));

      // 데이터베이스에 배치 삽입
      const results = await db.insert(weatherEmbeddings).values(insertData).returning();
      
      const ids = results.map(r => r.id);
      
      console.log('💾 배치 날씨 임베딩 저장 완료:', {
        count: ids.length,
        totalTokens: embeddingResults.reduce((sum, r) => sum + r.tokensUsed, 0)
      });

      return ids;
    } catch (error) {
      console.error('❌ 배치 날씨 임베딩 저장 실패:', error);
      throw new Error('배치 날씨 임베딩 저장에 실패했습니다.');
    }
  }

  /**
   * 기존 날씨 데이터를 임베딩하여 벡터 DB에 저장 (마이그레이션용)
   */
  async migrateExistingWeatherData(): Promise<number> {
    try {
      console.log('🔄 기존 날씨 데이터 임베딩 마이그레이션 시작...');
      
      let totalEmbedded = 0;
      
      // 1. 시간별 날씨 데이터 임베딩
      const hourlyData = await db
        .select()
        .from(hourlyWeatherData)
        .orderBy(desc(hourlyWeatherData.createdAt))
        .limit(100); // 최근 100개만

      if (hourlyData.length > 0) {
        const hourlyBatch: EmbeddingBatch[] = hourlyData.map(data => ({
          contentType: 'hourly',
          locationName: data.locationName,
          forecastDate: data.forecastDate,
          forecastHour: data.forecastHour,
          content: openaiEmbeddingService.weatherDataToText(data, 'hourly'),
          metadata: {
            temperature: data.temperature,
            conditions: data.conditions,
            precipitationProbability: data.precipitationProbability,
            humidity: data.humidity,
            windSpeed: data.windSpeed,
            weatherIcon: data.weatherIcon,
            units: data.units
          },
          weatherDataId: data.id
        }));

        await this.saveBatchWeatherEmbeddings(hourlyBatch);
        totalEmbedded += hourlyBatch.length;
      }

      // 2. 일별 날씨 데이터 임베딩
      const dailyData = await db
        .select()
        .from(dailyWeatherData)
        .orderBy(desc(dailyWeatherData.createdAt))
        .limit(50); // 최근 50개만

      if (dailyData.length > 0) {
        const dailyBatch: EmbeddingBatch[] = dailyData.map(data => ({
          contentType: 'daily',
          locationName: data.locationName,
          forecastDate: data.forecastDate,
          content: openaiEmbeddingService.weatherDataToText(data, 'daily'),
          metadata: {
            temperature: data.temperature,
            highTemp: data.highTemp,
            lowTemp: data.lowTemp,
            conditions: data.conditions,
            precipitationProbability: data.precipitationProbability,
            weatherIcon: data.weatherIcon,
            dayWeather: data.dayWeather,
            nightWeather: data.nightWeather,
            units: data.units
          },
          weatherDataId: data.id
        }));

        await this.saveBatchWeatherEmbeddings(dailyBatch);
        totalEmbedded += dailyBatch.length;
      }

      console.log('✅ 날씨 데이터 임베딩 마이그레이션 완료:', totalEmbedded);
      return totalEmbedded;
    } catch (error) {
      console.error('❌ 날씨 데이터 임베딩 마이그레이션 실패:', error);
      throw new Error('날씨 데이터 임베딩 마이그레이션에 실패했습니다.');
    }
  }

  /**
   * 사용자 질의와 유사한 날씨 정보 검색 (사용자별 필터링 지원)
   */
  async searchSimilarWeather(
    query: string,
    locationName?: string,
    contentTypes?: string[],
    limit: number = 5,
    clerkUserId?: string
  ): Promise<SearchResult[]> {
    try {
      console.log('🔍 날씨 벡터 검색:', { query, locationName, contentTypes, limit });
      
      // 먼저 벡터 임베딩 테이블이 존재하는지 확인
      let embeddings;
      try {
        // 데이터베이스에서 모든 임베딩 가져오기 (필터링 적용)
        const whereConditions = [];
        
        // 사용자별 필터링 추가
        if (clerkUserId) {
          whereConditions.push(eq(weatherEmbeddings.clerkUserId, clerkUserId));
        }
        
        if (locationName) {
          whereConditions.push(eq(weatherEmbeddings.locationName, locationName));
        }
        
        if (contentTypes && contentTypes.length > 0) {
          // contentTypes 필터링 (임시로 첫 번째 타입만 사용)
          whereConditions.push(eq(weatherEmbeddings.contentType, contentTypes[0]));
        }

        embeddings = await db
          .select()
          .from(weatherEmbeddings)
          .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
          .orderBy(desc(weatherEmbeddings.createdAt))
          .limit(100); // 최대 100개에서 검색
      } catch (dbError) {
        console.log('⚠️ 벡터 임베딩 테이블이 존재하지 않거나 데이터가 없음:', dbError);
        return []; // 빈 배열 반환으로 폴백 처리 유도
      }

      if (!embeddings || embeddings.length === 0) {
        console.log('⚠️ 벡터 임베딩 데이터가 없음 - 폴백 처리');
        return [];
      }
      
      // 쿼리를 임베딩으로 변환
      const queryEmbedding = await openaiEmbeddingService.embedQuery(query);

      // 유사도 계산
      const results: SearchResult[] = embeddings.map(embedding => {
        const embeddingVector = JSON.parse(embedding.embedding);
        const similarity = openaiEmbeddingService.calculateCosineSimilarity(
          queryEmbedding,
          embeddingVector
        );

        return {
          id: embedding.id,
          content: embedding.content,
          similarity,
          metadata: embedding.metadata as Record<string, any>,
          contentType: embedding.contentType,
          locationName: embedding.locationName,
          forecastDate: embedding.forecastDate || undefined,
          forecastHour: embedding.forecastHour || undefined
        };
      });

      // 유사도 기준으로 정렬하고 상위 결과 반환
      const sortedResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log('✅ 날씨 벡터 검색 완료:', {
        totalFound: embeddings.length,
        returned: sortedResults.length,
        topSimilarity: sortedResults[0]?.similarity || 0
      });

      return sortedResults;
    } catch (error) {
      console.error('❌ 날씨 벡터 검색 실패:', error);
      // 에러 시에도 빈 배열 반환하여 폴백 처리 유도
      return [];
    }
  }

  /**
   * 특정 지역의 최신 날씨 임베딩 조회
   */
  async getLatestWeatherEmbeddings(
    locationName: string,
    contentType?: string,
    limit: number = 10
  ): Promise<WeatherEmbedding[]> {
    try {
      const whereConditions = [eq(weatherEmbeddings.locationName, locationName)];
      
      if (contentType) {
        whereConditions.push(eq(weatherEmbeddings.contentType, contentType));
      }

      const results = await db
        .select()
        .from(weatherEmbeddings)
        .where(and(...whereConditions))
        .orderBy(desc(weatherEmbeddings.createdAt))
        .limit(limit);

      return results;
    } catch (error) {
      console.error('❌ 최신 날씨 임베딩 조회 실패:', error);
      return [];
    }
  }

  /**
   * 만료된 임베딩 데이터 정리
   */
  async cleanupOldEmbeddings(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedRows = await db
        .delete(weatherEmbeddings)
        .where(sql`${weatherEmbeddings.createdAt} < ${cutoffDate}`)
        .returning();

      console.log(`🗑️ 오래된 임베딩 ${deletedRows.length}개 정리 완료`);
      return deletedRows.length;
    } catch (error) {
      console.error('❌ 임베딩 정리 실패:', error);
      return 0;
    }
  }

  /**
   * 벡터 DB 통계 정보 조회
   */
  async getVectorDBStats(): Promise<{
    totalEmbeddings: number;
    byContentType: Record<string, number>;
    byLocation: Record<string, number>;
    lastUpdated: string;
  }> {
    try {
      // 전체 개수
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(weatherEmbeddings);
      
      const totalEmbeddings = totalResult[0]?.count || 0;

      // 콘텐츠 타입별 통계
      const contentTypeStats = await db
        .select({
          contentType: weatherEmbeddings.contentType,
          count: sql<number>`count(*)`
        })
        .from(weatherEmbeddings)
        .groupBy(weatherEmbeddings.contentType);

      const byContentType = contentTypeStats.reduce((acc, item) => {
        acc[item.contentType] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // 지역별 통계
      const locationStats = await db
        .select({
          locationName: weatherEmbeddings.locationName,
          count: sql<number>`count(*)`
        })
        .from(weatherEmbeddings)
        .groupBy(weatherEmbeddings.locationName);

      const byLocation = locationStats.reduce((acc, item) => {
        acc[item.locationName] = item.count;
        return acc;
      }, {} as Record<string, number>);

      // 최근 업데이트 시간
      const lastUpdatedResult = await db
        .select({ lastUpdated: weatherEmbeddings.createdAt })
        .from(weatherEmbeddings)
        .orderBy(desc(weatherEmbeddings.createdAt))
        .limit(1);

      const lastUpdated = lastUpdatedResult[0]?.lastUpdated?.toISOString() || 'N/A';

      return {
        totalEmbeddings,
        byContentType,
        byLocation,
        lastUpdated
      };
    } catch (error) {
      console.error('❌ 벡터 DB 통계 조회 실패:', error);
      return {
        totalEmbeddings: 0,
        byContentType: {},
        byLocation: {},
        lastUpdated: 'N/A'
      };
    }
  }
}

// 싱글톤 인스턴스
export const weatherVectorDBService = new WeatherVectorDBService();
