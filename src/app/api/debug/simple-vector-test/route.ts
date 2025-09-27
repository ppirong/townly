/**
 * 간단한 벡터 검색 테스트
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherVectorDBService } from '@/lib/services/weather-vector-db';

export async function GET() {
  try {
    console.log('🧪 간단한 벡터 검색 테스트 시작');
    
    // 가장 간단한 검색
    const results = await weatherVectorDBService.searchSimilarWeather(
      '서울 날씨',
      '서울',
      undefined, // 사용자 ID 없음
      undefined  // 콘텐츠 타입 제한 없음
    );
    
    console.log('📊 검색 결과:', results);
    
    return NextResponse.json({
      success: true,
      query: '서울 날씨',
      location: '서울',
      resultCount: results.length,
      results: results.map(r => ({
        id: r.id,
        content: r.content?.substring(0, 100),
        similarity: r.similarity,
        forecastDate: r.forecastDate,
        contentType: r.contentType,
        locationName: r.locationName
      })),
      rawResults: results.length > 0 ? results[0] : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 간단한 벡터 검색 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '벡터 검색 실패',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
