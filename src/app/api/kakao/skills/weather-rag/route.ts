/**
 * 카카오 챗봇 날씨 RAG 스킬 API
 * ChatGPT와 벡터 검색을 활용한 고도화된 날씨 정보 서비스
 */

import { NextRequest, NextResponse } from 'next/server';
import { chatGPTRAGService } from '@/lib/services/chatgpt-rag';
import { weatherVectorDBService } from '@/lib/services/weather-vector-db';
import { weatherChatbotService } from '@/lib/services/weather-chatbot';
import { weatherIntentService } from '@/lib/services/weather-intent';
import { z } from 'zod';

// 카카오 스킬 요청 스키마 (기존과 동일)
const kakaoSkillRequestSchema = z.object({
  intent: z.object({
    id: z.string(),
    name: z.string(),
  }),
  userRequest: z.object({
    timezone: z.string(),
    params: z.object({
      ignoreMe: z.string().optional(),
    }).optional(),
    block: z.object({
      id: z.string(),
      name: z.string(),
    }),
    utterance: z.string(),
    lang: z.string().optional(),
    user: z.object({
      id: z.string(),
      type: z.string().optional(),
      properties: z.record(z.string(), z.string()).optional(),
    }),
  }),
  bot: z.object({
    id: z.string(),
    name: z.string(),
  }),
  action: z.object({
    name: z.string(),
    clientExtra: z.record(z.string(), z.string()).optional(),
    params: z.record(z.string(), z.string()).optional(),
    id: z.string(),
    detailParams: z.record(z.string(), z.any()).optional(),
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
    console.log('🧠 카카오 날씨 RAG 스킬 요청 수신');
    
    const body = await request.json();
    console.log('요청 데이터:', JSON.stringify(body, null, 2));
    
    // 요청 데이터 검증
    const validatedData = kakaoSkillRequestSchema.parse(body);
    
    const userMessage = validatedData.userRequest.utterance;
    const userId = validatedData.userRequest.user.id;
    const sessionId = `kakao_${userId}_${Date.now()}`;
    
    console.log('사용자 메시지:', userMessage);
    console.log('사용자 ID:', userId);
    
    // 사용자 위치 정보 추출
    const userLocation = validatedData.userRequest.user.properties?.location;
    
    // 의도 분석으로 위치 추출
    const intent = weatherIntentService.analyzeIntent(userMessage);
    const targetLocation = intent.location || userLocation || '서울';
    
    console.log('분석된 위치:', targetLocation);
    console.log('분석된 의도:', intent);

    // ChatGPT RAG로 응답 생성
    const ragResponse = await chatGPTRAGService.generateWeatherResponse(
      userMessage,
      userId,
      sessionId,
      targetLocation
    );

    console.log('RAG 응답 생성 완료:', {
      tokensUsed: ragResponse.tokensUsed,
      responseTime: ragResponse.responseTime,
      contextCount: ragResponse.context.length
    });

    // 카카오 스킬 응답 형식으로 변환
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
        quickReplies: generateSmartQuickReplies(ragResponse, targetLocation)
      }
    };

    // 고급 카드 응답 추가 (컨텍스트가 있는 경우)
    if (ragResponse.context.length > 0) {
      const topContext = ragResponse.context[0];
      
      if (topContext.metadata) {
        const meta = topContext.metadata;
        
        kakaoResponse.template.outputs.push({
          basicCard: {
            title: `${targetLocation} 상세 날씨 정보`,
            description: generateDetailedDescription(meta, topContext),
            thumbnail: {
              imageUrl: getWeatherIconUrl(meta.weatherIcon)
            },
            buttons: [
              {
                action: "message",
                label: "더 자세한 예보",
                messageText: `${targetLocation} 주간 날씨 예보 자세히 알려줘`
              },
              {
                action: "message",
                label: "옷차림 추천",
                messageText: `${targetLocation} 날씨에 맞는 옷차림 추천해줘`
              }
            ]
          }
        });
      }
    }

    // 컨텍스트 정보 저장 (사용자 선호 위치 + RAG 정보)
    kakaoResponse.context = {
      values: [
        {
          name: "user_preferred_location",
          lifeSpan: 5,
          params: {
            location: targetLocation
          }
        },
        {
          name: "rag_conversation",
          lifeSpan: 3,
          params: {
            conversationId: ragResponse.conversationId,
            tokensUsed: ragResponse.tokensUsed,
            contextCount: ragResponse.context.length
          }
        }
      ]
    };

    console.log('카카오 RAG 응답 완료');
    return NextResponse.json(kakaoResponse);
    
  } catch (error) {
    console.error('카카오 날씨 RAG 스킬 오류:', error);
    
    // 오류 발생 시 기존 시스템으로 폴백
    try {
      console.log('🔄 기존 시스템으로 폴백 시도...');
      
      const body = await request.json();
      const validatedData = kakaoSkillRequestSchema.parse(body);
      const userMessage = validatedData.userRequest.utterance;
      const userLocation = validatedData.userRequest.user.properties?.location;
      
      // 기존 챗봇 서비스로 처리
      const fallbackResponse = await weatherChatbotService.processWeatherQuery(
        userMessage,
        userLocation
      );
      
      const fallbackKakaoResponse: KakaoSkillResponse = {
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text: fallbackResponse.message + '\n\n(기본 시스템으로 응답)'
              }
            }
          ],
          quickReplies: [
            {
              label: "다시 시도",
              action: "message",
              messageText: userMessage
            },
            {
              label: "오늘 날씨",
              action: "message",
              messageText: "오늘 날씨"
            }
          ]
        }
      };
      
      return NextResponse.json(fallbackKakaoResponse);
      
    } catch (fallbackError) {
      console.error('폴백도 실패:', fallbackError);
      
      // 최종 에러 응답
      const errorResponse: KakaoSkillResponse = {
        version: "2.0",
        template: {
          outputs: [
            {
              simpleText: {
                text: "죄송합니다. 현재 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
              }
            }
          ],
          quickReplies: [
            {
              label: "다시 시도",
              action: "message",
              messageText: "오늘 날씨"
            }
          ]
        }
      };
      
      return NextResponse.json(errorResponse);
    }
  }
}

