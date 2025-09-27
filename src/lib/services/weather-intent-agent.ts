/**
 * 날씨 질의 의도 분석 에이전트
 * 사용자의 질의를 깊이 분석하여 정확한 의도와 요구사항을 파악
 */

import { openaiEmbeddingService } from './openai-embedding';

export interface WeatherIntentAnalysis {
  // 기본 의도 정보
  query: string;
  primaryIntent: string; // 'current' | 'forecast' | 'comparison' | 'condition' | 'advisory'
  timeframe: string; // 'now' | 'today' | 'tomorrow' | 'week' | 'specific_date'
  
  // 상세 분석
  specificDate?: string; // YYYY-MM-DD 형식
  timeOfDay?: string; // 'morning' | 'afternoon' | 'evening' | 'night'
  weatherAspects: string[]; // ['temperature', 'precipitation', 'wind', 'humidity', 'general']
  
  // 질의 특성
  urgency: 'low' | 'medium' | 'high';
  specificity: 'general' | 'specific' | 'detailed';
  context: string; // 질의의 맥락 (외출, 운동, 빨래 등)
  
  // 기대 응답 형식
  expectedResponseType: 'simple' | 'detailed' | 'comparative' | 'advisory';
  confidence: number;
  
  // 에이전트 분석 메타데이터
  analysisReason: string;
  suggestedDataTypes: string[]; // ['hourly', 'daily', 'current']
  priorityFactors: string[];
}

export class WeatherIntentAgent {
  /**
   * 사용자 질의의 의도를 종합적으로 분석
   */
  async analyzeIntent(userQuery: string): Promise<WeatherIntentAnalysis> {
    console.log('🤖 날씨 의도 분석 에이전트 시작:', userQuery);
    
    try {
      const prompt = `
당신은 날씨 질의 의도 분석 전문 에이전트입니다. 사용자의 질의를 깊이 분석하여 정확한 의도와 요구사항을 파악해주세요.

사용자 질의: "${userQuery}"

다음 관점에서 분석해주세요:

1. 주요 의도 (Primary Intent):
   - current: 현재 날씨 상태
   - forecast: 미래 날씨 예보
   - comparison: 날씨 비교 (어제와 오늘, 지역간 등)
   - condition: 특정 조건 확인 (비, 눈, 바람 등)
   - advisory: 날씨 기반 조언 (외출, 옷차림 등)

2. 시간대 (Timeframe):
   - now: 지금 현재
   - today: 오늘
   - tomorrow: 내일
   - week: 이번 주
   - specific_date: 특정 날짜

3. 날씨 측면 (Weather Aspects):
   - temperature: 온도
   - precipitation: 강수 (비, 눈)
   - wind: 바람
   - humidity: 습도
   - general: 전반적 날씨

4. 질의 특성:
   - urgency: 긴급도 (low/medium/high)
   - specificity: 구체성 (general/specific/detailed)
   - context: 맥락 (외출, 운동, 빨래, 일반 등)

5. 기대 응답:
   - simple: 간단한 답변
   - detailed: 상세한 설명
   - comparative: 비교 정보
   - advisory: 조언과 권장사항

JSON 형식으로 응답해주세요:
{
  "primaryIntent": "...",
  "timeframe": "...",
  "specificDate": "YYYY-MM-DD (해당시)",
  "timeOfDay": "...",
  "weatherAspects": ["..."],
  "urgency": "...",
  "specificity": "...",
  "context": "...",
  "expectedResponseType": "...",
  "confidence": 0.0-1.0,
  "analysisReason": "분석 근거 설명",
  "suggestedDataTypes": ["hourly", "daily", "current"],
  "priorityFactors": ["중요 고려사항들"]
}
`;

      const response = await openaiEmbeddingService.generateChatCompletion([
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 1000
      });

      // GPT 응답에서 JSON 코드 블록 제거 후 파싱
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const analysisResult = JSON.parse(cleanResponse);
      
      const intentAnalysis: WeatherIntentAnalysis = {
        query: userQuery,
        primaryIntent: analysisResult.primaryIntent,
        timeframe: analysisResult.timeframe,
        specificDate: analysisResult.specificDate,
        timeOfDay: analysisResult.timeOfDay,
        weatherAspects: analysisResult.weatherAspects || [],
        urgency: analysisResult.urgency,
        specificity: analysisResult.specificity,
        context: analysisResult.context,
        expectedResponseType: analysisResult.expectedResponseType,
        confidence: analysisResult.confidence,
        analysisReason: analysisResult.analysisReason,
        suggestedDataTypes: analysisResult.suggestedDataTypes || ['hourly', 'daily'],
        priorityFactors: analysisResult.priorityFactors || []
      };

      console.log('🎯 의도 분석 완료:', {
        primaryIntent: intentAnalysis.primaryIntent,
        timeframe: intentAnalysis.timeframe,
        aspects: intentAnalysis.weatherAspects,
        confidence: intentAnalysis.confidence
      });

      return intentAnalysis;

    } catch (error) {
      console.error('❌ 의도 분석 실패:', error);
      
      // 폴백 분석
      return this.fallbackIntentAnalysis(userQuery);
    }
  }

  /**
   * 폴백 의도 분석 (간단한 규칙 기반)
   */
  private fallbackIntentAnalysis(userQuery: string): WeatherIntentAnalysis {
    const query = userQuery.toLowerCase();
    
    let primaryIntent = 'current';
    let timeframe = 'today';
    const weatherAspects = ['general'];
    
    // 시간 관련 키워드 분석
    if (query.includes('내일') || query.includes('tomorrow')) {
      timeframe = 'tomorrow';
      primaryIntent = 'forecast';
    } else if (query.includes('이번주') || query.includes('주간')) {
      timeframe = 'week';
      primaryIntent = 'forecast';
    } else if (query.includes('지금') || query.includes('현재')) {
      timeframe = 'now';
      primaryIntent = 'current';
    }
    
    // 날씨 측면 분석
    if (query.includes('비') || query.includes('rain')) {
      weatherAspects.push('precipitation');
    }
    if (query.includes('온도') || query.includes('춥') || query.includes('덥')) {
      weatherAspects.push('temperature');
    }
    
    return {
      query: userQuery,
      primaryIntent,
      timeframe,
      weatherAspects,
      urgency: 'medium',
      specificity: 'general',
      context: 'general',
      expectedResponseType: 'simple',
      confidence: 0.7,
      analysisReason: '폴백 규칙 기반 분석',
      suggestedDataTypes: ['hourly', 'daily'],
      priorityFactors: ['기본 날씨 정보']
    };
  }
}

export const weatherIntentAgent = new WeatherIntentAgent();
