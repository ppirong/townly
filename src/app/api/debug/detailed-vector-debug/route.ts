/**
 * 상세한 벡터 검색 디버깅 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { weatherEmbeddings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId가 필요합니다',
        usage: 'POST {"userId": "user-id"}'
      });
    }

    console.log('🔍 상세한 벡터 검색 디버깅:', { userId });

    // 1. 해당 사용자 데이터 직접 조회
    const userEmbeddings = await db
      .select({
        id: weatherEmbeddings.id,
        clerkUserId: weatherEmbeddings.clerkUserId,
        contentType: weatherEmbeddings.contentType,
        locationName: weatherEmbeddings.locationName,
        forecastDate: weatherEmbeddings.forecastDate,
        forecastHour: weatherEmbeddings.forecastHour,
        content: weatherEmbeddings.content,
        embedding: weatherEmbeddings.embedding,
        createdAt: weatherEmbeddings.createdAt
      })
      .from(weatherEmbeddings)
      .where(eq(weatherEmbeddings.clerkUserId, userId))
      .orderBy(desc(weatherEmbeddings.createdAt))
      .limit(10);

    console.log(`📊 사용자 ${userId} 데이터 ${userEmbeddings.length}개 조회됨`);

    // 2. 임베딩 데이터 유효성 확인
    const embeddingAnalysis = userEmbeddings.map(embedding => {
      let embeddingVector = null;
      let embeddingError = null;
      
      try {
        embeddingVector = JSON.parse(embedding.embedding);
      } catch (error) {
        embeddingError = error instanceof Error ? error.message : 'Unknown error';
      }

      return {
        id: embedding.id.substring(0, 8) + '...',
        contentType: embedding.contentType,
        locationName: embedding.locationName,
        forecastDate: embedding.forecastDate,
        forecastHour: embedding.forecastHour,
        contentPreview: embedding.content?.substring(0, 100) + '...',
        embeddingValid: embeddingVector !== null,
        embeddingLength: embeddingVector ? embeddingVector.length : 0,
        embeddingError,
        createdAt: embedding.createdAt
      };
    });

    // 3. 전체 통계
    const totalEmbeddings = await db
      .select({ count: weatherEmbeddings.id })
      .from(weatherEmbeddings);

    const userEmbeddingsByType = userEmbeddings.reduce((acc, embedding) => {
      const type = embedding.contentType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      userId,
      totalEmbeddingsInDB: totalEmbeddings.length,
      userEmbeddingsFound: userEmbeddings.length,
      userEmbeddingsByType,
      embeddingAnalysis,
      debugInfo: {
        sampleQuery: '오늘 날씨',
        expectedMatch: userEmbeddings.length > 0 ? '사용자 데이터가 있으므로 검색 결과가 나와야 함' : '사용자 데이터가 없음',
        possibleIssues: [
          '임베딩 벡터 파싱 오류',
          '유사도 계산 오류', 
          '필터링 조건 오류',
          '벡터 검색 임계값 문제'
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 상세 벡터 디버깅 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '디버깅 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