/**
 * 스마트한 빠른 응답 버튼 생성 (RAG 컨텍스트 기반)
 */
function generateSmartQuickReplies(ragResponse: any, location: string): Array<{label: string, action: string, messageText: string}> {
  const replies = [];
  
  // 컨텍스트 기반 추천
  if (ragResponse.context.length > 0) {
    const topContext = ragResponse.context[0];
    
    if (topContext.contentType === 'current') {
      replies.push({
        label: "시간별 예보",
        action: "message",
        messageText: `${location} 오늘 시간별 날씨 예보`
      });
    }
    
    if (topContext.contentType === 'daily') {
      replies.push({
        label: "주간 예보",
        action: "message",
        messageText: `${location} 이번 주 날씨 예보`
      });
    }
    
    // 강수 관련 정보가 있으면 우산 관련 질문 추가
    if (topContext.metadata?.precipitationProbability > 30) {
      replies.push({
        label: "우산 필요할까?",
        action: "message",
        messageText: "우산 가져가야 할까?"
      });
    }
    
    // 온도 정보가 있으면 옷차림 관련 질문 추가
    if (topContext.metadata?.temperature !== undefined) {
      replies.push({
        label: "옷차림 추천",
        action: "message",
        messageText: "오늘 뭐 입을까?"
      });
    }
  }
  
  // 기본 추천 (부족한 경우 채우기)
  const defaultReplies = [
    {
      label: "내일 날씨",
      action: "message",
      messageText: `${location} 내일 날씨`
    },
    {
      label: "다른 지역",
      action: "message",
      messageText: "부산 날씨"
    }
  ];
  
  // 최대 4개까지
  while (replies.length < 4 && defaultReplies.length > 0) {
    replies.push(defaultReplies.shift()!);
  }
  
  return replies.slice(0, 4);
}

/**
 * 상세 설명 생성
 */
function generateDetailedDescription(metadata: any, context: any): string {
  let description = '';
  
  if (metadata.temperature) {
    description += `온도: ${metadata.temperature}°C\n`;
  }
  
  if (metadata.highTemp && metadata.lowTemp) {
    description += `최고/최저: ${metadata.highTemp}°C/${metadata.lowTemp}°C\n`;
  }
  
  if (metadata.conditions) {
    description += `날씨: ${metadata.conditions}\n`;
  }
  
  if (metadata.precipitationProbability > 0) {
    description += `강수확률: ${metadata.precipitationProbability}%\n`;
  }
  
  if (metadata.humidity) {
    description += `습도: ${metadata.humidity}%\n`;
  }
  
  if (metadata.windSpeed > 0) {
    description += `풍속: ${metadata.windSpeed}km/h\n`;
  }
  
  description += `\n유사도: ${(context.similarity * 100).toFixed(1)}%`;
  
  return description.trim();
}

/**
 * 날씨 아이콘 URL 생성
 */
function getWeatherIconUrl(iconNumber?: number): string {
  if (!iconNumber) {
    return 'https://developer.accuweather.com/sites/default/files/01-s.png';
  }
  
  const iconString = iconNumber.toString().padStart(2, '0');
  return `https://developer.accuweather.com/sites/default/files/${iconString}-s.png`;
}

/**
 * GET 요청 처리 (스킬 상태 확인용)
 */
export async function GET() {
  try {
    // 벡터 DB 통계 조회
    const vectorStats = await weatherVectorDBService.getVectorDBStats();
    
    // 토큰 사용량 통계 조회
    const tokenStats = await chatGPTRAGService.getTokenUsageStats();
    
    return NextResponse.json({
      name: "날씨 RAG 스킬",
      version: "2.0.0",
      description: "ChatGPT와 벡터 검색을 활용한 고도화된 날씨 정보 서비스",
      endpoints: {
        skill: "/api/kakao/skills/weather-rag",
        fallback: "/api/kakao/skills/weather"
      },
      capabilities: [
        "자연어 질문 이해",
        "벡터 검색 기반 컨텍스트 제공",
        "ChatGPT 기반 개인화 응답",
        "실시간 날씨 데이터 연동",
        "다중 의도 분석",
        "스마트 추천 시스템"
      ],
      supported_locations: [
        "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
        "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
      ],
      technology_stack: {
        ai_model: "gpt-4o-mini",
        embedding_model: "text-embedding-3-small",
        vector_search: "cosine_similarity",
        database: "postgresql",
        framework: "nextjs"
      },
      statistics: {
        vector_db: vectorStats,
        token_usage: tokenStats
      },
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('RAG 스킬 상태 조회 실패:', error);
    
    return NextResponse.json({
      name: "날씨 RAG 스킬",
      version: "2.0.0",
      status: "error",
      error: "상태 조회 중 오류 발생",
      last_updated: new Date().toISOString()
    });
  }
}
