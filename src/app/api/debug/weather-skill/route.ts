/**
 * 날씨 스킬 디버그 API
 * 카카오 챗봇 날씨 스킬을 테스트하기 위한 디버그 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherChatbotService } from '@/lib/services/weather-chatbot';
import { weatherIntentService } from '@/lib/services/weather-intent';

export async function POST(request: NextRequest) {
  try {
    const { message, location } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'message 필드가 필요합니다.' }, 
        { status: 400 }
      );
    }
    
    console.log('🧪 날씨 스킬 테스트:', { message, location });
    
    // 1. 의도 분석
    const intent = weatherIntentService.analyzeIntent(message);
    
    // 2. 날씨 정보 처리
    const weatherResponse = await weatherChatbotService.processWeatherQuery(message, location);
    
    // 3. 카카오 스킬 형식으로 응답 시뮬레이션
    const kakaoSimulation = {
      userRequest: {
        utterance: message,
        user: {
          id: 'test-user',
          properties: {
            location: location
          }
        }
      }
    };
    
    return NextResponse.json({
      success: true,
      debug: {
        originalMessage: message,
        userLocation: location,
        analyzedIntent: {
          ...intent,
          description: weatherIntentService.describeIntent(intent)
        },
        weatherResponse,
        kakaoSimulation
      },
      response: {
        text: weatherResponse.message,
        confidence: weatherResponse.confidence,
        hasData: !!weatherResponse.data
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('날씨 스킬 테스트 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '날씨 스킬 테스트 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testMessage = searchParams.get('message') || '오늘 날씨';
  const testLocation = searchParams.get('location') || '서울';
  
  try {
    // 테스트 메시지로 실행
    const intent = weatherIntentService.analyzeIntent(testMessage);
    const weatherResponse = await weatherChatbotService.processWeatherQuery(testMessage, testLocation);
    
    return NextResponse.json({
      success: true,
      testCase: {
        message: testMessage,
        location: testLocation
      },
      result: {
        intent: {
          ...intent,
          description: weatherIntentService.describeIntent(intent)
        },
        response: weatherResponse
      },
      examples: {
        messages: [
          "오늘 날씨",
          "내일 서울 날씨",
          "이번 주 날씨 예보",
          "시간별 날씨 보여줘",
          "부산 날씨 어때?",
          "모레 비 와?",
          "주간 날씨"
        ],
        locations: [
          "서울", "부산", "대구", "인천", "광주", "대전",
          "울산", "세종", "경기", "강원", "제주"
        ]
      },
      endpoints: {
        skill: "/api/kakao/skills/weather",
        debug: "/api/debug/weather-skill",
        test: "/api/debug/weather-skill?message=오늘날씨&location=서울"
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('날씨 스킬 GET 테스트 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '날씨 스킬 테스트 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
