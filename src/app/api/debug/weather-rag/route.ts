/**
 * 날씨 RAG 시스템 디버그 API
 * ChatGPT RAG 시스템을 테스트하기 위한 디버그 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatGPTRAGService } from '@/lib/services/chatgpt-rag';
import { weatherVectorDBService } from '@/lib/services/weather-vector-db';
import { weatherIntentService } from '@/lib/services/weather-intent';

export async function POST(request: NextRequest) {
  try {
    const { message, location, userId } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'message 필드가 필요합니다.' }, 
        { status: 400 }
      );
    }
    
    const testUserId = userId || 'test-user-rag';
    const testLocation = location || '서울';
    const sessionId = `debug_${testUserId}_${Date.now()}`;
    
    console.log('🧪 날씨 RAG 시스템 테스트:', { message, location: testLocation, userId: testUserId });
    
    // 1. 의도 분석
    const intent = weatherIntentService.analyzeIntent(message);
    
    // 2. 벡터 검색 (사용자별 필터링 적용)
    const vectorSearchResults = await weatherVectorDBService.searchSimilarWeather(
      message,
      testLocation,
      testUserId // 사용자별 필터링 적용
    );
    
    // 3. ChatGPT RAG 응답 생성
    const ragResponse = await chatGPTRAGService.generateWeatherResponse(
      message,
      testUserId,
      sessionId,
      testLocation
    );
    
    // 4. 벡터 DB 통계
    const vectorStats = await weatherVectorDBService.getVectorDBStats();
    
    return NextResponse.json({
      success: true,
      debug: {
        originalMessage: message,
        userLocation: testLocation,
        analyzedIntent: {
          ...intent,
          description: weatherIntentService.describeIntent(intent)
        },
        vectorSearch: {
          query: message,
          results: vectorSearchResults,
          count: vectorSearchResults.length,
          topSimilarity: vectorSearchResults[0]?.similarity || 0
        },
        ragResponse: {
          answer: ragResponse.answer,
          contextCount: ragResponse.context.length,
          tokensUsed: ragResponse.tokensUsed,
          responseTime: ragResponse.responseTime,
          conversationId: ragResponse.conversationId
        },
        vectorDBStats: vectorStats
      },
      response: {
        text: ragResponse.answer,
        confidence: ragResponse.context.length > 0 ? ragResponse.context[0].similarity : 0,
        hasContext: ragResponse.context.length > 0,
        contextSources: ragResponse.context.map(c => ({
          type: c.contentType,
          location: c.locationName,
          similarity: c.similarity
        }))
      },
      performance: {
        tokensUsed: ragResponse.tokensUsed,
        responseTime: ragResponse.responseTime,
        vectorSearchCount: vectorSearchResults.length,
        avgSimilarity: vectorSearchResults.length > 0 
          ? vectorSearchResults.reduce((sum, r) => sum + r.similarity, 0) / vectorSearchResults.length 
          : 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('날씨 RAG 테스트 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '날씨 RAG 테스트 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testMessage = searchParams.get('message') || '오늘 밤에 비가 와?';
  const testLocation = searchParams.get('location') || '서울';
  const userId = searchParams.get('userId') || 'test-user-get';
  
  try {
    // 기본 테스트 실행
    const intent = weatherIntentService.analyzeIntent(testMessage);
    const vectorSearchResults = await weatherVectorDBService.searchSimilarWeather(
      testMessage,
      userId, // 사용자별 필터링 적용
      ['daily', 'hourly', 'current'] // 콘텐츠 타입 필터링
    );
    
    const sessionId = `debug_get_${userId}_${Date.now()}`;
    const ragResponse = await chatGPTRAGService.generateWeatherResponse(
      testMessage,
      userId,
      sessionId,
      testLocation
    );
    
    // 시스템 상태 정보
    const vectorStats = await weatherVectorDBService.getVectorDBStats();
    const tokenStats = await chatGPTRAGService.getTokenUsageStats();
    
    return NextResponse.json({
      success: true,
      testCase: {
        message: testMessage,
        location: testLocation,
        userId
      },
      result: {
        intent: {
          ...intent,
          description: weatherIntentService.describeIntent(intent)
        },
        vectorSearch: vectorSearchResults,
        ragResponse
      },
      systemStatus: {
        vectorDB: vectorStats,
        tokenUsage: tokenStats
      },
      examples: {
        messages: [
          "오늘 밤에 비가 와?",
          "내일 서울 날씨 어떨까?",
          "이번 주 날씨 예보 알려줘",
          "부산 날씨 어때?",
          "옷 뭐 입을까?",
          "우산 가져갈까?",
          "주말에 비 와?"
        ],
        locations: [
          "서울", "부산", "대구", "인천", "광주", "대전",
          "울산", "세종", "경기", "강원", "제주"
        ]
      },
      endpoints: {
        ragSkill: "/api/kakao/skills/weather-rag",
        basicSkill: "/api/kakao/skills/weather",
        debug: "/api/debug/weather-rag",
        migrate: "/api/admin/vector-db/migrate"
      },
      documentation: {
        ragSystem: "ChatGPT + 벡터 검색 기반 날씨 정보 제공",
        embedding: "OpenAI text-embedding-3-small 모델 사용",
        chatModel: "GPT-4o-mini 모델 사용",
        vectorDB: "PostgreSQL + 코사인 유사도 검색"
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('날씨 RAG GET 테스트 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '날씨 RAG 테스트 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}
