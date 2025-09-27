/**
 * 웹훅 라우팅 상태 확인 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherIntentDetector } from '@/lib/services/weather-intent-detector';

export async function GET(request: NextRequest) {
  try {
    // 웹훅 라우팅 시스템 상태 확인
    const testQueries = [
      "오늘 날씨 어때?",
      "내일 비가 오나?", 
      "9월 29일 날씨를 알려줘",
      "안녕하세요",
      "맛집 추천해줘"
    ];

    const detectionResults = testQueries.map(query => {
      const detection = weatherIntentDetector.detectWeatherIntent(query);
      return {
        query,
        isWeatherQuery: detection.isWeatherQuery,
        confidence: detection.confidence,
        expectedRoute: detection.isWeatherQuery ? 'weather_agent_rag' : 'claude'
      };
    });

    return NextResponse.json({
      service: "웹훅 라우팅 시스템",
      version: "1.0.0",
      status: "active",
      description: "모든 메시지를 웹훅으로 라우팅하여 통합 처리",
      routing: {
        webhook_endpoint: "/api/kakao/webhook",
        weather_detection: "자동",
        fallback_system: "claude"
      },
      detection_test: detectionResults,
      deprecated_endpoints: [
        {
          endpoint: "/api/kakao/skills/weather-rag",
          status: "deprecated",
          reason: "웹훅 통합 라우팅으로 대체됨"
        },
        {
          endpoint: "/api/kakao/skills/weather", 
          status: "deprecated",
          reason: "웹훅 통합 라우팅으로 대체됨"
        }
      ],
      setup_guide: "/KAKAO_WEBHOOK_ROUTING_GUIDE.md",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 웹훅 라우팅 상태 확인 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '웹훅 라우팅 상태 확인 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const testMessage = body.message || "오늘 날씨 어때?";
    
    console.log('🧪 웹훅 라우팅 테스트:', testMessage);
    
    // 날씨 감지 테스트
    const detection = weatherIntentDetector.detectWeatherIntent(testMessage);
    
    return NextResponse.json({
      test_message: testMessage,
      detection_result: {
        is_weather_query: detection.isWeatherQuery,
        confidence: detection.confidence,
        detected_aspects: detection.detectedAspects,
        reasoning: detection.reasoning
      },
      routing_decision: {
        target_system: detection.isWeatherQuery ? "weather_agent_rag" : "claude",
        endpoint: "/api/kakao/webhook",
        expected_response_type: detection.isWeatherQuery ? "weather_agent_rag" : "claude"
      },
      recommendation: detection.isWeatherQuery 
        ? "이 메시지는 날씨 질문으로 감지되어 에이전트 RAG 시스템으로 처리됩니다."
        : "이 메시지는 일반 대화로 감지되어 Claude 시스템으로 처리됩니다.",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 웹훅 라우팅 테스트 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '웹훅 라우팅 테스트 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
