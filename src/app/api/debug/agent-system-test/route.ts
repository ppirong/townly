/**
 * 에이전트 시스템 테스트 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentWeatherRAGService } from '@/lib/services/agent-weather-rag';

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

    if (testMode === "detailed") {
      // 상세 디버그 정보 테스트
      const debugInfo = await agentWeatherRAGService.getDetailedDebugInfo(query, userId);
      
      return NextResponse.json({
        testType: 'detailed_debug',
        query,
        userId,
        debugInfo,
        timestamp: new Date().toISOString()
      });
      
    } else if (testMode === "system_status") {
      // 시스템 상태 테스트
      const systemStatus = await agentWeatherRAGService.getSystemStatus();
      
      return NextResponse.json({
        testType: 'system_status',
        systemStatus,
        timestamp: new Date().toISOString()
      });
      
    } else {
      // 기본 에이전트 RAG 테스트
      const startTime = Date.now();
      const result = await agentWeatherRAGService.processWeatherQuery(query, '', userId);
      const endTime = Date.now();
      
      return NextResponse.json({
        testType: 'basic_agent_rag',
        query,
        userId,
        result: {
          success: result.success,
          answer: result.answer,
          confidence: result.confidence,
          method: result.method,
          sourceCount: result.sourceData.length,
          intent: result.intent,
          debugInfo: result.debugInfo
        },
        performance: {
          totalTime: endTime - startTime,
          agentProcessingTime: result.debugInfo.processingTime
        },
        qualityAssessment: {
          answerLength: result.answer.length,
          confidenceLevel: result.confidence > 0.7 ? 'high' : result.confidence > 0.5 ? 'medium' : 'low',
          qualityGrade: result.debugInfo.qualityMetrics.overallQuality > 0.8 ? 'A' : 
                       result.debugInfo.qualityMetrics.overallQuality > 0.6 ? 'B' : 
                       result.debugInfo.qualityMetrics.overallQuality > 0.4 ? 'C' : 'D',
          userSatisfactionPrediction: result.debugInfo.qualityMetrics.userSatisfactionPrediction
        },
        timestamp: new Date().toISOString()
      });
    }

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
