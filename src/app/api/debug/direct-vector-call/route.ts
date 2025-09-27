/**
 * 벡터 검색 함수 직접 호출 테스트
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherVectorDBService } from '@/lib/services/weather-vector-db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query = "오늘 날씨", userId = "user_33Et8gPEb8Vqp5LGTZvVAmuLVE1" } = body;

    console.log('🎯 벡터 검색 함수 직접 호출 시작');
    console.log('입력:', { query, userId });

    // 실제 벡터 검색 함수 호출
    const startTime = Date.now();
    const searchResults = await weatherVectorDBService.searchSimilarWeather(
      query,
      userId,
      ['hourly', 'daily'],
      5
    );
    const endTime = Date.now();

    console.log('🎯 벡터 검색 완료');
    console.log('결과 수:', searchResults.length);

    return NextResponse.json({
      success: true,
      input: { query, userId },
      results: {
        count: searchResults.length,
        responseTime: endTime - startTime,
        data: searchResults.map(r => ({
          id: r.id.substring(0, 8) + '...',
          similarity: r.similarity,
          contentType: r.contentType,
          locationName: r.locationName,
          forecastDate: r.forecastDate,
          forecastHour: r.forecastHour,
          contentPreview: r.content.substring(0, 100) + '...'
        }))
      },
      analysis: {
        hasResults: searchResults.length > 0,
        maxSimilarity: searchResults.length > 0 ? Math.max(...searchResults.map(r => r.similarity)) : 0,
        avgSimilarity: searchResults.length > 0 
          ? searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length 
          : 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 직접 벡터 호출 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '직접 벡터 호출 실패',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
