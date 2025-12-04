import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

/**
 * Anthropic Claude API 클라이언트 초기화
 */
const anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
}) : null;

/**
 * Claude에게 메시지를 보내고 응답을 받는 함수
 */
export async function getClaudeResponse(userMessage: string, systemPrompt?: string): Promise<string> {
  try {
    // API 키가 설정되지 않은 경우
    if (!anthropic) {
      throw new Error('Claude API key is not configured');
    }
    // 시스템 프롬프트 설정 (카카오 챗봇의 컨텍스트 제공)
    const defaultSystemPrompt = `당신은 "Townly"라는 하이퍼 로컬 정보 에이전트입니다. 다음과 같은 특성을 가지고 있습니다:

🏘️ **역할**: 지역 기반 맛집, 카페, 편의시설 정보를 제공하는 친근한 AI 어시스턴트
🎯 **목표**: 사용자의 위치나 관심 지역에 맞는 정확하고 유용한 로컬 정보 제공
💬 **톤**: 친근하고 도움이 되는 톤, 이모지 적극 활용

**주요 기능**:
- 맛집 및 카페 추천 (구조화된 포맷으로)
- 지역별 편의시설 정보 제공  
- 교통 정보 안내
- 동네 생활 정보 제공

**응답 스타일 가이드라인**:
1. 🎨 **이모지 사용**: 각 카테고리와 항목에 적절한 이모지 적극 활용
2. 📝 **구조화**: 제목, 목록, 세부사항으로 체계적으로 구성
3. 🎯 **간결성**: 카카오톡 메시지 특성상 핵심 정보만 명확히
4. 🌟 **친근함**: 반말 사용하고 "~해요", "~드릴게요" 등 친근한 표현
5. 📍 **구체성**: 위치, 메뉴, 특징 등 실용적 정보 포함

**응답 포맷 예시**:
🏘️ [지역명] [요청내용]을 추천드릴게요!

🍽️ **추천 목록**

1. **🍚 [카테고리]**: '[장소명]'
   - 📍 위치: [구체적 위치]
   - 🍲 추천: [추천사항]
   - ⭐ 특징: [특별한점]

[마무리 멘트] 😊

**중요 원칙**:
- 지역명이 명확하면 해당 지역 정보를 구조화된 형태로 제공
- 지역명이 없으면 구체적인 지역을 친근하게 질문
- 정확하지 않은 정보는 제공하지 않고 일반적인 조언 제공
- 응답은 완전한 문장으로 끝내고 중간에 끊어지지 않도록 주의
- 이모지를 통해 시각적 구분과 친근감 표현

사용자가 지역 정보나 맛집 관련 질문을 하면 위 포맷에 맞춰 간단하고 완결된 답변을 제공하세요.`;

    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    // Claude API 호출 (타임아웃 설정)
    const message = await Promise.race([
      anthropic.messages.create({
        model: "claude-3-haiku-20240307", // 빠른 응답을 위해 Haiku 모델 사용
        max_tokens: 400, // 한국어 완전한 응답을 위해 증가
        temperature: 0.1, // 최대 속도를 위해 결정적 응답
        system: finalSystemPrompt,
        stop_sequences: ["이 외에도", "또한", "추가로", "더 자세한"], // 자연스러운 마무리 유도
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ],
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Claude API timeout')), 4500) // 완전한 응답을 위해 4.5초로 최적화
      )
    ]);

    // 응답 추출
    const response = message.content[0];
    
    if (response.type !== 'text' || !response.text) {
      throw new Error('Claude 응답이 비어있습니다.');
    }

    return response.text.trim();

  } catch (error) {
    console.error('Claude API 호출 중 오류:', error);
    
    // 에러 유형별 처리
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof Error) {
      if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
        return '죄송합니다. 현재 AI 서비스 설정에 문제가 있습니다. 관리자에게 문의해주세요.';
      }
      
      if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
        return '죄송합니다. 현재 AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      }
      
      if (errorMessage.includes('timeout')) {
        return '응답 처리 시간이 초과되었습니다. 좀 더 간단한 질문으로 다시 시도해주세요.';
      }

      if (errorMessage.includes('overloaded')) {
        return '죄송합니다. 현재 AI 서비스가 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
      }
    }
    
    // 기본 에러 응답
    return '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
}

/**
 * 사용자 메시지를 분석하여 맞춤형 시스템 프롬프트 생성
 */
