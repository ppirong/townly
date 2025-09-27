/**
 * 날씨 벡터 데이터베이스 서비스
 * 날씨 데이터를 임베딩하여 저장하고 유사도 검색을 수행합니다.
 */

import { db } from '@/db';
import { weatherEmbeddings, hourlyWeatherData, dailyWeatherData } from '@/db/schema';
import { eq, desc, and, sql, or } from 'drizzle-orm';
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
   * 좌표를 주요 도시명으로 매핑
   */
  private mapCoordinatesToCity(locationName: string): string {
    // 좌표 형태인지 확인 (위도, 경도 패턴)
    const coordPattern = /^[\d.]+,\s*[\d.]+$/;
    if (!coordPattern.test(locationName)) {
      return locationName; // 이미 도시명인 경우 그대로 반환
    }

    const [lat, lon] = locationName.split(',').map(s => parseFloat(s.trim()));
    
    // 한국 주요 도시들의 대략적인 좌표 범위로 매핑
    const cityMapping = [
      { name: '서울', latRange: [37.3, 37.8], lonRange: [126.7, 127.3] },
      { name: '부산', latRange: [35.0, 35.3], lonRange: [128.9, 129.3] },
      { name: '대구', latRange: [35.7, 36.0], lonRange: [128.4, 128.8] },
      { name: '인천', latRange: [37.2, 37.6], lonRange: [126.3, 126.9] },
      { name: '광주', latRange: [35.0, 35.3], lonRange: [126.7, 127.1] },
      { name: '대전', latRange: [36.2, 36.5], lonRange: [127.2, 127.6] },
      { name: '울산', latRange: [35.4, 35.7], lonRange: [129.1, 129.5] },
      { name: '세종', latRange: [36.4, 36.6], lonRange: [127.2, 127.4] },
      { name: '수원', latRange: [37.2, 37.3], lonRange: [126.9, 127.1] },
      { name: '성남', latRange: [37.3, 37.5], lonRange: [127.0, 127.2] },
      { name: '제주', latRange: [33.2, 33.6], lonRange: [126.3, 126.8] },
    ];

    for (const city of cityMapping) {
      if (lat >= city.latRange[0] && lat <= city.latRange[1] && 
          lon >= city.lonRange[0] && lon <= city.lonRange[1]) {
        return city.name;
      }
    }

    // 매핑되지 않으면 원본 반환
    return locationName;
  }

  /**
   * 위치명을 정규화 (좌표 → 도시명, 별칭 → 표준명 등)
   */
  private normalizeLocationName(locationName: string): string {
    // 1. 좌표를 도시명으로 변환
    const normalized = this.mapCoordinatesToCity(locationName);
    
    // 2. 별칭을 표준명으로 변환
    const aliasMapping: Record<string, string> = {
      '강남': '서울',
      '강북': '서울',
      '홍대': '서울',
      '명동': '서울',
      '한강': '서울',
      '여의도': '서울',
      '상암': '서울',
      '김포': '인천',
      '송도': '인천',
      '해운대': '부산',
      '서면': '부산',
    };
    
    return aliasMapping[normalized] || normalized;
  }

  /**
   * 날씨 데이터를 임베딩하여 벡터 DB에 저장 (중복 체크 포함)
   */
  async saveWeatherEmbedding(
    contentType: string,
    locationName: string,
    weatherData: any,
    weatherDataId?: string,
    clerkUserId?: string
  ): Promise<string> {
    try {
      // 중복 체크: 같은 사용자, 위치, 날짜, 시간의 임베딩이 이미 있는지 확인
      if (clerkUserId && weatherData.forecastDate) {
        const whereConditions = [
          eq(weatherEmbeddings.clerkUserId, clerkUserId),
          eq(weatherEmbeddings.contentType, contentType),
          eq(weatherEmbeddings.locationName, locationName),
          eq(weatherEmbeddings.forecastDate, weatherData.forecastDate)
        ];

        // 시간별 날씨인 경우 시간도 체크
        if (contentType === 'hourly' && weatherData.forecastHour !== undefined) {
          whereConditions.push(eq(weatherEmbeddings.forecastHour, weatherData.forecastHour));
        }

        const existingEmbedding = await db
          .select()
          .from(weatherEmbeddings)
          .where(and(...whereConditions))
          .limit(1);

        if (existingEmbedding.length > 0) {
          console.log('🔄 날씨 임베딩 이미 존재함 (건너뛰기):', {
            contentType,
            locationName,
            forecastDate: weatherData.forecastDate,
            forecastHour: weatherData.forecastHour
          });
          return existingEmbedding[0].id;
        }
      }

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
   * 사용자 질의와 유사한 날씨 정보 검색 (사용자별 및 위치별 필터링 강화)
   */
  async searchSimilarWeather(
    query: string,
    clerkUserId: string, // 필수 파라미터로 변경
    contentTypes?: string[],
    limit: number = 5
  ): Promise<SearchResult[]> {
    console.log('🎯 벡터 검색 함수 시작:', { query, clerkUserId, contentTypes, limit });
    
    try {
      console.log('🔍 사용자별 날씨 벡터 검색:', { query, clerkUserId, contentTypes, limit });
      
      if (!clerkUserId) {
        console.error('❌ 사용자 ID가 없음');
        throw new Error('사용자 ID(clerkUserId)는 벡터 검색에 필수입니다.');
      }
      
      // 먼저 벡터 임베딩 테이블이 존재하는지 확인
      let embeddings;
      try {
        // 사용자별 날씨 데이터 필터링 (사용자 중심 시스템)
        const whereConditions = [
          eq(weatherEmbeddings.clerkUserId, clerkUserId)
        ];
        
        // 콘텐츠 타입 필터링 완전 제거 (디버깅용)
        console.log('📋 콘텐츠 타입 필터링 건너뜀 (디버깅 모드)');

        // 사용자별 날씨 데이터 조회 (사용자 중심 시스템)
        console.log('🔍 벡터 검색 필터 조건:', whereConditions);
        
        embeddings = await db
          .select()
          .from(weatherEmbeddings)
          .where(and(...whereConditions))
          .orderBy(desc(weatherEmbeddings.createdAt))
          .limit(50);
          
        console.log(`👤 사용자 ${clerkUserId}의 날씨 데이터 ${embeddings.length}개 발견`);
        
        if (embeddings.length > 0) {
          console.log('📄 첫 번째 임베딩 샘플:', {
            id: embeddings[0].id.substring(0, 8) + '...',
            clerkUserId: embeddings[0].clerkUserId,
            contentType: embeddings[0].contentType,
            locationName: embeddings[0].locationName,
            forecastDate: embeddings[0].forecastDate
          });
        }
        
      } catch (dbError) {
        console.error('⚠️ 벡터 임베딩 테이블 오류:', dbError);
        console.error('DB 오류 스택:', dbError instanceof Error ? dbError.stack : 'Unknown error');
        return []; // 빈 배열 반환으로 폴백 처리 유도
      }

      if (!embeddings || embeddings.length === 0) {
        console.log('⚠️ 벡터 임베딩 데이터가 없음 - 폴백 처리');
        return [];
      }
      
      // 사용자 쿼리를 임베딩으로 변환
      const queryEmbedding = await openaiEmbeddingService.embedQuery(query);

      // 사용자별 유사도 계산 (수정된 로직)
      const results: SearchResult[] = [];
      
      for (const embedding of embeddings) {
        try {
          const embeddingVector = JSON.parse(embedding.embedding);
          const similarity = openaiEmbeddingService.calculateCosineSimilarity(
            queryEmbedding,
            embeddingVector
          );

          results.push({
            id: embedding.id,
            content: embedding.content,
            similarity: similarity,
            contentType: embedding.contentType,
            locationName: embedding.locationName,
            forecastDate: embedding.forecastDate || undefined,
            forecastHour: embedding.forecastHour || undefined,
            metadata: {
              clerkUserId: embedding.clerkUserId,
              contentType: embedding.contentType,
              locationName: embedding.locationName,
              forecastDate: embedding.forecastDate || undefined,
              forecastHour: embedding.forecastHour || undefined
            }
          });
        } catch (parseError) {
          console.error(`임베딩 파싱 오류 (ID: ${embedding.id}):`, parseError);
        }
      }

      // 유사도 기준으로 정렬하고 상위 결과 반환
      const sortedResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log('✅ 날씨 벡터 검색 완료:', {
        totalFound: embeddings.length,
        returned: sortedResults.length,
        topSimilarity: sortedResults[0]?.similarity || 0,
        userDataMatches: sortedResults.filter(r => r.metadata?.clerkUserId === clerkUserId).length,
        clerkUserId
      });

      return sortedResults;
    } catch (error) {
      console.error('❌ 날씨 벡터 검색 실패:', error);
      console.error('오류 스택:', error instanceof Error ? error.stack : 'Unknown error');
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
   * 특정 사용자의 모든 임베딩 데이터 삭제
   */
  async deleteEmbeddingsByUserId(clerkUserId: string): Promise<number> {
    try {
      const deletedRows = await db
        .delete(weatherEmbeddings)
        .where(eq(weatherEmbeddings.clerkUserId, clerkUserId))
        .returning();

      console.log(`🗑️ 사용자 ${clerkUserId}의 임베딩 ${deletedRows.length}개 삭제 완료`);
      return deletedRows.length;
    } catch (error) {
      console.error('❌ 사용자 임베딩 삭제 실패:', error);
      return 0;
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

  /**
   * createEmbedding 별칭 메서드 (마이그레이션용)
   */
  async createEmbedding(
    clerkUserId: string,
    contentType: string,
    locationName: string,
    forecastDate?: string,
    forecastHour?: number,
    content?: string,
    metadata?: any,
    weatherDataId?: string
  ): Promise<string> {
    // 콘텐츠가 제공되지 않은 경우 기본 콘텐츠 생성
    const finalContent = content || this.generateDefaultContent(contentType, locationName, metadata, forecastDate, forecastHour);
    
    // 날씨 데이터 객체 구성
    const weatherData = {
      ...metadata,
      forecastDate,
      forecastHour,
      content: finalContent
    };

    return await this.saveWeatherEmbedding(
      contentType,
      locationName,
      weatherData,
      weatherDataId,
      clerkUserId
    );
  }

  /**
   * 기본 콘텐츠 생성
   */
  private generateDefaultContent(
    contentType: string,
    locationName: string,
    metadata: any,
    forecastDate?: string,
    forecastHour?: number
  ): string {
    if (contentType === 'hourly' && forecastHour !== undefined) {
      return `${locationName} ${forecastDate} ${forecastHour}시 날씨: ${metadata?.conditions || '정보없음'}, 기온 ${metadata?.temperature || 'N/A'}°C, 강수확률 ${metadata?.precipitationProbability || 0}%`;
    } else if (contentType === 'daily') {
      return `${locationName} ${forecastDate} 날씨: ${metadata?.conditions || '정보없음'}, 최고기온 ${metadata?.highTemp || 'N/A'}°C, 최저기온 ${metadata?.lowTemp || 'N/A'}°C, 강수확률 ${metadata?.precipitationProbability || 0}%`;
    } else {
      return `${locationName} 날씨 정보: ${metadata?.conditions || '정보없음'}, 기온 ${metadata?.temperature || 'N/A'}°C`;
    }
  }
}

// 싱글톤 인스턴스
export const weatherVectorDBService = new WeatherVectorDBService();
