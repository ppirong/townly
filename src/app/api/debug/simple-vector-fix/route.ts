/**
 * 간단한 벡터 검색 수정 및 테스트
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

    console.log('🔧 간단한 벡터 검색 수정 테스트');

    // 1. 사용자 데이터 조회
    const userEmbeddings = await db
      .select()
      .from(weatherEmbeddings)
      .where(eq(weatherEmbeddings.clerkUserId, userId))
      .orderBy(desc(weatherEmbeddings.createdAt))
      .limit(5);

    console.log(`📊 사용자 데이터: ${userEmbeddings.length}개`);

    if (userEmbeddings.length === 0) {
      return NextResponse.json({
        success: false,
        error: '사용자 데이터가 없음'
      });
    }

    // 2. 쿼리 임베딩 생성
    const queryEmbedding = await openaiEmbeddingService.embedQuery(query);
    console.log(`🎯 쿼리 임베딩 생성 완료: ${queryEmbedding.length}차원`);

    // 3. 유사도 계산 (단순화)
    const results = [];
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
          forecastDate: embedding.forecastDate,
          forecastHour: embedding.forecastHour,
          metadata: {
            clerkUserId: embedding.clerkUserId,
            contentType: embedding.contentType,
            locationName: embedding.locationName
          }
        });
      } catch (parseError) {
        console.error('임베딩 파싱 오류:', parseError);
      }
    }

    // 4. 유사도 순 정렬
    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, 3);

    console.log(`✅ 최종 결과: ${topResults.length}개`);

    return NextResponse.json({
      success: true,
      query,
      userId,
      results: {
        totalUserEmbeddings: userEmbeddings.length,
        processedResults: results.length,
        topResults: topResults.map(r => ({
          id: r.id.substring(0, 8) + '...',
          similarity: r.similarity,
          contentType: r.contentType,
          forecastDate: r.forecastDate,
          forecastHour: r.forecastHour,
          contentPreview: r.content?.substring(0, 100) + '...'
        }))
      },
      directVectorResults: topResults, // RAG에서 사용할 형식
      analysis: {
        hasResults: topResults.length > 0,
        maxSimilarity: topResults[0]?.similarity || 0,
        averageSimilarity: results.length > 0 
          ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length 
          : 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 간단한 벡터 검색 테스트 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '간단한 벡터 검색 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