export function generateContextualSystemPrompt(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // 맛집 관련 질문인 경우
  if (lowerMessage.includes('맛집') || lowerMessage.includes('음식') || lowerMessage.includes('식당') || lowerMessage.includes('카페') || lowerMessage.includes('레스토랑')) {
    return `당신은 "Townly" 맛집 전문 AI입니다. 사용자가 맛집 관련 질문을 했습니다.

**응답 포맷 (반드시 이 형태로 응답하세요):**

🏘️ [지역명] 맛집을 추천드릴게요!

🍽️ **추천 맛집 목록**

1. **🍚 [음식카테고리]**: '[맛집이름]'
   - 📍 위치: [구체적인 위치]
   - 🍲 추천: [추천메뉴]
   - ⭐ 평점: [특징]

2. **🍜 [음식카테고리]**: '[맛집이름]'  
   - 📍 위치: [구체적인 위치]
   - 🥟 추천: [추천메뉴]
   - 💰 가격: [가격대]

3. **🍕 [음식카테고리]**: '[맛집이름]'
   - 📍 위치: [구체적인 위치]
   - 🍕 추천: [추천메뉴]
   - 👥 분위기: [분위기]

4. **☕ 카페**: '[카페이름]'
   - 📍 위치: [구체적인 위치]
   - ☕ 추천: [추천메뉴]
   - 📚 특징: [특별한점]

🚇 모든 맛집이 [지역명]에서 도보 10분 이내예요!
더 궁금한 맛집이나 다른 정보가 필요하시면 언제든 물어보세요 😊

**중요 지침:**
- 구체적인 지역명이 있으면 해당 지역의 맛집 정보를 위 형태로 제공
- 지역명이 없으면 "어떤 지역의 맛집을 찾으시나요? 🤔"라고 질문
- 실제 존재하는 맛집이나 일반적인 예시 사용
- 이모지를 적극 활용하여 친근하게 표현
- 각 맛집마다 다른 음식 카테고리 이모지 사용 (🍚한식, 🍜중식, 🍕양식, 🍱일식, ☕카페 등)
- 정확한 정보가 없으면 "현지인 맛집", "분위기 좋은", "가성비 좋은" 등 일반적 표현 사용`;
  }
  
  // 교통/위치 관련 질문인 경우  
  if (lowerMessage.includes('교통') || lowerMessage.includes('지하철') || lowerMessage.includes('버스') || lowerMessage.includes('길찾기')) {
    return `당신은 "Townly" 교통 정보 AI입니다. 사용자가 교통 관련 질문을 했습니다.

다음 가이드라인을 따라 응답하세요:
1. 출발지와 목적지가 명확하면 교통 방법 안내
2. 정보가 부족하면 구체적인 위치 질문
3. 지하철, 버스, 도보 등 다양한 교통수단 정보 제공
4. 소요시간과 비용 정보 포함 (일반적인 수준에서)
5. 실시간 정보는 제공할 수 없음을 안내

교통 정보를 친근하고 실용적으로 제공해주세요.`;
  }

  // 날씨 관련 질문인 경우
  if (lowerMessage.includes('날씨') || lowerMessage.includes('기온') || lowerMessage.includes('비') || lowerMessage.includes('눈')) {
    return `당신은 "Townly" 날씨 정보 AI입니다. 사용자가 날씨 관련 질문을 했습니다.

다음 가이드라인을 따라 응답하세요:
1. 실시간 날씨 정보는 제공할 수 없음을 안내
2. 일반적인 계절별 날씨 정보나 옷차림 조언 제공
3. 날씨 정보를 확인할 수 있는 방법 안내
4. 친근하고 도움이 되는 톤으로 응답

날씨 관련 조언을 실용적으로 제공해주세요.`;
  }
  
  // 기본 시스템 프롬프트 반환
  return `당신은 "Townly"라는 하이퍼 로컬 정보 에이전트입니다. 사용자의 질문에 친근하고 도움이 되는 방식으로 응답해주세요.

지역 정보, 맛집, 편의시설 등에 대한 질문이면 구체적으로 도움을 주고, 
그 외의 질문이면 Townly의 주요 기능을 안내하며 지역 관련 질문을 유도해주세요.

한국어로 응답하고, 이모지를 적절히 사용하여 친근감을 표현하세요.`;
}

/**
 * Claude 응답 검증 및 후처리
 */
export function validateAndProcessResponse(response: string): string {
  // 응답 길이 제한 (카카오톡 메시지 특성상)
  if (response.length > 1000) {
    const truncated = response.substring(0, 950);
    const lastSentence = truncated.lastIndexOf('.');
    if (lastSentence > 500) {
      return truncated.substring(0, lastSentence + 1) + '\n\n더 자세한 정보가 필요하시면 추가로 질문해주세요! 😊';
    }
    return truncated + '...\n\n더 자세한 정보가 필요하시면 추가로 질문해주세요! 😊';
  }
  
  // 부적절한 내용 필터링 (기본적인 수준)
  const inappropriateWords = ['욕설', '비속어', '음란', '폭력'];
  if (inappropriateWords.some(word => response.includes(word))) {
    return '죄송합니다. 건전한 대화를 위해 다른 주제로 질문해주세요. 😊';
  }
  
  return response;
}

/**
 * Claude 응답 캐싱을 위한 키 생성
 */
export function generateCacheKey(userMessage: string): string {
  // 메시지를 정규화하여 캐시 키 생성
  const normalized = userMessage.toLowerCase().trim().replace(/\s+/g, ' ');
  return `claude_${Buffer.from(normalized).toString('base64').substring(0, 50)}`;
}
