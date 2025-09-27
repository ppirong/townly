/**
 * 날씨 의도 감지 서비스
 * 사용자 메시지에서 날씨 관련 질문인지 판단
 */

export interface WeatherIntentDetection {
  isWeatherQuery: boolean;
  confidence: number;
  detectedAspects: string[];
  reasoning: string;
}

export class WeatherIntentDetector {
  
  private readonly weatherKeywords = [
    // 기본 날씨 키워드
    '날씨', '기온', '온도', '습도', '바람',
    // 날씨 상태
    '비', '눈', '구름', '햇빛', '맑', '흐림', '우천', '강수', '강우',
    // 날씨 관련 동사
    '덥', '춥', '시원', '따뜻', '쌀쌀', '무더',
    // 시간 관련
    '오늘', '내일', '모레', '어제', '이번주', '다음주',
    // 월/일 패턴
    '월', '일'
  ];

  private readonly weatherPatterns = [
    // 직접적인 날씨 질문
    /날씨.*[?？알려줘알려주세요어때어떠]/,
    /기온.*[?？알려줘알려주세요어때어떠]/,
    /온도.*[?？알려줘알려주세요어때어떠]/,
    
    // 날씨 상황 질문
    /비.*[오는온다올까내릴]/,
    /눈.*[오는온다올까내릴]/,
    /맑[은을]/,
    /흐림/,
    
    // 날짜별 날씨 질문
    /\d+월\s*\d+일.*날씨/,
    /오늘.*날씨/,
    /내일.*날씨/,
    /모레.*날씨/,
    
    // 간접적인 날씨 질문
    /우산.*[필요챙겨가져]/,
    /옷차림/,
    /외출.*날씨/
  ];

  /**
   * 메시지가 날씨 관련 질문인지 감지
   */
  detectWeatherIntent(message: string): WeatherIntentDetection {
    const normalizedMessage = message.toLowerCase().trim();
    
    let confidence = 0;
    const detectedAspects: string[] = [];
    const reasons: string[] = [];

    // 1. 키워드 기반 감지
    const keywordMatches = this.weatherKeywords.filter(keyword => 
      normalizedMessage.includes(keyword)
    );
    
    if (keywordMatches.length > 0) {
      confidence += keywordMatches.length * 0.15;
      detectedAspects.push(...keywordMatches);
      reasons.push(`날씨 키워드 발견: ${keywordMatches.join(', ')}`);
    }

    // 2. 패턴 기반 감지
    const patternMatches = this.weatherPatterns.filter(pattern => 
      pattern.test(normalizedMessage)
    );
    
    if (patternMatches.length > 0) {
      confidence += patternMatches.length * 0.3;
      reasons.push(`날씨 패턴 매칭: ${patternMatches.length}개`);
    }

    // 3. 특정 패턴 강화 (확실한 날씨 질문)
    if (/날씨.*[?？알려줘알려주세요]/.test(normalizedMessage)) {
      confidence += 0.4;
      reasons.push('확실한 날씨 질문 패턴');
    }

    if (/\d+월\s*\d+일.*날씨/.test(normalizedMessage)) {
      confidence += 0.4;
      reasons.push('날짜별 날씨 질문');
    }

    // 4. 질문 형태 확인
    if (/[?？]/.test(message) || /알려줘|알려주세요|어때|어떠/.test(normalizedMessage)) {
      confidence += 0.1;
      reasons.push('질문 형태 확인');
    }

    // 신뢰도 정규화 (최대 1.0)
    confidence = Math.min(confidence, 1.0);
    
    // 임계값 기반 판정 (0.3 이상이면 날씨 질문으로 판정)
    const isWeatherQuery = confidence >= 0.3;

    return {
      isWeatherQuery,
      confidence,
      detectedAspects,
      reasoning: reasons.join(', ')
    };
  }

  /**
   * 간단한 날씨 질문 감지 (빠른 판정용)
   */
  isSimpleWeatherQuery(message: string): boolean {
    const result = this.detectWeatherIntent(message);
    return result.isWeatherQuery;
  }

  /**
   * 날씨 질문 예시들로 테스트
   */
  static testExamples(): void {
    const detector = new WeatherIntentDetector();
    const testCases = [
      "오늘 날씨 어때?",
      "내일 비가 오나?",
      "9월 29일 날씨를 알려줘",
      "현재 기온이 어떻게 되나요?",
      "우산 챙겨야 할까?",
      "안녕하세요",
      "맛집 추천해줘",
      "날씨가 좋네요"
    ];

    console.log('🧪 날씨 의도 감지 테스트:');
    testCases.forEach(message => {
      const result = detector.detectWeatherIntent(message);
      console.log(`"${message}" -> ${result.isWeatherQuery ? '✅' : '❌'} (${result.confidence.toFixed(2)})`);
    });
  }
}

export const weatherIntentDetector = new WeatherIntentDetector();
