/**
 * 날씨 RAG 시스템 개선을 위한 서비스
 * 특정 날짜 질문에 대한 정확한 답변 생성
 */

import { weatherChatbotService } from './weather-chatbot';
import { weatherVectorDBService } from './weather-vector-db';
import { weatherIntentService } from './weather-intent';

export interface EnhancedRAGResponse {
  success: boolean;
  answer: string;
  confidence: number;
  sourceData?: any;
  date?: string;
  location: string;
}

export class WeatherRAGEnhancer {
  
  /**
   * 특정 날짜 날씨 질문에 대한 개선된 RAG 응답 생성
   */
  async generateEnhancedResponse(
    userQuestion: string,
    location: string = '서울',
    userId?: string
  ): Promise<EnhancedRAGResponse> {
    try {
      console.log('🧠 Enhanced RAG 처리 시작:', { userQuestion, location });
      
      // 1. 의도 분석으로 날짜 추출
      const intent = weatherIntentService.analyzeIntent(userQuestion);
      console.log('🔍 분석된 의도:', intent);
      
      // 2. 기존 날씨 서비스에서 데이터 조회
      const weatherResponse = await weatherChatbotService.processWeatherQuery(
        userQuestion,
        location,
        userId
      );
      
      if (!weatherResponse.success || !weatherResponse.data) {
        return {
          success: false,
          answer: '죄송합니다. 요청하신 날짜의 날씨 정보를 찾을 수 없습니다.',
          confidence: 0.1,
          location
        };
      }
      
      // 3. 특정 날짜가 요청된 경우 해당 날짜 데이터 찾기
      if (intent.date && weatherResponse.data.data) {
        const targetDate = intent.date;
        const weatherData = Array.isArray(weatherResponse.data.data) 
          ? weatherResponse.data.data 
          : [weatherResponse.data.data];
        
        // 요청된 날짜와 일치하는 데이터 찾기
        const matchingData = this.findDateMatchingData(weatherData, targetDate);
        
        if (matchingData) {
          // 4. 구체적인 날짜 정보로 답변 생성
          const enhancedAnswer = this.generateDateSpecificAnswer(
            matchingData,
            targetDate,
            location,
            userQuestion
          );
          
          // 5. 벡터 DB에 임베딩 저장 (향후 재사용을 위해)
          try {
            await this.saveToVectorDB(matchingData, targetDate, location, userId);
          } catch (embeddingError) {
            console.warn('⚠️ 임베딩 저장 실패:', embeddingError);
          }
          
          return {
            success: true,
            answer: enhancedAnswer,
            confidence: 0.95,
            sourceData: matchingData,
            date: targetDate,
            location
          };
        }
      }
      
      // 6. 일반적인 날씨 정보 응답 (기존 로직)
      return {
        success: true,
        answer: this.enhanceGeneralWeatherResponse(weatherResponse, location),
        confidence: weatherResponse.confidence || 0.7,
        sourceData: weatherResponse.data,
        location
      };
      
    } catch (error) {
      console.error('Enhanced RAG 처리 오류:', error);
      
      return {
        success: false,
        answer: '죄송합니다. 날씨 정보 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        confidence: 0.1,
        location
      };
    }
  }
  
  /**
   * 날짜와 일치하는 날씨 데이터 찾기
   */
  private findDateMatchingData(weatherData: any[], targetDate: string): any | null {
    console.log('🔍 날짜 매칭 시도:', { targetDate, dataCount: weatherData.length });
    
    // 먼저 모든 데이터의 날짜 정보를 로깅
    weatherData.forEach((data, index) => {
      console.log(`데이터 ${index}:`, {
        timestamp: data.timestamp,
        date: data.date,
        dayOfWeek: data.dayOfWeek
      });
    });
    
    const targetDateObj = new Date(targetDate);
    const targetMonth = targetDateObj.getMonth() + 1;
    const targetDay = targetDateObj.getDate();
    const targetDateStr = `${targetMonth}월 ${targetDay}일`;
    
    console.log('🎯 찾는 날짜:', { targetDate, targetDateStr });
    
    for (const data of weatherData) {
      // 1. timestamp 필드에서 날짜 비교
      if (data.timestamp) {
        const dataDate = new Date(data.timestamp).toISOString().split('T')[0];
        if (dataDate === targetDate) {
          console.log('✅ timestamp 날짜 매칭:', dataDate);
          return data;
        }
      }
      
      // 2. date 필드가 "X월 Y일" 형식인 경우
      if (data.date && typeof data.date === 'string') {
        if (data.date === targetDateStr) {
          console.log('✅ 한국어 날짜 매칭:', data.date);
          return data;
        }
      }
      
      // 3. 부분 매칭 (28일인 경우)
      if (data.date && data.date.includes(`${targetDay}일`)) {
        console.log('✅ 부분 날짜 매칭:', data.date);
        return data;
      }
    }
    
    console.log('❌ 매칭되는 날짜 데이터 없음');
    
    // 매칭되는 데이터가 없으면 가장 가까운 미래 날짜 반환
    const futureData = weatherData.find(data => {
      if (data.timestamp) {
        const dataDate = new Date(data.timestamp);
        return dataDate >= targetDateObj;
      }
      return false;
    });
    
    if (futureData) {
      console.log('🔄 가장 가까운 미래 날짜 사용:', futureData.date || futureData.timestamp);
      return futureData;
    }
    
    return null;
  }
  
