/**
 * LLM 기반 지능형 날씨 의도 분석 시스템
 * 정규식 대신 GPT를 활용한 정확한 날짜/시간 추출
 */

import OpenAI from 'openai';
import { env } from '@/lib/env';

export interface IntelligentWeatherIntent {
  type: 'current' | 'hourly' | 'daily' | 'forecast';
  date: string; // YYYY-MM-DD 형식
  time?: string; // HH:MM 형식
  location?: string;
  confidence: number;
  originalQuery: string;
  extractedInfo: {
    datePhrase?: string;
    timePhrase?: string;
    locationPhrase?: string;
  };
}

export class IntelligentWeatherIntentAnalyzer {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * LLM을 활용한 지능형 의도 분석
   */
  async analyzeIntent(userMessage: string, currentLocation: string = '서울'): Promise<IntelligentWeatherIntent> {
    try {
      console.log('🧠 LLM 기반 의도 분석 시작:', userMessage);
      
      const today = new Date();
      const kstToday = new Date(today.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
      const currentDate = kstToday.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentTime = kstToday.toTimeString().slice(0, 5); // HH:MM
      
      const systemPrompt = `당신은 날씨 질문 분석 전문가입니다. 사용자의 날씨 관련 질문을 분석하여 정확한 날짜, 시간, 위치를 추출하세요.

현재 정보:
- 오늘 날짜: ${currentDate} (${this.getKoreanDayOfWeek(kstToday)})
- 현재 시간: ${currentTime}
- 기본 위치: ${currentLocation}

사용자 질문: "${userMessage}"

다음 JSON 형식으로 응답하세요:
{
  "type": "current|hourly|daily|forecast",
  "date": "YYYY-MM-DD",
  "time": "HH:MM 또는 null",
  "location": "추출된 위치 또는 기본값",
  "confidence": 0.0-1.0,
  "extractedInfo": {
    "datePhrase": "날짜 관련 구문",
    "timePhrase": "시간 관련 구문",
    "locationPhrase": "위치 관련 구문"
  },
  "reasoning": "분석 근거"
}

분석 가이드라인:
1. "9월 28일" → 2025-09-28 (올해 기준)
2. "내일" → 현재일 + 1일
3. "오늘 3시" → 오늘 날짜 + 15:00
4. "오늘 밤" → 오늘 날짜 + 21:00
5. "이번 주" → forecast 타입
6. 위치가 명시되지 않으면 기본값 사용
7. confidence는 추출 정확도 (날짜/시간이 명확할수록 높음)

특별 케이스:
- "28일" (월 없음) → 현재 월의 28일
- "3시 날씨" → 오늘 15:00
- "주말" → 가장 가까운 토요일
- "비 와?" → current 타입으로 처리`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1, // 낮은 temperature로 일관성 확보
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('LLM 응답이 비어있습니다');
      }

      console.log('🤖 LLM 분석 결과:', content);

      // JSON 파싱
      const parsed = JSON.parse(content);
      
      const result: IntelligentWeatherIntent = {
        type: parsed.type || 'current',
        date: parsed.date || currentDate,
        time: parsed.time || undefined,
        location: parsed.location || currentLocation,
        confidence: parsed.confidence || 0.8,
        originalQuery: userMessage,
        extractedInfo: parsed.extractedInfo || {}
      };

      console.log('✅ 지능형 의도 분석 완료:', result);
      
      return result;

    } catch (error) {
      console.error('❌ LLM 의도 분석 실패:', error);
      
      // 폴백: 기본 의도 분석
      return this.fallbackAnalysis(userMessage, currentLocation);
    }
  }

  /**
   * LLM 실패 시 폴백 분석
   */
  private fallbackAnalysis(userMessage: string, currentLocation: string): IntelligentWeatherIntent {
    const today = new Date();
    const kstToday = new Date(today.getTime() + (9 * 60 * 60 * 1000));
    const currentDate = kstToday.toISOString().split('T')[0];

    // 간단한 패턴 매칭
    let type: IntelligentWeatherIntent['type'] = 'current';
    let date = currentDate;
    let confidence = 0.5;

    if (userMessage.includes('시간별') || userMessage.includes('매시간')) {
      type = 'hourly';
      confidence = 0.7;
    } else if (userMessage.includes('일별') || userMessage.includes('주간') || userMessage.includes('예보')) {
      type = 'forecast';
      confidence = 0.7;
    }

    // 내일 처리
    if (userMessage.includes('내일')) {
      const tomorrow = new Date(kstToday);
      tomorrow.setDate(tomorrow.getDate() + 1);
      date = tomorrow.toISOString().split('T')[0];
      confidence = 0.8;
    }

    return {
      type,
      date,
      location: currentLocation,
      confidence,
      originalQuery: userMessage,
      extractedInfo: {
        datePhrase: userMessage.includes('내일') ? '내일' : '오늘'
      }
    };
  }

  /**
   * 한국어 요일 변환
   */
  private getKoreanDayOfWeek(date: Date): string {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days[date.getDay()];
  }
}

// 싱글톤 인스턴스
export const intelligentWeatherIntentAnalyzer = new IntelligentWeatherIntentAnalyzer();
