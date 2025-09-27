/**
 * 사용자별 벡터 검색 테스트 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherVectorDBService } from '@/lib/services/weather-vector-db';
import { universalWeatherRAGService } from '@/lib/services/universal-weather-rag';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, userId } = body;

    if (!query || !userId) {
      return NextResponse.json({
        success: false,
        error: 'query와 userId가 필요합니다',
        usage: 'POST {"query": "오늘 날씨", "userId": "user-id"}'
      });
    }

    console.log('🔍 사용자별 벡터 검색 테스트:', { query, userId });

    // 1단계: 직접 벡터 검색
    console.log('1️⃣ 직접 벡터 검색 테스트');
    const vectorResults = await weatherVectorDBService.searchSimilarWeather(
      query,
      userId,
      ['hourly', 'daily'],
      5
    );

    // 2단계: 전체 RAG 시스템 테스트
    console.log('2️⃣ 전체 RAG 시스템 테스트');
    const ragResponse = await universalWeatherRAGService.processWeatherQuery(
      query,
      '', // 위치 불필요
      userId
    );

    return NextResponse.json({
      success: true,
      testResults: {
        query,
        userId,
        directVectorSearch: {
          resultCount: vectorResults.length,
          results: vectorResults.map(r => ({
            id: r.id.substring(0, 8) + '...',
            contentType: r.contentType,
            locationName: r.locationName,
            forecastDate: r.forecastDate,
            forecastHour: r.forecastHour,
            similarity: r.similarity,
            contentPreview: r.content.substring(0, 100) + '...'
          }))
        },
        fullRAGSystem: {
          success: ragResponse.success,
          method: ragResponse.method,
          confidence: ragResponse.confidence,
          sourceDataCount: ragResponse.sourceData.length,
          intentType: ragResponse.intent.type,
          answer: ragResponse.answer.substring(0, 200) + '...',
          debugInfo: ragResponse.debugInfo
        }
      },
      analysis: {
        vectorSearchWorking: vectorResults.length > 0,
        ragSystemWorking: ragResponse.success,
        usingVectorData: ragResponse.method === 'vector_search',
        issue: vectorResults.length > 0 && ragResponse.method === 'live_api' 
          ? 'RAG 시스템에서 벡터 데이터를 활용하지 못함' 
          : vectorResults.length === 0 
          ? '벡터 검색에서 사용자 데이터를 찾지 못함'
          : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 사용자별 벡터 검색 테스트 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '테스트 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
