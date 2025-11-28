/**
 * 카카오 챗봇 날씨 스킬 API
 * 사용자의 날씨 질문에 대해 데이터베이스에 저장된 날씨 정보를 기반으로 응답합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherChatbotService } from '@/lib/services/weather-chatbot';
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
    params: z.object({
      ignoreMe: z.string().optional(),
    }).optional(),
    block: z.object({
      id: z.string(),
      name: z.string(),
    }),
    utterance: z.string(), // 사용자가 입력한 텍스트
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
      params: Record<string, unknown>;
    }>;
  };
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🌤️ 카카오 날씨 스킬 요청 수신');
    
    const body = await request.json();
    console.log('요청 데이터:', JSON.stringify(body, null, 2));
    
    // 요청 데이터 검증
    const validatedData = kakaoSkillRequestSchema.parse(body);
    
    const userMessage = validatedData.userRequest.utterance;
    const userId = validatedData.userRequest.user.id;
    
    console.log('사용자 메시지:', userMessage);
    console.log('사용자 ID:', userId);
    
    // 사용자 위치 정보 추출 (사용자 속성에서)
    const userLocation = validatedData.userRequest.user.properties?.location;
    
    // 날씨 챗봇 서비스로 처리 (사용자별 데이터 지원)
    // 카카오 사용자 ID를 Clerk 사용자 ID로 매핑 (실제로는 별도 매핑 테이블 필요)
    // 임시로 카카오 사용자 ID를 그대로 사용
    const clerkUserId = userId; // 추후 실제 Clerk 사용자 ID로 매핑해야 함
    
    const weatherResponse = await weatherChatbotService.processWeatherQuery(
      userMessage,
      clerkUserId,
      userLocation || 'Seoul' // 기본값 제공
    );
    
    console.log('날씨 응답:', weatherResponse);

    // 🔥 중요: 메시지를 데이터베이스에 저장 (admin 페이지에서 확인 가능)
    try {
      const messageRecord = await db.insert(kakaoMessages).values({
        userId: userId,
        userKey: userId, // 호환성을 위해 추가
        userMessage: userMessage.trim(),
        botResponse: weatherResponse.message,
        message: userMessage.trim(), // 호환성을 위해 추가
        messageType: 'text',
        aiResponse: weatherResponse.message,
        responseType: 'weather_skill',
        processingTime: `${Date.now() - Date.now()}ms`, // 임시 처리 시간
        rawData: validatedData,
      }).returning({ id: kakaoMessages.id });
      
      console.log('💾 날씨 스킬 메시지와 응답이 데이터베이스에 저장되었습니다. ID:', messageRecord[0]?.id);
    } catch (dbError) {
      console.error('❌ 날씨 스킬 메시지 저장 오류:', dbError);
      // DB 오류가 있어도 응답은 정상 처리
    }
    
    // 카카오 스킬 응답 형식으로 변환
    const kakaoResponse: KakaoSkillResponse = {
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: weatherResponse.message
            }
          }
        ],
        quickReplies: generateQuickReplies(weatherResponse)
      }
    };
    
    // 성공한 경우 더 자세한 카드 응답 추가
    if (weatherResponse.success && weatherResponse.data) {
      const { data, confidence } = weatherResponse;
      
      // 기본 카드 추가 (날씨 정보가 있는 경우)
      if (data.type === 'current' && data.data) {
        const weather = Array.isArray(data.data) ? data.data[0] : data.data;
        
        kakaoResponse.template.outputs.push({
          basicCard: {
            title: `${data.location} 현재 날씨`,
            description: `온도: ${weather.temperature}°C\n날씨: ${weather.conditions}\n습도: ${weather.humidity || 0}%\n강수확률: ${weather.precipitationProbability || 0}%`,
            thumbnail: {
              imageUrl: getWeatherIconUrl(weather.weatherIcon)
            },
            buttons: [
              {
                action: "message",
                label: "주간 예보 보기",
                messageText: `${data.location} 주간 날씨 예보`
              }
            ]
          }
        });
      }
    }
    
    // 컨텍스트 정보 저장 (사용자 선호 위치 등)
    if (weatherResponse.success && weatherResponse.data?.location) {
      kakaoResponse.context = {
        values: [
          {
            name: "user_preferred_location",
            lifeSpan: 5,
            params: {
              location: weatherResponse.data.location
            }
          }
        ]
      };
    }
    
    console.log('카카오 응답:', JSON.stringify(kakaoResponse, null, 2));
    
    return NextResponse.json(kakaoResponse);
    
  } catch (error) {
    console.error('카카오 날씨 스킬 오류:', error);
    
    // 오류 응답
    const errorResponse: KakaoSkillResponse = {
      version: "2.0",
      template: {
        outputs: [
          {
            simpleText: {
              text: "죄송합니다. 날씨 정보를 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
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

/**
 * 빠른 응답 버튼 생성
 */
function generateQuickReplies(weatherResponse: any): Array<{label: string, action: string, messageText: string}> {
  const defaultReplies = [
    {
      label: "오늘 날씨",
      action: "message",
      messageText: "오늘 날씨 어때?"
    },
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

  // FAQ 관련 질문이 있으면 우선적으로 표시
  if (weatherResponse.relatedQuestions && weatherResponse.relatedQuestions.length > 0) {
    const relatedReplies = weatherResponse.relatedQuestions.slice(0, 3).map((question: string) => ({
      label: question.length > 10 ? question.substring(0, 10) + '...' : question,
      action: "message",
      messageText: question
    }));
    
    // 관련 질문 + 기본 질문 조합
    return [...relatedReplies, defaultReplies[0]];
  }

  // 성공한 응답의 경우 추가 옵션 제공
  if (weatherResponse.success && weatherResponse.data) {
    const additionalReplies = [];
    
    if (weatherResponse.data.type === 'current') {
      additionalReplies.push({
        label: "시간별 날씨",
        action: "message",
        messageText: "시간별 날씨 보여줘"
      });
    }
    
    additionalReplies.push({
      label: "옷차림 추천",
      action: "message", 
      messageText: "뭐 입을까?"
    });
    
    return [...defaultReplies.slice(0, 2), ...additionalReplies.slice(0, 2)];
  }

  return defaultReplies;
}

/**
 * 날씨 아이콘 URL 생성
 */
function getWeatherIconUrl(iconNumber?: number): string {
  if (!iconNumber) {
    return 'https://developer.accuweather.com/sites/default/files/01-s.png'; // 기본 맑음 아이콘
  }
  
  // AccuWeather 아이콘 URL 패턴
  const iconString = iconNumber.toString().padStart(2, '0');
  return `https://developer.accuweather.com/sites/default/files/${iconString}-s.png`;
}

/**
 * GET 요청 처리 (스킬 상태 확인용)
 */
export async function GET() {
  return NextResponse.json({
    name: "날씨 스킬",
    version: "1.0.0",
    description: "사용자의 날씨 질문에 대해 데이터베이스 기반 날씨 정보를 제공합니다.",
    endpoints: {
      skill: "/api/kakao/skills/weather"
    },
    capabilities: [
      "현재 날씨 조회",
      "시간별 날씨 예보",
      "일별 날씨 예보", 
      "주간 날씨 예보",
      "위치별 날씨 정보"
    ],
    supported_locations: [
      "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
      "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
    ],
    last_updated: new Date().toISOString()
  });
}
