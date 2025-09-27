/**
 * 벡터 검색 상세 디버깅 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { weatherEmbeddings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { openaiEmbeddingService } from '@/lib/services/openai-embedding';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query = "오늘 날씨", userId = "user_33Et8gPEb8Vqp5LGTZvVAmuLVE1" } = body;

    console.log('🔍 벡터 검색 상세 디버깅 시작:', { query, userId });

    const results = {
      step1: null as any,
      step2: null as any,
      step3: null as any,
      step4: null as any,
      step5: null as any,
      errors: [] as string[]
    };

    // 1단계: 사용자 임베딩 데이터 조회
    try {
      console.log('1️⃣ 사용자 임베딩 데이터 조회');
      const userEmbeddings = await db
        .select({
          id: weatherEmbeddings.id,
          clerkUserId: weatherEmbeddings.clerkUserId,
          contentType: weatherEmbeddings.contentType,
          locationName: weatherEmbeddings.locationName,
          forecastDate: weatherEmbeddings.forecastDate,
          forecastHour: weatherEmbeddings.forecastHour,
          content: weatherEmbeddings.content,
          embedding: weatherEmbeddings.embedding
        })
        .from(weatherEmbeddings)
        .where(eq(weatherEmbeddings.clerkUserId, userId))
        .orderBy(desc(weatherEmbeddings.createdAt))
        .limit(3);

      results.step1 = {
        success: true,
        count: userEmbeddings.length,
        sampleData: userEmbeddings.map(e => ({
          id: e.id.substring(0, 8) + '...',
          contentType: e.contentType,
          forecastDate: e.forecastDate,
          forecastHour: e.forecastHour,
          contentPreview: e.content?.substring(0, 100) + '...',
          embeddingLength: e.embedding ? JSON.parse(e.embedding).length : 0
        }))
      };
      console.log(`✅ 1단계 성공: ${userEmbeddings.length}개 임베딩 조회`);

      if (userEmbeddings.length === 0) {
        results.errors.push('사용자 임베딩 데이터가 없음');
        return NextResponse.json({ success: false, results, error: '사용자 데이터 없음' });
      }

      // 2단계: 쿼리 임베딩 생성
      try {
        console.log('2️⃣ 쿼리 임베딩 생성');
        const queryEmbedding = await openaiEmbeddingService.embedQuery(query);
        
        results.step2 = {
          success: true,
          queryEmbeddingLength: queryEmbedding.length,
          sampleValues: queryEmbedding.slice(0, 5)
        };
        console.log(`✅ 2단계 성공: 임베딩 벡터 길이 ${queryEmbedding.length}`);

        // 3단계: 유사도 계산
        try {
          console.log('3️⃣ 유사도 계산');
          const similarities = [];
          
          for (const embedding of userEmbeddings) {
            try {
              const embeddingVector = JSON.parse(embedding.embedding);
              const similarity = openaiEmbeddingService.calculateCosineSimilarity(
                queryEmbedding,
                embeddingVector
              );
              
              similarities.push({
                id: embedding.id.substring(0, 8) + '...',
                contentType: embedding.contentType,
                forecastDate: embedding.forecastDate,
                forecastHour: embedding.forecastHour,
                similarity: similarity,
                contentPreview: embedding.content?.substring(0, 50) + '...'
              });
            } catch (parseError) {
              results.errors.push(`임베딩 파싱 실패: ${parseError}`);
            }
          }

          // 유사도순 정렬
          similarities.sort((a, b) => b.similarity - a.similarity);
          
          results.step3 = {
            success: true,
            similarityCount: similarities.length,
            topSimilarities: similarities.slice(0, 3),
            averageSimilarity: similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length
          };
          console.log(`✅ 3단계 성공: ${similarities.length}개 유사도 계산 완료`);

          // 4단계: 임계값 확인
          const threshold = 0.7; // 기본 임계값
          const aboveThreshold = similarities.filter(s => s.similarity > threshold);
          
          results.step4 = {
            success: true,
            threshold,
            aboveThresholdCount: aboveThreshold.length,
            maxSimilarity: similarities[0]?.similarity || 0,
            aboveThresholdItems: aboveThreshold
          };
          console.log(`✅ 4단계 성공: 임계값 ${threshold} 이상 ${aboveThreshold.length}개`);

          // 5단계: 최종 결과 구성
          const finalResults = similarities.slice(0, 5).map(s => ({
            id: s.id,
            content: s.contentPreview,
            similarity: s.similarity,
            contentType: s.contentType,
            forecastDate: s.forecastDate,
            forecastHour: s.forecastHour,
            metadata: {
              clerkUserId: userId,
              contentType: s.contentType,
              locationName: '37.7102, 126.7531'
            }
          }));

          results.step5 = {
            success: true,
            finalResultCount: finalResults.length,
            finalResults
          };

        } catch (similarityError) {
          results.errors.push(`유사도 계산 실패: ${similarityError}`);
          results.step3 = { success: false, error: similarityError instanceof Error ? similarityError.message : 'Unknown error' };
        }

      } catch (embeddingError) {
        results.errors.push(`쿼리 임베딩 생성 실패: ${embeddingError}`);
        results.step2 = { success: false, error: embeddingError instanceof Error ? embeddingError.message : 'Unknown error' };
      }

    } catch (dbError) {
      results.errors.push(`데이터베이스 조회 실패: ${dbError}`);
      results.step1 = { success: false, error: dbError instanceof Error ? dbError.message : 'Unknown error' };
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      query,
      userId,
      results,
      summary: {
        totalSteps: 5,
        successfulSteps: Object.values(results).filter(step => step && typeof step === 'object' && step.success).length,
        errors: results.errors,
        recommendation: results.errors.length === 0 
          ? '모든 단계 성공 - 벡터 검색이 정상 작동해야 함' 
          : `오류 발생: ${results.errors[0]}`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 벡터 검색 디버깅 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '벡터 검색 디버깅 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
