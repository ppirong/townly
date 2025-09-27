/**
 * 카카오 챗봇 날씨 RAG 스킬 API (범용 시스템)
 * LLM 기반 의도 분석 + 벡터 검색을 활용한 완전 자동화된 날씨 정보 서비스
 */

import { NextRequest, NextResponse } from 'next/server';
import { universalWeatherRAGService } from '@/lib/services/universal-weather-rag';
import { agentWeatherRAGService } from '@/lib/services/agent-weather-rag';
import { db } from '@/db';
import { kakaoMessages } from '@/db/schema';
import { z } from 'zod';

// 카카오 스킬 요청 스키마
const kakaoSkillRequestSchema = z.object({
  intent: z.object({
    id: z.string(),
    name: z.string(),
  }),
  userRequest: z.object({
    timezone: z.string(),
    block: z.object({
      id: z.string(),
      name: z.string(),
    }),
    utterance: z.string(),
    user: z.object({
      id: z.string(),
      properties: z.record(z.string(), z.any()).optional(),
    }),
  }),
  bot: z.object({
    id: z.string(),
    name: z.string(),
  }),
  action: z.object({
    name: z.string(),
    id: z.string(),
  }),
});

// 카카오 스킬 응답 타입
interface KakaoSkillResponse {
  version: string;
  template: {
    outputs: Array<{
      simpleText?: {
        text: string;
      };
      basicCard?: {
        title: string;
        description: string;
        thumbnail?: {
          imageUrl: string;
        };
        buttons?: Array<{
          action: string;
          label: string;
          messageText?: string;
          phoneNumber?: string;
          webLinkUrl?: string;
        }>;
      };
    }>;
    quickReplies?: Array<{
      label: string;
      action: string;
      messageText: string;
    }>;
  };
  context?: {
    values: Array<{
      name: string;
      lifeSpan: number;
      params: Record<string, any>;
    }>;
  };
  data?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🌐 범용 날씨 RAG 스킬 요청 수신');
    
    const body = await request.json();
    console.log('요청 데이터:', JSON.stringify(body, null, 2));
    
    // 요청 데이터 검증
    const validatedData = kakaoSkillRequestSchema.parse(body);
    
    const userMessage = validatedData.userRequest.utterance;
    const userId = validatedData.userRequest.user.id;
    
    console.log('사용자 메시지:', userMessage);
    console.log('사용자 ID:', userId);
    
    // 사용자 기반 시스템에서는 사용자 ID 필수
    if (!userId) {
      throw new Error('사용자 기반 날씨 RAG 시스템에서는 사용자 ID가 필수입니다.');
    }
    
    // 에이전트 기반 날씨 RAG 시스템으로 처리 (새로운 시스템)
    const ragResponse = await agentWeatherRAGService.processWeatherQuery(
      userMessage,
      '', // 위치 정보 불필요 (사용자 기반)
      userId
    );

    console.log('🤖 에이전트 RAG 응답 생성 완료:', {
      success: ragResponse.success,
      confidence: ragResponse.confidence,
      method: ragResponse.method,
      sourceDataCount: ragResponse.sourceData.length,
      intentType: ragResponse.intent.type,
      intentDate: ragResponse.intent.date,
      tokensUsed: 0, // 에이전트 시스템에서는 별도 토큰 추적 없음
      responseTime: ragResponse.debugInfo?.processingTime || 0
    });

    // 🔥 중요: 메시지를 데이터베이스에 저장 (admin 페이지에서 확인 가능)
    try {
      const messageRecord = await db.insert(kakaoMessages).values({
        userKey: userId,
        message: userMessage.trim(),
        messageType: 'text',
        aiResponse: ragResponse.answer,
        responseType: 'agent_rag',
        processingTime: `${ragResponse.debugInfo?.processingTime || 0}ms`,
        channelId: '68bef0501c4ef66e4f5d73be', // 기본 채널 ID
        rawData: validatedData,
        receivedAt: new Date(),
      }).returning({ id: kakaoMessages.id });
      
      console.log('💾 날씨 RAG 메시지와 응답이 데이터베이스에 저장되었습니다. ID:', messageRecord[0]?.id);
    } catch (dbError) {
      console.error('❌ 날씨 RAG 메시지 저장 오류:', dbError);
      // DB 오류가 있어도 응답은 정상 처리
    }

