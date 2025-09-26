/**
 * 날씨 FAQ 매칭 서비스
 * 사용자 질문과 유사한 FAQ를 매칭하여 더 자연스러운 응답을 제공합니다.
 * (간단한 룰 기반 시스템으로 구현 - 전체 RAG 시스템보다 가볍고 효율적)
 */

export interface WeatherFAQ {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  category: 'current' | 'forecast' | 'general' | 'advice';
  confidence: number;
}

export class WeatherFAQService {
  private faqs: WeatherFAQ[] = [
    {
      id: 'current-weather',
      question: '지금 날씨 어때?',
      keywords: ['지금', '현재', '오늘', '날씨', '어때', '어떤지'],
      answer: '현재 날씨 정보를 확인해드리겠습니다.',
      category: 'current',
      confidence: 0.9
    },
    {
      id: 'tomorrow-weather',
      question: '내일 날씨 어떨까?',
      keywords: ['내일', '명일', '다음날', '날씨', '어떨까', '예보'],
      answer: '내일 날씨 예보를 확인해드리겠습니다.',
      category: 'forecast',
      confidence: 0.9
    },
    {
      id: 'rain-check',
      question: '비 올까?',
      keywords: ['비', '강수', '우천', '올까', '올지', '와?', '밤', '저녁', '밤에'],
      answer: '강수 확률을 확인해드리겠습니다.',
      category: 'forecast',
      confidence: 0.8
    },
    {
      id: 'weekly-forecast',
      question: '이번 주 날씨는?',
      keywords: ['주간', '이번주', '일주일', '주', '예보', '날씨'],
      answer: '주간 날씨 예보를 확인해드리겠습니다.',
      category: 'forecast',
      confidence: 0.8
    },
    {
      id: 'clothing-advice',
      question: '뭐 입을까?',
      keywords: ['옷', '입을까', '무슨', '복장', '차림', '의류'],
      answer: '현재 기온을 고려한 옷차림을 추천해드리겠습니다.',
      category: 'advice',
      confidence: 0.7
    },
    {
      id: 'umbrella-advice',
      question: '우산 가져갈까?',
      keywords: ['우산', '가져갈까', '필요', '들고', '챙겨'],
      answer: '강수 확률을 확인해서 우산 필요 여부를 알려드리겠습니다.',
      category: 'advice',
      confidence: 0.7
    },
    {
      id: 'temperature-today',
      question: '오늘 기온은?',
      keywords: ['기온', '온도', '몇도', '따뜻', '춥', '덥'],
      answer: '현재 기온 정보를 확인해드리겠습니다.',
      category: 'current',
      confidence: 0.8
    },
    {
      id: 'air-quality',
      question: '미세먼지 어때?',
      keywords: ['미세먼지', '대기질', '공기', '황사', '스모그'],
      answer: '현재 대기질 정보는 미세먼지 페이지에서 확인하실 수 있습니다.',
      category: 'general',
      confidence: 0.6
    }
  ];

  /**
   * 사용자 질문과 가장 유사한 FAQ 찾기
   */
  findBestMatch(userMessage: string): WeatherFAQ | null {
    const cleanMessage = userMessage.toLowerCase().trim();
    let bestMatch: WeatherFAQ | null = null;
    let bestScore = 0;

    for (const faq of this.faqs) {
      const score = this.calculateSimilarity(cleanMessage, faq);
      
      if (score > bestScore && score > 0.3) { // 최소 30% 유사도
        bestScore = score;
        bestMatch = { ...faq, confidence: score };
      }
    }

    return bestMatch;
  }

  /**
   * 질문과 FAQ 간의 유사도 계산
   */
  private calculateSimilarity(userMessage: string, faq: WeatherFAQ): number {
    let score = 0;
    let keywordMatches = 0;

    // 키워드 매칭
    for (const keyword of faq.keywords) {
      if (userMessage.includes(keyword)) {
        keywordMatches++;
        score += 0.2; // 키워드 매칭당 +0.2점
      }
    }

    // 키워드 매칭 비율 보너스
    const keywordRatio = keywordMatches / faq.keywords.length;
    score += keywordRatio * 0.3;

    // 문장 길이 유사도 (너무 길거나 짧으면 패널티)
    const lengthSimilarity = Math.min(userMessage.length, faq.question.length) / 
                            Math.max(userMessage.length, faq.question.length);
    score += lengthSimilarity * 0.1;

    // 전체 문맥 유사도 (간단한 공통 단어 체크)
    const userWords = userMessage.split(/\s+/);
    const faqWords = faq.question.toLowerCase().split(/\s+/);
    const commonWords = userWords.filter(word => faqWords.includes(word));
    score += (commonWords.length / Math.max(userWords.length, faqWords.length)) * 0.2;

    return Math.min(score, 1.0); // 최대 1.0으로 제한
  }

