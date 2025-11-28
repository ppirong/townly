/**
 * 에이전트 시스템 테스트 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherChatbotService } from '@/lib/services/weather-chatbot';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query = "오늘 날씨를 알려줘", 
      userId = "user_33Et8gPEb8Vqp5LGTZvVAmuLVE1",
      testMode = "basic"
    } = body;

    console.log('🧪 에이전트 시스템 테스트 시작');
    console.log(`📝 테스트: "${query}" (모드: ${testMode})`);

    // 기존 weather chatbot을 사용한 기본 테스트
    const startTime = Date.now();
    const result = await weatherChatbotService.processWeatherQuery(query, userId);
    const endTime = Date.now();
    
    return NextResponse.json({
      testType: 'weather_chatbot_test',
      query,
      userId,
      result: {
        success: result.success,
        answer: result.message,
        method: 'weather_chatbot'
      },
      performance: {
        totalTime: endTime - startTime
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 에이전트 시스템 테스트 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '에이전트 시스템 테스트 실패',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