    // 카카오 응답 형식으로 변환
    const kakaoResponse: KakaoSkillResponse = {
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: ragResponse.answer
            }
          }
        ],
        quickReplies: generateSmartQuickReplies(ragResponse)
      },
      data: {
        // 디버그 정보를 data 필드에 포함
        ragInfo: {
          method: ragResponse.method,
          confidence: ragResponse.confidence,
          intentType: ragResponse.intent.type,
          sourceCount: ragResponse.sourceData.length,
          responseTime: ragResponse.debugInfo?.processingTime || 0,
          agentPipeline: ragResponse.debugInfo?.agentPipeline || [],
          qualityMetrics: ragResponse.debugInfo?.qualityMetrics || {}
        }
      }
    };

    console.log('✅ 카카오 RAG 응답 완료');
    return NextResponse.json(kakaoResponse);

  } catch (error) {
    console.error('❌ 카카오 날씨 RAG 스킬 오류:', error);
    
    // 오류 발생 시 기본 응답
    const errorResponse: KakaoSkillResponse = {
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "죄송합니다. 날씨 정보를 조회하는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
            }
          }
        ],
        quickReplies: [
          {
            label: "다시 시도",
            action: "message",
            messageText: "오늘 날씨"
          },
          {
            label: "내일 날씨",
            action: "message", 
            messageText: "내일 날씨"
          }
        ]
      }
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * 응답 결과에 따른 지능형 빠른 응답 생성
 */
function generateSmartQuickReplies(ragResponse: any): Array<{label: string; action: string; messageText: string}> {
  const intent = ragResponse.intent;
  const location = intent.location || '서울';
  
  // 기본 빠른 응답
  const baseReplies = [
    {
      label: "내일 날씨",
      action: "message",
      messageText: "내일 날씨 알려줘"
    },
    {
      label: "주간 예보", 
      action: "message",
      messageText: "이번 주 날씨 예보"
    }
  ];

  // 의도 타입에 따른 추가 빠른 응답
  if (intent.type === 'daily' || intent.type === 'current') {
    baseReplies.unshift({
      label: "시간별 날씨",
      action: "message",
      messageText: `${location} 시간별 날씨`
    });
  }
  
  if (intent.type === 'hourly') {
    baseReplies.unshift({
      label: "일별 예보",
      action: "message", 
      messageText: `${location} 일별 날씨`
    });
  }

  // 다른 위치 추천
  if (location === '서울') {
    baseReplies.push({
      label: "부산 날씨",
      action: "message",
      messageText: "부산 날씨 알려줘"
    });
  } else {
    baseReplies.push({
      label: "서울 날씨", 
      action: "message",
      messageText: "서울 날씨 알려줘"
    });
  }

  return baseReplies.slice(0, 4); // 최대 4개까지
}

export async function GET() {
  try {
    const systemStatus = await universalWeatherRAGService.getSystemStatus();
    
    return NextResponse.json({
      service: "카카오 날씨 RAG 스킬 (범용 시스템)",
      version: "3.0.0",
      description: "LLM 기반 의도 분석 + 벡터 검색을 활용한 완전 자동화된 날씨 정보 서비스",
      features: [
        "🧠 GPT-4o-mini 기반 지능형 의도 분석",
        "🔍 벡터 검색 기반 RAG",
        "🌐 실시간 API + 하이브리드 응답",
        "📅 정확한 날짜/시간 추출",
        "🎯 하드코딩 없는 범용 처리",
        "⚡ 자동 폴백 시스템"
      ],
      systemStatus,
      endpoints: {
        skill: "/api/kakao/skills/weather-rag",
        migration: "/api/admin/weather-migration",
        debug: "/api/debug/weather-rag"
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 시스템 상태 조회 실패:', error);
    
    return NextResponse.json(
      { 
        error: "시스템 상태 조회 실패",
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}