/**
 * 의도 분석 신뢰도 테스트
 */

import { NextRequest, NextResponse } from 'next/server';
import { intelligentWeatherIntentAnalyzer } from '@/lib/services/intelligent-weather-intent';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const message = searchParams.get('message') || '오늘 날씨';
    
    console.log('🧠 의도 분석 신뢰도 테스트:', message);
    
    const intent = await intelligentWeatherIntentAnalyzer.analyzeIntent(message, '서울');
    
    console.log('📊 의도 분석 결과:', intent);
    
    return NextResponse.json({
      success: true,
      message,
      intent,
      analysis: {
        confidenceLevel: intent.confidence,
        meetsThreshold: intent.confidence > 0.7,
        threshold: 0.7,
        type: intent.type,
        date: intent.date,
        location: intent.location
      },
      testCases: [
        { message: '오늘 날씨', expectedType: 'current' },
        { message: '내일 날씨', expectedType: 'daily' },
        { message: '9월 28일 날씨', expectedType: 'daily' },
        { message: '오늘 밤에 비가 와?', expectedType: 'current' }
      ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 의도 분석 테스트 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '의도 분석 테스트 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
