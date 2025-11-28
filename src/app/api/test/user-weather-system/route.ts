/**
 * 사용자 중심 날씨 시스템 테스트 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHourlyWeather, getDailyWeather } from '@/lib/services/weather';
import { weatherChatbotService } from '@/lib/services/weather-chatbot';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId = 'test-user-12345', latitude = 37.5665, longitude = 126.9780 } = body;

    console.log('🧪 사용자 중심 날씨 시스템 테스트:', { action, userId, latitude, longitude });

    if (action === 'setup') {
      // 1단계: 사용자 위치의 날씨 데이터 저장
      console.log('📍 1단계: 사용자 위치 날씨 데이터 저장');
      
      const weatherParams = {
        latitude,
        longitude,
        units: 'metric' as const,
        clerkUserId: userId
      };

      // 시간별 날씨 저장
      const hourlyResult = await getHourlyWeather({
        ...weatherParams,
        hours: 24
      });

      // 일별 날씨 저장
      const dailyResult = await getDailyWeather({
        ...weatherParams,
        days: 5
      });

      return NextResponse.json({
        success: true,
        step: 'setup',
        message: '사용자 날씨 데이터 저장 완료',
        data: {
          userId,
          location: { latitude, longitude },
          hourlyData: hourlyResult?.length || 0,
          dailyData: Array.isArray(dailyResult) ? dailyResult.length : 0
        },
        nextStep: 'POST /api/test/user-weather-system {"action": "test_rag", "userId": "' + userId + '"}'
      });

    } else if (action === 'test_rag') {
      // 2단계: 사용자 기반 RAG 테스트
      console.log('🤖 2단계: 사용자 기반 RAG 테스트');
      
      const testQueries = [
        '오늘 날씨 어때?',
        '내일 비 와?',
        '이번 주 날씨는?'
      ];

      const results = [];
      
      for (const query of testQueries) {
        try {
          const ragResponse = await weatherChatbotService.processWeatherQuery(
            query,
            userId,
            '' // 위치 불필요
          );
          
          results.push({
            query,
            success: ragResponse.success,
            method: 'weather_chatbot',
            confidence: ragResponse.confidence,
            sourceCount: ragResponse.data ? 1 : 0,
            answer: ragResponse.message.substring(0, 100) + '...'
          });
        } catch (error) {
          results.push({
            query,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        success: true,
        step: 'test_rag',
        message: '사용자 기반 RAG 테스트 완료',
        userId,
        testResults: results,
        summary: {
          totalQueries: testQueries.length,
          successfulQueries: results.filter(r => r.success).length,
          vectorSearchUsed: results.filter(r => r.method === 'vector_search').length
        }
      });

    } else {
      return NextResponse.json({
        success: true,
        message: '사용자 중심 날씨 시스템 테스트',
        availableActions: {
          setup: 'POST {"action": "setup", "userId": "your-user-id", "latitude": 37.5665, "longitude": 126.9780}',
          test_rag: 'POST {"action": "test_rag", "userId": "your-user-id"}'
        },
        description: '사용자별로 날씨 데이터를 저장하고 RAG로 개인화된 답변을 제공하는 시스템'
      });
    }

  } catch (error) {
    console.error('❌ 사용자 중심 시스템 테스트 실패:', error);
    
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
