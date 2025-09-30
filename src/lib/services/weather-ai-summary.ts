import OpenAI from 'openai';
import { env } from '@/lib/env';
import { 
  WeatherSummaryRequest, 
  WeatherDataInput, 
  WeatherSummaryResponse,
  weatherSummaryResponseSchema 
} from '@/lib/schemas/weather-summary';
import { UserHourlyWeatherData, UserDailyWeatherData } from './user-weather-collector';

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

      // JSON 응답 파싱 (디버깅 로그 추가)
      console.log('🤖 일반 AI 원시 응답:', response);
      
      let parsedResponse;
      try {
        // JSON 블록이 있는 경우 추출 시도
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : response;
        
        console.log('📝 파싱할 JSON 문자열:', jsonString);
        parsedResponse = JSON.parse(jsonString);
      } catch (error) {
        console.error('❌ 일반 JSON 파싱 실패:', error);
        console.error('❌ 실패한 응답 내용:', response);
        
        // JSON 파싱 실패 시 기본 응답 생성
        parsedResponse = {
          summary: '날씨 정보 처리 중 오류가 발생했습니다.',
          temperatureRange: '정보 없음',
          precipitationInfo: '강수 정보를 확인할 수 없습니다.',
          warnings: ['잠시 후 다시 확인해주세요.'],
          alertLevel: 'low',
          forecastPeriod: '오늘 하루'
        };
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

    return `당신은 한국의 날씨 전문가입니다. 사용자에게 간략하고 실용적인 날씨 안내를 제공해야 합니다.

현재 상황:
- 시간대: ${timeContext}
- 계절: ${season}
- 월: ${currentMonth}월

응답 규칙:
1. 간략하고 요점만 전달 (불필요한 설명 제거)
2. 구체적인 수치와 시간대 중심으로 작성
3. 실질적인 주의사항만 포함

**중요: 응답은 반드시 순수한 JSON 형식만 제공하세요. 다른 텍스트나 설명 없이 오직 JSON만 반환해야 합니다.**

응답 형식:
{
  "summary": "기온 범위와 간단한 날씨 상태만 포함 (1문장)",
  "temperatureRange": "최저기온~최고기온",
  "precipitationInfo": "강수 시간별 정보 또는 계절에 따라 '비가 오지 않습니다.' 또는 '눈이 오지 않습니다.'",
  "warnings": ["구체적인 주의사항들"],
  "alertLevel": "low|medium|high",
  "forecastPeriod": "예보 시간 범위"
}

강수 정보 작성 규칙:
- 강수량/적설량이 0이 아닌 시간이 있으면: "비가(눈이) 오는 시간은 다음과 같습니다.\n11시: 강우량 10mm, 강우 확률 30%\n16시: 적설량 20mm, 적설 확률 40%"
- 모든 시간대에서 강수량이 0이면 계절별로:
  * 겨울철 (12월-2월): "눈이 오지 않습니다."
  * 그 외 계절: "비가 오지 않습니다."

주의사항 작성 규칙:
- 밤(전날 22시-다음날 오전 6시) 강우확률 60% 이상: "창문을 잘 닫고 자야 합니다"
- 출근시간(6시-10시) 강우확률 70% 이상: "우산을 가지고 출근해야 합니다"
- 출근시간(6시-10시) 적설확률 70% 이상: "출근 시간을 조금 빨리해야 합니다"
- 풍속 15m/s 이상: "강풍에 대비해야 합니다"

주의사항:
- JSON 외의 다른 텍스트, 설명, 마크다운은 절대 포함하지 마세요
- 코드 블록(백틱 3개)도 사용하지 마세요
- 순수한 JSON만 반환하세요`;
  }

  /**
   * 날씨 프롬프트 생성
   */
  private createWeatherPrompt(request: WeatherSummaryRequest, weatherData: WeatherDataInput): string {
    let prompt = `${request.location} 지역의 ${request.startDateTime.toLocaleDateString('ko-KR')} 날씨 요약을 작성해주세요.\n\n`;

    // 기온 범위 계산
    let minTemp = Infinity;
    let maxTemp = -Infinity;
    
    // 시간별 예보 정보 추가 (강수 중심)
    if (weatherData.hourlyForecasts && weatherData.hourlyForecasts.length > 0) {
      prompt += `시간별 예보 (${request.startDateTime.toLocaleString('ko-KR', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric' 
      })} ~ ${request.endDateTime.toLocaleString('ko-KR', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric' 
      })}):\n`;
      
      // 강수가 있는 시간대만 표시하고, 온도 범위 계산
      const precipitationHours: string[] = [];
      
      weatherData.hourlyForecasts.forEach((forecast) => {
        // 온도 범위 계산
        minTemp = Math.min(minTemp, forecast.temperature);
        maxTemp = Math.max(maxTemp, forecast.temperature);
        
        // 강수량이나 적설량이 0이 아닌 경우만 추가
        if (forecast.precipitationProbability > 0) {
          const hour = forecast.dateTime.getHours();
          const precipType = forecast.conditions.includes('눈') || forecast.conditions.includes('snow') ? '적설' : '강우';
          precipitationHours.push(`${hour}시: ${precipType}량 ${forecast.precipitationProbability}mm, ${precipType} 확률 ${forecast.rainProbability || forecast.precipitationProbability}%`);
        }
        
        // 바람 정보 (15m/s 이상인 경우만)
        if (forecast.windSpeed >= 15) {
          prompt += `${forecast.dateTime.getHours()}시: 강풍 ${forecast.windSpeed}km/h\n`;
        }
      });
      
      // 강수 정보 정리
      if (precipitationHours.length > 0) {
        prompt += `강수 시간:\n${precipitationHours.join('\n')}\n`;
      } else {
        prompt += `강수: 없음\n`;
      }
      
      prompt += `기온 범위: ${minTemp}°C ~ ${maxTemp}°C\n\n`;
    }

    // 일별 예보 정보 추가 (간소화)
    if (weatherData.dailyForecasts && weatherData.dailyForecasts.length > 0) {
      prompt += `일별 예보 요약:\n`;
      
      weatherData.dailyForecasts.forEach((forecast) => {
        prompt += `${forecast.date}: ${forecast.lowTemp}°C~${forecast.highTemp}°C, ${forecast.conditions}`;
        if (forecast.precipitationProbability > 30) {
          prompt += `, 강수확률 ${forecast.precipitationProbability}%`;
        }
        prompt += '\n';
      });
      prompt += '\n';
    }

    prompt += `분석 요청사항:
1. 기온 범위(${minTemp}°C~${maxTemp}°C)를 temperatureRange에 포함
2. 강수가 있는 시간대는 precipitationInfo에 구체적으로 명시 (없으면 계절에 따라 "비가 오지 않습니다." 또는 "눈이 오지 않습니다.")
3. 다음 주의사항을 warnings에 포함:
   - 밤시간(22시-06시) 강우확률 60% 이상 → 창문 관련 안내
   - 출근시간(06시-10시) 강우확률 70% 이상 → 우산 관련 안내  
   - 출근시간(06시-10시) 적설확률 70% 이상 → 출근시간 조정 안내
   - 풍속 15m/s 이상 → 강풍 대비 안내
4. summary는 기온과 날씨상태만 간단히 (1문장)
5. 불필요한 설명이나 인사말 제거

${this.getSimplifiedAnalysisGuidelines(request.currentMonth)}`;

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
   * 간소화된 날씨 분석 가이드라인
   */
  private getSimplifiedAnalysisGuidelines(month: number): string {
    let guidelines = `주의사항 판단 기준:
- 밤시간 강우확률 60% 이상: "창문을 잘 닫고 자야 합니다"
- 출근시간 강우확률 70% 이상: "우산을 가지고 출근해야 합니다"
- 출근시간 적설확률 70% 이상: "출근 시간을 조금 빨리해야 합니다"
- 풍속 15m/s 이상: "강풍에 대비해야 합니다"`;

    if (month >= 7 && month <= 8) {
      guidelines += `
- 최고온도 35°C 이상: "폭염에 주의해야 합니다"
- 열대야 (최저온도 25°C 이상): "밤에도 더울 수 있습니다"`;
    }

    if (month === 12 || month <= 2) {
      guidelines += `
- 최저온도 -5°C 이하: "한파에 주의해야 합니다"
- 적설 예상: "눈길 교통에 주의해야 합니다"`;
    }

    return guidelines;
  }

  /**
   * 사용자별 개인화된 날씨 요약 생성
   */
  async generatePersonalizedWeatherSummary(
    request: WeatherSummaryRequest & { clerkUserId: string },
    userWeatherData: {
      hourlyForecasts: UserHourlyWeatherData[];
      dailyForecasts: UserDailyWeatherData[];
    }
  ): Promise<WeatherSummaryResponse> {
    try {
      const prompt = this.createPersonalizedWeatherPrompt(request, userWeatherData);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getPersonalizedSystemPrompt(request.timeOfDay, request.currentMonth, request.clerkUserId)
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1200,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('AI 응답을 받지 못했습니다');
      }

      // JSON 응답 파싱 (디버깅 로그 추가)
      console.log('🤖 개인화 AI 원시 응답:', response);
      
      let parsedResponse;
      try {
        // JSON 블록이 있는 경우 추출 시도
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonString = jsonMatch ? jsonMatch[1] : response;
        
        console.log('📝 파싱할 JSON 문자열:', jsonString);
        parsedResponse = JSON.parse(jsonString);
      } catch (error) {
        console.error('❌ 개인화 JSON 파싱 실패:', error);
        console.error('❌ 실패한 응답 내용:', response);
        
        // JSON 파싱 실패 시 기본 응답 생성
        parsedResponse = {
          summary: '개인화 날씨 정보 처리 중 오류가 발생했습니다.',
          temperatureRange: '정보 없음',
          precipitationInfo: '강수 정보를 확인할 수 없습니다.',
          warnings: ['일반 날씨 정보로 대체됩니다.'],
          alertLevel: 'low',
          forecastPeriod: '오늘 하루'
        };
      }

      // Zod로 응답 검증
      const validatedResponse = weatherSummaryResponseSchema.parse({
        ...parsedResponse,
        generatedAt: new Date(),
      });

      return validatedResponse;
    } catch (error) {
      console.error('Personalized Weather AI Summary Error:', error);
      
      // 개인화 요약 실패 시 일반 요약으로 폴백
      console.log('개인화 요약 실패, 일반 요약으로 폴백');
      return this.generateWeatherSummary(request, {
        hourlyForecasts: userWeatherData.hourlyForecasts.map(h => ({
          dateTime: h.dateTime,
          temperature: h.temperature,
          conditions: h.conditions,
          precipitationProbability: h.precipitationProbability,
          rainProbability: h.rainProbability,
          windSpeed: h.windSpeed,
          humidity: h.humidity,
        })),
        dailyForecasts: userWeatherData.dailyForecasts.map(d => ({
          date: d.date,
          dayOfWeek: d.dayOfWeek,
          highTemp: d.highTemp,
          lowTemp: d.lowTemp,
          conditions: d.conditions,
          precipitationProbability: d.precipitationProbability,
          rainProbability: d.rainProbability,
        }))
      });
    }
  }

  /**
   * 개인화된 시스템 프롬프트 생성
   */
  private getPersonalizedSystemPrompt(timeOfDay: 'morning' | 'evening', currentMonth: number, userId: string): string {
    const season = this.getSeason(currentMonth);
    const timeContext = timeOfDay === 'morning' ? '아침' : '저녁';

    return `당신은 한국의 개인화 날씨 전문가입니다. 특정 사용자(ID: ${userId.slice(0, 8)}...)에게 맞춤형 날씨 안내를 제공해야 합니다.

현재 상황:
- 시간대: ${timeContext}
- 계절: ${season}
- 월: ${currentMonth}월
- 사용자 ID: ${userId.slice(0, 8)}...

개인화 응답 규칙:
1. 사용자가 실제로 저장한 날씨 데이터를 기반으로 분석
2. 데이터 출처(사용자 DB vs 실시간 API)를 고려하여 신뢰도 조정
3. 사용자의 위치와 시간대에 맞는 구체적인 조언 제공
4. 친근하고 개인적인 톤으로 작성

${timeOfDay === 'morning' ? `
아침 개인화 조언:
- 사용자의 출근/일정에 맞는 준비물 안내
- 하루 종일 날씨 변화에 대한 개인 맞춤 예고
- 사용자 위치 기반 교통/이동 관련 팁
` : `
저녁 개인화 조언:
- 사용자 위치의 밤 시간대 특화 정보
- 다음 날 아침 준비를 위한 맞춤 안내
- 개인 일정을 고려한 날씨 대비책
`}

데이터 신뢰도 기준:
- 사용자 DB 데이터: 높은 신뢰도 (사용자가 실제 경험한 지역 기반)
- 실시간 API 데이터: 보통 신뢰도 (일반적인 예보)

**중요: 응답은 반드시 순수한 JSON 형식만 제공하세요. 다른 텍스트나 설명 없이 오직 JSON만 반환해야 합니다.**

응답 형식:
{
  "summary": "개인화된 기온과 날씨상태 (1문장, 사용자 친근한 톤)",
  "temperatureRange": "최저기온~최고기온",
  "precipitationInfo": "개인화된 강수 시간별 정보 또는 계절에 따라 '비가 오지 않습니다.' 또는 '눈이 오지 않습니다.'",
  "warnings": ["개인화된 구체적 주의사항들"],
  "alertLevel": "low|medium|high",
  "forecastPeriod": "개인화된 예보 기간 설명"
}

주의사항:
- JSON 외의 다른 텍스트, 설명, 마크다운은 절대 포함하지 마세요
- 코드 블록(백틱 3개)도 사용하지 마세요
- 순수한 JSON만 반환하세요`;
  }

  /**
   * 개인화된 날씨 프롬프트 생성
   */
  private createPersonalizedWeatherPrompt(
    request: WeatherSummaryRequest & { clerkUserId: string },
    userWeatherData: {
      hourlyForecasts: UserHourlyWeatherData[];
      dailyForecasts: UserDailyWeatherData[];
    }
  ): string {
    let prompt = `사용자 맞춤 ${request.location} 지역 날씨 분석을 요청합니다.\n\n`;

    // 사용자별 시간별 예보 정보 추가
    if (userWeatherData.hourlyForecasts && userWeatherData.hourlyForecasts.length > 0) {
      prompt += `개인화된 시간별 예보 (${request.startDateTime.toLocaleString('ko-KR')} ~ ${request.endDateTime.toLocaleString('ko-KR')}):\n`;
      
      userWeatherData.hourlyForecasts.forEach((forecast, index) => {
        const dataSource = forecast.source === 'user_database' ? '[사용자 저장 데이터]' : '[실시간 API]';
        prompt += `${forecast.dateTime.toLocaleString('ko-KR', { 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric' 
        })}: ${forecast.temperature}°C, ${forecast.conditions}, 강수확률 ${forecast.precipitationProbability}%`;
        
        if (forecast.rainProbability) {
          prompt += `, 비 확률 ${forecast.rainProbability}%`;
        }
        
        prompt += `, 풍속 ${forecast.windSpeed}km/h, 습도 ${forecast.humidity}% ${dataSource}\n`;
      });
      prompt += '\n';
    }

    // 사용자별 일별 예보 정보 추가
    if (userWeatherData.dailyForecasts && userWeatherData.dailyForecasts.length > 0) {
      prompt += `개인화된 일별 예보:\n`;
      
      userWeatherData.dailyForecasts.forEach((forecast) => {
        const dataSource = forecast.source === 'user_database' ? '[사용자 저장 데이터]' : '[실시간 API]';
        prompt += `${forecast.date} (${forecast.dayOfWeek}): ${forecast.lowTemp}°C ~ ${forecast.highTemp}°C, ${forecast.conditions}, 강수확률 ${forecast.precipitationProbability}%`;
        
        if (forecast.rainProbability) {
          prompt += `, 비 확률 ${forecast.rainProbability}%`;
        }
        
        prompt += ` ${dataSource}\n`;
      });
      prompt += '\n';
    }

    prompt += `개인화된 분석 요청사항:
1. 위 사용자별 날씨 정보를 바탕으로 이 사용자에게 가장 적합한 안내를 제공해주세요
2. 사용자 저장 데이터와 실시간 API 데이터의 차이점을 고려해주세요
3. 사용자가 실제로 경험할 수 있는 구체적이고 실용적인 조언을 해주세요
4. 개인적이고 친근한 톤으로 사용자에게 직접 말하는 것처럼 작성해주세요
5. 데이터 출처를 고려하여 신뢰도 높은 정보를 우선 활용해주세요

${this.getPersonalizedWeatherAnalysisGuidelines(request.currentMonth)}`;

    return prompt;
  }

  /**
   * 개인화된 날씨 분석 가이드라인
   */
  private getPersonalizedWeatherAnalysisGuidelines(month: number): string {
    let guidelines = `개인화된 날씨 분석 가이드라인:
- 사용자 저장 데이터 우선: 더 높은 신뢰도로 분석
- 실시간 API 데이터: 보완적 정보로 활용
- 강수확률 30% 이상: "우산을 챙겨주세요" (개인적 톤)
- 강수확률 60% 이상: "비가 올 가능성이 높으니 준비하세요"
- 풍속 10m/s 이상: "바람이 강하니 주의하세요"
- 풍속 15m/s 이상: "매우 강한 바람이 예상됩니다"`;

    if (month >= 7 && month <= 8) {
      guidelines += `
- 최고온도 30°C 이상: "더위에 주의하세요"
- 최고온도 35°C 이상: "폭염이 예상되니 건강 관리하세요"
- 열대야 (최저온도 25°C 이상): "밤에도 더울 것 같으니 에어컨 준비하세요"`;
    }

    if (month === 12 || month <= 2) {
      guidelines += `
- 최저온도 0°C 이하: "길이 얼 수 있으니 조심하세요"
- 최저온도 -10°C 이하: "매우 추우니 따뜻하게 입으세요"
- 적설 가능성: "눈이 올 수 있으니 교통에 주의하세요"`;
    }

    return guidelines;
  }

  /**
   * 개인화된 이메일 제목 생성
   */
  async generatePersonalizedEmailSubject(
    location: string,
    timeOfDay: 'morning' | 'evening',
    userWeatherData: UserHourlyWeatherData[],
    userId?: string
  ): Promise<string> {
    const timeText = timeOfDay === 'morning' ? '아침' : '저녁';
    const userPrefix = userId ? `[맞춤]` : '';
    
    // 주요 날씨 특징 추출
    let mainFeature = '';
    
    if (userWeatherData && userWeatherData.length > 0) {
      const firstForecast = userWeatherData[0];
      const isUserData = firstForecast.source === 'user_database';
      
      if (firstForecast.precipitationProbability >= 60) {
        mainFeature = isUserData ? '비 예상 (개인 데이터)' : '비 소식';
      } else if (firstForecast.precipitationProbability >= 30) {
        mainFeature = isUserData ? '비 가능 (개인 데이터)' : '비 가능';
      } else if (firstForecast.temperature >= 30) {
        mainFeature = isUserData ? '더위 주의 (개인 데이터)' : '더위 주의';
      } else if (firstForecast.temperature <= 0) {
        mainFeature = isUserData ? '추위 주의 (개인 데이터)' : '추위 주의';
      } else {
        mainFeature = isUserData ? '개인 맞춤 날씨' : '날씨 안내';
      }
    }

    return `${userPrefix}[${location}] ${timeText} ${mainFeature} - ${new Date().toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;
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

