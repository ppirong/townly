/**
 * 간단한 벡터 검색 서비스 (디버깅용)
 */

import { db } from '@/db';
import { weatherEmbeddings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { openaiEmbeddingService } from './openai-embedding';

export interface SimpleSearchResult {
  id: string;
  content: string;
  similarity: number;
  contentType: string;
  locationName: string;
  forecastDate?: string;
  forecastHour?: number;
  metadata: {
    clerkUserId: string;
    contentType: string;
    locationName: string;
    forecastDate?: string;
    forecastHour?: number;
  };
}

export class SimpleWeatherVectorDBService {
  /**
   * 단순한 사용자별 벡터 검색
   */
  async searchSimilarWeather(
    query: string,
    clerkUserId: string,
    contentTypes?: string[],
    limit: number = 5
  ): Promise<SimpleSearchResult[]> {
    console.log('🔧 간단한 벡터 검색 시작:', { query, clerkUserId, limit });

    try {
      // 1. 사용자 데이터 조회
      const userEmbeddings = await db
        .select()
        .from(weatherEmbeddings)
        .where(eq(weatherEmbeddings.clerkUserId, clerkUserId))
        .orderBy(desc(weatherEmbeddings.createdAt))
        .limit(20);

      console.log(`📊 사용자 데이터: ${userEmbeddings.length}개`);

      if (userEmbeddings.length === 0) {
        console.log('⚠️ 사용자 데이터가 없음');
        return [];
      }

      // 2. 쿼리 임베딩 생성
      const queryEmbedding = await openaiEmbeddingService.embedQuery(query);
      console.log(`🎯 쿼리 임베딩 생성 완료: ${queryEmbedding.length}차원`);

      // 3. 유사도 계산
      const results: SimpleSearchResult[] = [];
      
      for (const embedding of userEmbeddings) {
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
              clerkUserId: embedding.clerkUserId || 'unknown',
              contentType: embedding.contentType,
              locationName: embedding.locationName,
              forecastDate: embedding.forecastDate || undefined,
              forecastHour: embedding.forecastHour || undefined
            }
          });
        } catch (parseError) {
          console.error('임베딩 파싱 오류:', parseError);
        }
      }

      // 4. 유사도 순 정렬 및 제한
      const sortedResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log(`✅ 간단한 벡터 검색 완료: ${sortedResults.length}개 결과`);
      if (sortedResults.length > 0) {
        console.log('최고 유사도:', sortedResults[0].similarity);
      }

      return sortedResults;

    } catch (error) {
      console.error('❌ 간단한 벡터 검색 실패:', error);
      return [];
    }
  }
}

export const simpleWeatherVectorDBService = new SimpleWeatherVectorDBService();