  /**
   * 특정 날짜에 대한 상세한 답변 생성
   */
  private generateDateSpecificAnswer(
    weatherData: any,
    targetDate: string,
    location: string,
    originalQuestion: string
  ): string {
    const targetDateObj = new Date(targetDate);
    const month = targetDateObj.getMonth() + 1;
    const day = targetDateObj.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][targetDateObj.getDay()];
    
    let answer = `📅 **${month}월 ${day}일 (${dayOfWeek}요일) ${location} 날씨**\n\n`;
    
    // 온도 정보
    if (weatherData.highTemp && weatherData.lowTemp) {
      answer += `🌡️ **기온**: ${weatherData.lowTemp}°C ~ ${weatherData.highTemp}°C\n`;
      answer += `📊 **평균 기온**: ${weatherData.temperature}°C\n`;
    } else if (weatherData.temperature) {
      answer += `🌡️ **기온**: ${weatherData.temperature}°C\n`;
    }
    
    // 날씨 상태
    if (weatherData.conditions) {
      answer += `☁️ **날씨**: ${weatherData.conditions}\n`;
    }
    
    // 강수 정보
    if (weatherData.precipitationProbability > 0) {
      answer += `🌧️ **강수확률**: ${weatherData.precipitationProbability}%\n`;
    }
    
    // 낮/밤 정보 추가
    if (weatherData.dayWeather || weatherData.nightWeather) {
      answer += `\n**📱 상세 예보**\n`;
      
      if (weatherData.dayWeather) {
        answer += `☀️ **낮**: ${weatherData.dayWeather.conditions}`;
        if (weatherData.dayWeather.precipitationProbability > 0) {
          answer += ` (강수 ${weatherData.dayWeather.precipitationProbability}%)`;
        }
        answer += `\n`;
      }
      
      if (weatherData.nightWeather) {
        answer += `🌙 **밤**: ${weatherData.nightWeather.conditions}`;
        if (weatherData.nightWeather.precipitationProbability > 0) {
          answer += ` (강수 ${weatherData.nightWeather.precipitationProbability}%)`;
        }
        answer += `\n`;
      }
    }
    
    // 옷차림 추천
    answer += `\n💡 **옷차림 추천**\n`;
    if (weatherData.temperature <= 10) {
      answer += `추운 날씨입니다. 두꺼운 외투와 따뜻한 옷을 입으세요.`;
    } else if (weatherData.temperature <= 20) {
      answer += `선선한 날씨입니다. 가벼운 외투나 긴팔 옷을 준비하세요.`;
    } else if (weatherData.temperature <= 25) {
      answer += `적당한 날씨입니다. 긴팔이나 얇은 겉옷이 좋겠습니다.`;
    } else {
      answer += `따뜻한 날씨입니다. 반팔이나 가벼운 옷을 입으세요.`;
    }
    
    // 우산 필요 여부
    if (weatherData.precipitationProbability > 30) {
      answer += `\n☂️ **우산 추천**: 비 올 확률이 높으니 우산을 챙기세요.`;
    }
    
    answer += `\n\n📊 *AccuWeather 제공 정보*`;
    
    return answer;
  }
  
  /**
   * 일반적인 날씨 응답 개선
   */
  private enhanceGeneralWeatherResponse(weatherResponse: any, location: string): string {
    if (!weatherResponse.success) {
      return weatherResponse.message;
    }
    
    // 기본 응답에 AI 스타일 개선 추가
    let enhancedAnswer = weatherResponse.message;
    
    // RAG 처리 중임을 표시
    enhancedAnswer += `\n\n🧠 **AI가 분석한 정보를 제공드렸습니다.**`;
    enhancedAnswer += `\n📈 더 정확한 정보를 위해 지속적으로 학습하고 있습니다.`;
    
    return enhancedAnswer;
  }
  
  /**
   * 벡터 DB에 날씨 데이터 임베딩 저장
   */
  private async saveToVectorDB(
    weatherData: any,
    targetDate: string,
    location: string,
    userId?: string
  ): Promise<void> {
    try {
      const content = `${location} ${targetDate} 날씨: ${weatherData.conditions}, 기온 ${weatherData.temperature}°C, 강수확률 ${weatherData.precipitationProbability}%`;
      
      const metadata = {
        temperature: weatherData.temperature,
        conditions: weatherData.conditions,
        precipitationProbability: weatherData.precipitationProbability,
        location,
        date: targetDate,
        highTemp: weatherData.highTemp,
        lowTemp: weatherData.lowTemp,
        weatherIcon: weatherData.weatherIcon
      };
      
      await weatherVectorDBService.createEmbedding(
        userId || 'system',
        'daily',
        location,
        targetDate,
        undefined, // forecastHour
        content,
        metadata,
        `weather_${targetDate}_${location}`
      );
      
      console.log('✅ 벡터 DB 임베딩 저장 완료');
    } catch (error) {
      console.error('❌ 벡터 DB 저장 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
export const weatherRAGEnhancer = new WeatherRAGEnhancer();
