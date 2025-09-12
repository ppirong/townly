/**
 * 카카오 웹훅 테스트 유틸리티
 * GitHub 참조 코드의 패턴을 적용한 개선된 테스트 도구
 */

export interface KakaoSkillRequest {
  intent: {
    id: string;
    name: string;
  };
  userRequest: {
    timezone: string;
    params: Record<string, any>;
    block: {
      id: string;
      name: string;
    };
    utterance: string;
    lang: string | null;
    user: {
      id: string;
      type: string;
      properties: Record<string, any>;
    };
  };
  bot: {
    id: string;
    name: string;
  };
  action: {
    name: string;
    clientExtra: any;
    params: Record<string, any>;
    id: string;
    detailParams: Record<string, any>;
  };
}

export interface KakaoSkillResponse {
  version: string;
  template: {
    outputs: Array<{
      simpleText?: {
        text: string;
      };
      basicCard?: {
        title?: string;
        description?: string;
        thumbnail?: {
          imageUrl: string;
        };
        buttons?: Array<{
          action: string;
          label: string;
          messageText?: string;
          webLinkUrl?: string;
        }>;
      };
    }>;
  };
  context?: {
    values: Record<string, any>;
  };
  data?: Record<string, any>;
}

/**
 * 표준 카카오 스킬 요청 생성
 */
export function createKakaoSkillRequest(
  utterance: string,
  userId: string = 'test_user',
  botId: string = '68bef0501c4ef66e4f5d73be'
): KakaoSkillRequest {
  return {
    intent: {
      id: "fallback_intent",
      name: "폴백 인텐트"
    },
    userRequest: {
      timezone: "Asia/Seoul",
      params: {},
      block: {
        id: "fallback_block",
        name: "폴백 블록"
      },
      utterance: utterance,
      lang: null,
      user: {
        id: userId,
        type: "accountId",
        properties: {}
      }
    },
    bot: {
      id: botId,
      name: "townly"
    },
    action: {
      name: "폴백액션",
      clientExtra: null,
      params: {},
      id: "fallback_action",
      detailParams: {}
    }
  };
}

/**
 * 표준 카카오 스킬 응답 검증
 */
export function validateKakaoSkillResponse(response: any): response is KakaoSkillResponse {
  if (!response || typeof response !== 'object') {
    return false;
  }

  // 버전 확인
  if (response.version !== "2.0") {
    return false;
  }

  // 템플릿 구조 확인
  if (!response.template || !Array.isArray(response.template.outputs)) {
    return false;
  }

  // 출력이 하나 이상 있는지 확인
  if (response.template.outputs.length === 0) {
    return false;
  }

  // 각 출력이 유효한 형식인지 확인
  for (const output of response.template.outputs) {
    if (!output.simpleText && !output.basicCard) {
      return false;
    }
  }

  return true;
}

/**
 * 웹훅 연결 테스트
 */
export async function testWebhookConnection(
  webhookUrl: string,
  testMessage: string = "테스트 메시지"
): Promise<{
  success: boolean;
  status?: number;
  response?: KakaoSkillResponse;
  error?: string;
  timing: number;
}> {
  const startTime = Date.now();
  
  try {
    const skillRequest = createKakaoSkillRequest(testMessage);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Townly-Webhook-Tester/1.0'
      },
      body: JSON.stringify(skillRequest)
    });

    const timing = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
        timing
      };
    }

    const skillResponse = await response.json();
    
    if (!validateKakaoSkillResponse(skillResponse)) {
      return {
        success: false,
        error: '잘못된 카카오 스킬 응답 형식',
        timing
      };
    }

    return {
      success: true,
      status: response.status,
      response: skillResponse,
      timing
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timing: Date.now() - startTime
    };
  }
}

/**
 * 여러 메시지로 웹훅 부하 테스트
 */
export async function loadTestWebhook(
  webhookUrl: string,
  testMessages: string[],
  concurrency: number = 5
): Promise<{
  totalTests: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  results: Array<{
    message: string;
    success: boolean;
    timing: number;
    error?: string;
  }>;
}> {
  const results = [];
  const chunks = [];
  
  // 메시지를 동시성 제한에 맞게 청크로 나누기
  for (let i = 0; i < testMessages.length; i += concurrency) {
    chunks.push(testMessages.slice(i, i + concurrency));
  }
  
  // 각 청크를 순차적으로 처리 (동시성 제한)
  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (message) => {
      const result = await testWebhookConnection(webhookUrl, message);
      return {
        message,
        success: result.success,
        timing: result.timing,
        error: result.error
      };
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }
  
  const successCount = results.filter(r => r.success).length;
  const averageResponseTime = results.reduce((sum, r) => sum + r.timing, 0) / results.length;
  
  return {
    totalTests: results.length,
    successCount,
    failureCount: results.length - successCount,
    averageResponseTime: Math.round(averageResponseTime),
    results
  };
}

/**
 * 메시지 타입별 테스트 세트
 */
export const TEST_MESSAGE_SETS = {
  basic: [
    "안녕하세요",
    "도움말",
    "고마워요",
    "파주 야당역 맛집 추천해줘"
  ],
  
  edge_cases: [
    "",
    " ",
    "a",
    "ㅁㅁㅁㅁㅁㅁㅁㅁㅁㅁ",
    "123456789".repeat(100), // 긴 메시지
    "!@#$%^&*()",
    "https://example.com",
    "010-1234-5678",
    "test@example.com"
  ],
  
  regional_queries: [
    "강남역 맛집",
    "홍대 카페",
    "신촌 술집",
    "명동 쇼핑",
    "이태원 식당",
    "압구정 브런치",
    "여의도 점심",
    "잠실 디저트"
  ]
};
