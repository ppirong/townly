/**
 * 날씨 관련 사용자 의도 분석 서비스
 * 사용자의 자연어 질문을 분석하여 날씨 요청 타입을 파악합니다.
 */

export interface WeatherIntent {
  type: 'current' | 'hourly' | 'daily' | 'forecast' | 'unknown';
  location?: string;
  period?: 'today' | 'tomorrow' | 'week' | 'specific_date';
  date?: string;
  confidence: number;
}

export class WeatherIntentService {
  
  /**
   * 사용자 메시지에서 날씨 의도를 분석
   */
  analyzeIntent(message: string): WeatherIntent {
    const cleanMessage = message.toLowerCase().trim();
    
    // 날씨 관련 키워드 패턴
    const weatherKeywords = [
      '날씨', '기온', '온도', '비', '눈', '바람', '습도', 
      'weather', '미세먼지', '대기질', '강수', '맑음', '흐림'
    ];
    
    // 날씨 관련 키워드가 포함되어 있는지 확인
    const hasWeatherKeyword = weatherKeywords.some(keyword => 
      cleanMessage.includes(keyword)
    );
    
    if (!hasWeatherKeyword) {
      return {
        type: 'unknown',
        confidence: 0.1
      };
    }
    
    // 시간 관련 패턴 분석
    const timePatterns = {
      current: ['지금', '현재', '오늘 날씨', '지금 날씨', '현재 날씨'],
      hourly: ['시간별', '몇시간', '시간당', '매시간'],
      daily: ['일별', '매일', '하루', '일간'],
      forecast: ['예보', '내일', '모레', '주간', '일주일', '며칠']
    };
    
    // 위치 패턴 분석
    const locationMatch = this.extractLocation(cleanMessage);
    
    // 날짜 패턴 분석
    const { period, date } = this.extractPeriod(cleanMessage);
    
    // 의도 타입 결정
    let type: WeatherIntent['type'] = 'current';
    let confidence = 0.5;
    
    for (const [intentType, patterns] of Object.entries(timePatterns)) {
      for (const pattern of patterns) {
        if (cleanMessage.includes(pattern)) {
          type = intentType as WeatherIntent['type'];
          confidence = 0.8;
          break;
        }
      }
      if (confidence === 0.8) break;
    }
    
    // 특정 패턴으로 신뢰도 조정
    if (cleanMessage.includes('예보')) {
      confidence = Math.max(confidence, 0.9);
    }
    
    return {
      type,
      location: locationMatch,
      period,
      date,
      confidence
    };
  }
  
  /**
   * 메시지에서 위치 정보 추출
   */
  private extractLocation(message: string): string | undefined {
    const locationPatterns = [
      '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
      '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
      '강남', '강북', '송파', '마포', '영등포', '용산', '중구', '종로',
      '운정', '일산', '파주', '고양', '수원', '성남', '안양', '부천'
    ];
    
    for (const location of locationPatterns) {
      if (message.includes(location)) {
        return location;
      }
    }
    
    return undefined;
  }
  
  /**
   * 메시지에서 시간/기간 정보 추출
   */
  private extractPeriod(message: string): { period?: WeatherIntent['period'], date?: string } {
    if (message.includes('내일')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        period: 'tomorrow',
        date: tomorrow.toISOString().split('T')[0]
      };
    }
    
    if (message.includes('모레')) {
      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      return {
        period: 'specific_date',
        date: dayAfterTomorrow.toISOString().split('T')[0]
      };
    }
    
    if (message.includes('주간') || message.includes('일주일') || message.includes('7일')) {
      return { period: 'week' };
    }
    
    if (message.includes('오늘') || message.includes('지금') || message.includes('현재')) {
      return { period: 'today' };
    }
    
    return {};
  }
  
  /**
   * 의도 분석 결과를 한국어로 설명
   */
  describeIntent(intent: WeatherIntent): string {
    const { type, location, period, confidence } = intent;
    
    let description = '';
    
    switch (type) {
      case 'current':
        description = '현재 날씨 정보';
        break;
      case 'hourly':
        description = '시간별 날씨 정보';
        break;
      case 'daily':
        description = '일별 날씨 정보';
        break;
      case 'forecast':
        description = '날씨 예보 정보';
        break;
      default:
        description = '날씨 관련 질문';
    }
    
    if (location) {
      description += ` (${location})`;
    }
    
    if (period) {
      switch (period) {
        case 'today':
          description += ' - 오늘';
          break;
        case 'tomorrow':
          description += ' - 내일';
          break;
        case 'week':
          description += ' - 주간';
          break;
        case 'specific_date':
          description += ' - 특정 날짜';
          break;
      }
    }
    
    return description;
  }
}

// 싱글톤 인스턴스
export const weatherIntentService = new WeatherIntentService();
