/**
 * 벡터 검색 디버그 테스트 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { intelligentWeatherIntentAnalyzer } from '@/lib/services/intelligent-weather-intent';
import { weatherVectorDBService } from '@/lib/services/weather-vector-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const message = searchParams.get('message') || '오늘 날씨';
    const location = searchParams.get('location') || '서울';
    
    console.log('🔍 벡터 검색 디버그 테스트:', { message, location });
    
    // 1. 의도 분석
    const intent = await intelligentWeatherIntentAnalyzer.analyzeIntent(message, location);
    console.log('🧠 의도 분석 결과:', intent);
    
    // 2. 벡터 검색 실행
    const vectorResults = await weatherVectorDBService.searchSimilarWeather(
      message,
      intent.location || location
    );
    
    console.log('📊 벡터 검색 결과:', {
      count: vectorResults.length,
      results: vectorResults.map(r => ({
        id: r.id,
        content: r.content?.substring(0, 100) + '...',
        similarity: r.similarity,
        forecastDate: r.forecastDate,
        contentType: r.contentType,
        locationName: r.locationName
      }))
    });
    
    return NextResponse.json({
      success: true,
      testQuery: {
        message,
        location
      },
      intent,
      vectorSearch: {
        count: vectorResults.length,
        results: vectorResults,
        threshold: {
          minResults: 2,
          minConfidence: 0.7,
          currentMeetsThreshold: vectorResults.length >= 2 && intent.confidence > 0.7
        }
      },
      diagnosis: {
        wouldUseRAG: vectorResults.length >= 2 && intent.confidence > 0.7,
        vectorResultCount: vectorResults.length,
        intentConfidence: intent.confidence,
        issues: [
          ...(vectorResults.length < 2 ? ['벡터 검색 결과 부족 (< 2개)'] : []),
          ...(intent.confidence <= 0.7 ? ['의도 신뢰도 낮음 (<= 0.7)'] : [])
        ]
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 벡터 검색 디버그 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '벡터 검색 디버그 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