  /**
   * 카테고리별 FAQ 목록 반환
   */
  getFAQsByCategory(category: WeatherFAQ['category']): WeatherFAQ[] {
    return this.faqs.filter(faq => faq.category === category);
  }

  /**
   * 모든 FAQ 반환
   */
  getAllFAQs(): WeatherFAQ[] {
    return [...this.faqs];
  }

  /**
   * FAQ 기반 응답 메시지 생성
   */
  generateFAQResponse(faq: WeatherFAQ, weatherData?: any): string {
    let response = faq.answer;

    // 카테고리별 추가 정보 제공
    switch (faq.category) {
      case 'forecast':
        if (faq.id === 'rain-check' && weatherData) {
          // 밤 날씨 정보가 있는지 확인
          if (Array.isArray(weatherData) && weatherData.length > 0) {
            const todayWeather = weatherData[0];
            if (todayWeather.nightWeather?.precipitationProbability !== undefined) {
              const nightRainChance = todayWeather.nightWeather.precipitationProbability;
              if (nightRainChance > 70) {
                response += ' 오늘 밤 비가 올 확률이 높습니다.';
              } else if (nightRainChance > 30) {
                response += ' 오늘 밤 비가 올 가능성이 있습니다.';
              } else {
                response += ' 오늘 밤은 비가 오지 않을 것 같습니다.';
              }
            }
          }
        }
        break;

      case 'advice':
        if (faq.id === 'clothing-advice' && weatherData?.temperature) {
          const temp = weatherData.temperature;
          if (temp < 5) {
            response += ' 기온이 매우 낮으니 두꺼운 외투와 목도리를 착용하세요.';
          } else if (temp < 15) {
            response += ' 쌀쌀하니 가벼운 외투나 자켓을 입으시는 게 좋겠어요.';
          } else if (temp < 25) {
            response += ' 적당한 기온이니 긴팔 셔츠나 가디건 정도가 적당해요.';
          } else {
            response += ' 기온이 높으니 반팔이나 얇은 옷을 입으시면 됩니다.';
          }
        } else if (faq.id === 'umbrella-advice' && weatherData?.precipitationProbability) {
          const rainChance = weatherData.precipitationProbability;
          if (rainChance > 70) {
            response += ' 강수 확률이 높으니 우산을 꼭 챙기세요.';
          } else if (rainChance > 30) {
            response += ' 비올 가능성이 있으니 접이식 우산을 준비하시는 게 좋겠어요.';
          } else {
            response += ' 강수 확률이 낮으니 우산은 필요 없을 것 같아요.';
          }
        }
        break;

      case 'general':
        if (faq.id === 'air-quality') {
          response += ' 더 자세한 대기질 정보는 "미세먼지"라고 말씀해 주세요.';
        }
        break;
    }

    return response;
  }

  /**
   * 관련 질문 추천
   */
  getRelatedQuestions(currentFaq: WeatherFAQ): string[] {
    const related: string[] = [];
    
    // 같은 카테고리의 다른 질문들
    const sameCategory = this.faqs.filter(faq => 
      faq.category === currentFaq.category && faq.id !== currentFaq.id
    );
    
    related.push(...sameCategory.slice(0, 2).map(faq => faq.question));
    
    // 다른 카테고리에서 인기 질문들
    const otherCategories = this.faqs.filter(faq => 
      faq.category !== currentFaq.category && faq.confidence > 0.8
    );
    
    related.push(...otherCategories.slice(0, 2).map(faq => faq.question));
    
    return related.slice(0, 3); // 최대 3개
  }
}

// 싱글톤 인스턴스
export const weatherFAQService = new WeatherFAQService();
