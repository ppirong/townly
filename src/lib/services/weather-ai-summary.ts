import OpenAI from 'openai';
import { env } from '@/lib/env';
import { 
  WeatherSummaryRequest, 
  WeatherDataInput, 
  WeatherSummaryResponse,
  weatherSummaryResponseSchema 
} from '@/lib/schemas/weather-summary';

/**
 * 날씨 AI 요약 서비스
 * OpenAI GPT를 사용하여 날씨 정보를 사용자 친화적으로 요약
 */
export class WeatherAISummaryService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * 날씨 데이터를 AI로 요약
   */
  async generateWeatherSummary(
    request: WeatherSummaryRequest,
    weatherData: WeatherDataInput
  ): Promise<WeatherSummaryResponse> {
    try {
      const prompt = this.createWeatherPrompt(request, weatherData);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(request.timeOfDay, request.currentMonth)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('AI 응답을 받지 못했습니다');
      }

      // JSON 응답 파싱
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch (error) {
        throw new Error('AI 응답 형식이 올바르지 않습니다');
      }

      // Zod로 응답 검증
      const validatedResponse = weatherSummaryResponseSchema.parse({
        ...parsedResponse,
        generatedAt: new Date(),
      });

      return validatedResponse;
    } catch (error) {
      console.error('Weather AI Summary Error:', error);
      throw new Error('날씨 요약 생성 중 오류가 발생했습니다');
    }
  }

  /**
   * 시스템 프롬프트 생성
   */
  private getSystemPrompt(timeOfDay: 'morning' | 'evening', currentMonth: number): string {
    const season = this.getSeason(currentMonth);
    const timeContext = timeOfDay === 'morning' ? '아침' : '저녁';

    return `당신은 한국의 날씨 전문가입니다. 사용자에게 실용적이고 도움이 되는 날씨 안내를 제공해야 합니다.

현재 상황:
- 시간대: ${timeContext}
- 계절: ${season}
- 월: ${currentMonth}월

응답 규칙:
1. 한국어로 친근하고 이해하기 쉽게 설명
2. 실생활에 도움이 되는 구체적인 조언 제공
3. 특별히 주의해야 할 날씨 상황 강조

${timeOfDay === 'morning' ? `
아침 시간대 특화 조언:
- 출근/등교 준비에 필요한 정보 우선
- 하루 종일의 날씨 변화 예고
- 우산, 외투 등 준비물 안내
` : `
저녁 시간대 특화 조언:
- 다음 날 아침까지의 날씨 변화
- 밤 시간대 주의사항
- 다음 날 준비사항 안내
`}

계절별 중점사항:
${this.getSeasonalFocus(currentMonth)}

응답은 반드시 다음 JSON 형식으로 제공하세요:
{
  "summary": "전체 날씨 요약 (2-3문장)",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "recommendations": ["실용적 조언 1", "실용적 조언 2", "실용적 조언 3"],
  "alertLevel": "low|medium|high",
  "forecastPeriod": "예보 기간 설명"
}`;
  }

  /**
   * 날씨 프롬프트 생성
   */
  private createWeatherPrompt(request: WeatherSummaryRequest, weatherData: WeatherDataInput): string {
    let prompt = `${request.location} 지역의 날씨 정보를 분석하여 사용자에게 유용한 안내를 작성해주세요.\n\n`;

    // 시간별 예보 정보 추가
    if (weatherData.hourlyForecasts && weatherData.hourlyForecasts.length > 0) {
      prompt += `시간별 예보 (${request.startDateTime.toLocaleString('ko-KR')} ~ ${request.endDateTime.toLocaleString('ko-KR')}):\n`;
      
      weatherData.hourlyForecasts.forEach((forecast, index) => {
        prompt += `${forecast.dateTime.toLocaleString('ko-KR', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric' 
        })}: ${forecast.temperature}°C, ${forecast.conditions}, 강수확률 ${forecast.precipitationProbability}%`;
        
        if (forecast.rainProbability) {
          prompt += `, 비 확률 ${forecast.rainProbability}%`;
        }
        
        prompt += `, 풍속 ${forecast.windSpeed}km/h, 습도 ${forecast.humidity}%\n`;
      });
      prompt += '\n';
    }

    // 일별 예보 정보 추가
    if (weatherData.dailyForecasts && weatherData.dailyForecasts.length > 0) {
      prompt += `일별 예보:\n`;
      
      weatherData.dailyForecasts.forEach((forecast) => {
        prompt += `${forecast.date} (${forecast.dayOfWeek}): ${forecast.lowTemp}°C ~ ${forecast.highTemp}°C, ${forecast.conditions}, 강수확률 ${forecast.precipitationProbability}%`;
        
        if (forecast.rainProbability) {
          prompt += `, 비 확률 ${forecast.rainProbability}%`;
        }
        
        prompt += '\n';
      });
      prompt += '\n';
    }

    prompt += `분석 요청사항:
1. 위 날씨 정보를 종합하여 사용자에게 가장 중요한 내용을 요약해주세요
2. 특별히 주의해야 할 기상 상황이 있다면 강조해주세요
3. 실생활에 도움이 되는 구체적인 조언을 제공해주세요
4. 경고 수준(low/medium/high)을 적절히 판단해주세요

${this.getWeatherAnalysisGuidelines(request.currentMonth)}`;

    return prompt;
  }

  /**
   * 계절 구분
   */
  private getSeason(month: number): string {
    if (month >= 3 && month <= 5) return '봄';
    if (month >= 6 && month <= 8) return '여름';
    if (month >= 9 && month <= 11) return '가을';
    return '겨울';
  }

  /**
   * 계절별 중점사항
   */
  private getSeasonalFocus(month: number): string {
    if (month >= 7 && month <= 8) {
      return `여름철 (${month}월) 중점사항:
- 최고 온도가 30°C 이상이면 폭염 주의 안내
- 열대야 가능성 체크
- 수분 섭취 및 냉방 관련 조언`;
    }
    
    if (month === 12 || month <= 2) {
      return `겨울철 (${month}월) 중점사항:
- 최저 온도가 5°C 이하면 한파 주의 안내
- 결빙 및 눈 관련 교통 상황 고려
- 보온 및 건조 주의사항`;
    }

    if (month >= 6 && month <= 9) {
      return `장마/태풍철 중점사항:
- 강수량 및 강수확률 중점 분석
- 침수 및 교통 불편 가능성
- 우산, 방수용품 준비 안내`;
    }

    return `환절기 중점사항:
- 일교차 및 기온 변화 주의
- 적절한 의복 선택 조언
- 면역력 관리 관련 안내`;
  }

  /**
   * 날씨 분석 가이드라인
   */
  private getWeatherAnalysisGuidelines(month: number): string {
    let guidelines = `날씨 분석 가이드라인:
- 강수확률 30% 이상: 우산 준비 권장
- 강수확률 60% 이상: 비 올 가능성 높음 강조
- 풍속 10m/s 이상: 강풍 주의보 수준
- 풍속 15m/s 이상: 강풍 경보 수준`;

    if (month >= 7 && month <= 8) {
      guidelines += `
- 최고온도 30°C 이상: 더위 주의
- 최고온도 35°C 이상: 폭염 경고
- 열대야 (최저온도 25°C 이상): 수면 관련 조언`;
    }

    if (month === 12 || month <= 2) {
      guidelines += `
- 최저온도 0°C 이하: 결빙 주의
- 최저온도 -10°C 이하: 한파 경고
- 적설 가능성: 교통 및 보행 주의`;
    }

    return guidelines;
  }

  /**
   * 간단한 날씨 요약 (이메일 제목용)
   */
  async generateEmailSubject(
    location: string,
    timeOfDay: 'morning' | 'evening',
    weatherData: WeatherDataInput
  ): Promise<string> {
    const timeText = timeOfDay === 'morning' ? '아침' : '저녁';
    
    // 주요 날씨 특징 추출
    let mainFeature = '';
    
    if (weatherData.hourlyForecasts && weatherData.hourlyForecasts.length > 0) {
      const firstForecast = weatherData.hourlyForecasts[0];
      
      if (firstForecast.precipitationProbability >= 60) {
        mainFeature = '비 소식';
      } else if (firstForecast.precipitationProbability >= 30) {
        mainFeature = '비 가능';
      } else if (firstForecast.temperature >= 30) {
        mainFeature = '더위 주의';
      } else if (firstForecast.temperature <= 0) {
        mainFeature = '추위 주의';
      } else {
        mainFeature = '날씨 안내';
      }
    }

    return `[${location}] ${timeText} ${mainFeature} - ${new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;
  }
}

