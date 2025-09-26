/**
 * 날씨 챗봇 서비스
 * 데이터베이스에 저장된 날씨 정보를 조회하고 사용자에게 응답을 생성합니다.
 */

import { db } from '@/db';
import { hourlyWeatherData, dailyWeatherData, weatherLocationKeys } from '@/db/schema';
import { eq, and, gte, desc, asc } from 'drizzle-orm';
import { weatherIntentService, type WeatherIntent } from './weather-intent';
import { weatherFAQService } from './weather-faq';
import { getHourlyWeather, getDailyWeather } from './weather';

export interface WeatherChatbotResponse {
  success: boolean;
  message: string;
  data?: any;
  confidence: number;
  faq?: any;
  relatedQuestions?: string[];
}

export class WeatherChatbotService {
  
  /**
   * 사용자 메시지 처리 및 날씨 정보 응답 생성
   */
  async processWeatherQuery(userMessage: string, userLocation?: string): Promise<WeatherChatbotResponse> {
    try {
      // 1. FAQ 매칭 시도
      const faqMatch = weatherFAQService.findBestMatch(userMessage);
      
      // 2. 사용자 의도 분석
      const intent = weatherIntentService.analyzeIntent(userMessage);
      
      if (intent.type === 'unknown' || intent.confidence < 0.3) {
        // FAQ 매칭이 있으면 FAQ 기반 응답
        if (faqMatch && faqMatch.confidence > 0.5) {
          return {
            success: true,
            message: faqMatch.answer + '\n\n구체적인 지역을 말씀해 주시면 더 정확한 정보를 제공해드릴 수 있습니다.',
            confidence: faqMatch.confidence,
            faq: faqMatch,
            relatedQuestions: weatherFAQService.getRelatedQuestions(faqMatch)
          };
        }
        
        return {
          success: false,
          message: '죄송합니다. 날씨 관련 질문을 이해하지 못했습니다. 예: "오늘 날씨", "내일 서울 날씨", "주간 날씨 예보"',
          confidence: intent.confidence
        };
      }
      
      // 2. 위치 결정 (우선순위: 메시지 > 사용자 설정 > 기본값)
      const targetLocation = intent.location || userLocation || '서울';
      
      // 3. 의도에 따른 날씨 정보 조회
      const weatherData = await this.getWeatherByIntent(intent, targetLocation);
      
      // 4. 응답 메시지 생성
      let responseMessage = await this.formatWeatherResponse(intent, weatherData, targetLocation);
      
      // 5. FAQ 기반 추가 정보 제공
      if (faqMatch && faqMatch.confidence > 0.4) {
        const faqResponse = weatherFAQService.generateFAQResponse(faqMatch, weatherData.data);
        if (faqMatch.category === 'advice') {
          responseMessage += '\n\n💡 ' + faqResponse;
        }
      }
      
      return {
        success: true,
        message: responseMessage,
        data: weatherData,
        confidence: Math.max(intent.confidence, faqMatch?.confidence || 0),
        faq: faqMatch,
        relatedQuestions: faqMatch ? weatherFAQService.getRelatedQuestions(faqMatch) : undefined
      };
      
    } catch (error) {
      console.error('날씨 챗봇 처리 오류:', error);
      return {
        success: false,
        message: '날씨 정보를 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        confidence: 0
      };
    }
  }
  
  /**
   * 의도에 따른 날씨 정보 조회
   */
  private async getWeatherByIntent(intent: WeatherIntent, location: string): Promise<any> {
    const { type, period, date } = intent;
    
    try {
      switch (type) {
        case 'current':
          return await this.getCurrentWeather(location);
          
        case 'hourly':
          return await this.getHourlyWeatherFromDB(location);
          
        case 'daily':
        case 'forecast':
          if (period === 'week') {
            return await this.getWeeklyWeatherFromDB(location);
          } else if (period === 'tomorrow' || period === 'specific_date') {
            return await this.getDayWeatherFromDB(location, date);
          } else {
            return await this.getDailyWeatherFromDB(location);
          }
          
        default:
          return await this.getCurrentWeather(location);
      }
    } catch (error) {
      console.error('날씨 데이터 조회 오류:', error);
      // DB에서 실패하면 API에서 직접 조회
      return await this.getWeatherFromAPI(location, type);
    }
  }
  
  /**
   * 현재 날씨 정보 조회 (최신 시간별 데이터에서)
   */
  private async getCurrentWeather(location: string): Promise<any> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 데이터베이스에서 오늘의 최신 시간별 날씨 조회
    const recentWeather = await db
      .select()
      .from(hourlyWeatherData)
      .where(
        and(
          gte(hourlyWeatherData.expiresAt, now),
          eq(hourlyWeatherData.forecastDate, today),
          eq(hourlyWeatherData.locationName, location)
        )
      )
      .orderBy(desc(hourlyWeatherData.forecastDateTime))
      .limit(1);
    
    if (recentWeather.length > 0) {
      return {
        type: 'current',
        location,
        data: recentWeather[0],
        source: 'database'
      };
    }
    
    // DB에 데이터가 없으면 API에서 조회
    return await this.getWeatherFromAPI(location, 'current');
  }
  
  /**
   * 시간별 날씨 정보 조회 (DB에서)
   */
  private async getHourlyWeatherFromDB(location: string): Promise<any> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const hourlyData = await db
      .select()
      .from(hourlyWeatherData)
      .where(
        and(
          gte(hourlyWeatherData.expiresAt, now),
          eq(hourlyWeatherData.forecastDate, today),
          eq(hourlyWeatherData.locationName, location)
        )
      )
      .orderBy(asc(hourlyWeatherData.forecastDateTime))
      .limit(12); // 12시간
    
    return {
      type: 'hourly',
      location,
      data: hourlyData,
      source: 'database'
    };
  }
  
  /**
   * 일별 날씨 정보 조회 (DB에서)
   */
  private async getDailyWeatherFromDB(location: string): Promise<any> {
    const now = new Date();
    
    const dailyData = await db
      .select()
      .from(dailyWeatherData)
      .where(
        and(
          gte(dailyWeatherData.expiresAt, now),
          eq(dailyWeatherData.locationName, location)
        )
      )
      .orderBy(asc(dailyWeatherData.forecastDate))
      .limit(5); // 5일
    
    return {
      type: 'daily',
      location,
      data: dailyData,
      source: 'database'
    };
  }
  
  /**
   * 주간 날씨 정보 조회 (DB에서)
   */
  private async getWeeklyWeatherFromDB(location: string): Promise<any> {
    const now = new Date();
    
    const weeklyData = await db
      .select()
      .from(dailyWeatherData)
      .where(
        and(
          gte(dailyWeatherData.expiresAt, now),
          eq(dailyWeatherData.locationName, location)
        )
      )
      .orderBy(asc(dailyWeatherData.forecastDate))
      .limit(7); // 7일
    
    return {
      type: 'weekly',
      location,
      data: weeklyData,
      source: 'database'
    };
  }
  
  /**
   * 특정 날짜 날씨 정보 조회
   */
  private async getDayWeatherFromDB(location: string, date?: string): Promise<any> {
    if (!date) {
      return await this.getDailyWeatherFromDB(location);
    }
    
    const now = new Date();
    
    const dayData = await db
      .select()
      .from(dailyWeatherData)
      .where(
        and(
          gte(dailyWeatherData.expiresAt, now),
          eq(dailyWeatherData.forecastDate, date),
          eq(dailyWeatherData.locationName, location)
        )
      )
      .limit(1);
    
    return {
      type: 'specific_day',
      location,
      date,
      data: dayData,
      source: 'database'
    };
  }
  
  /**
   * API에서 직접 날씨 정보 조회 (DB 실패 시 백업)
   */
  private async getWeatherFromAPI(location: string, type: string): Promise<any> {
    try {
      if (type === 'hourly') {
        const hourlyData = await getHourlyWeather({ location });
        return {
          type: 'hourly',
          location,
          data: hourlyData,
          source: 'api'
        };
      } else {
        const dailyData = await getDailyWeather({ location, days: 5 });
        return {
          type: 'daily',
          location,
          data: dailyData.dailyForecasts,
          source: 'api'
        };
      }
    } catch (error) {
      console.error('API 날씨 조회 실패:', error);
      throw new Error('날씨 정보를 가져올 수 없습니다.');
    }
  }
  
  /**
   * 날씨 응답 메시지 포맷팅
   */
  private async formatWeatherResponse(intent: WeatherIntent, weatherData: any, location: string): Promise<string> {
    const { type } = intent;
    const { data, source } = weatherData;
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return `${location}의 날씨 정보를 찾을 수 없습니다. 다른 지역명을 시도해 보세요.`;
    }
    
    let response = `📍 ${location}의 날씨 정보입니다:\n\n`;
    
    switch (type) {
      case 'current':
        response += this.formatCurrentWeather(data);
        break;
        
      case 'hourly':
        response += this.formatHourlyWeather(data);
        break;
        
      case 'daily':
      case 'forecast':
        response += this.formatDailyWeather(data);
        break;
        
      default:
        response += this.formatCurrentWeather(data);
    }
    
    // 데이터 소스 정보 추가
    response += `\n\n${source === 'database' ? '📊 캐시된 데이터' : '🌐 실시간 데이터'}`;
    
    return response;
  }
  
  /**
   * 현재 날씨 포맷팅
   */
  private formatCurrentWeather(data: any): string {
    const weather = Array.isArray(data) ? data[0] : data;
    
    let response = `🌡️ 온도: ${weather.temperature}°C\n`;
    response += `☁️ 날씨: ${weather.conditions}\n`;
    
    if (weather.humidity) {
      response += `💧 습도: ${weather.humidity}%\n`;
    }
    
    if (weather.precipitationProbability > 0) {
      response += `🌧️ 강수확률: ${weather.precipitationProbability}%\n`;
    }
    
    if (weather.windSpeed > 0) {
      response += `💨 풍속: ${weather.windSpeed}km/h\n`;
    }
    
    return response;
  }
  
  /**
   * 시간별 날씨 포맷팅
   */
  private formatHourlyWeather(data: any[]): string {
    let response = '⏰ 시간별 날씨 (12시간):\n\n';
    
    data.slice(0, 6).forEach((weather, index) => {
      const hour = new Date(weather.forecastDateTime).getHours();
      response += `${hour}시: ${weather.temperature}°C, ${weather.conditions}`;
      
      if (weather.precipitationProbability > 0) {
        response += ` (강수 ${weather.precipitationProbability}%)`;
      }
      
      response += '\n';
    });
    
    return response;
  }
  
  /**
   * 일별 날씨 포맷팅
   */
  private formatDailyWeather(data: any[]): string {
    let response = '📅 일별 날씨 예보:\n\n';
    
    data.slice(0, 5).forEach((weather, index) => {
      const date = new Date(weather.forecastDate);
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dayName = dayNames[date.getDay()];
      
      if (index === 0) {
        response += `오늘 (${date.getMonth() + 1}/${date.getDate()} ${dayName}): `;
      } else if (index === 1) {
        response += `내일 (${date.getMonth() + 1}/${date.getDate()} ${dayName}): `;
      } else {
        response += `${date.getMonth() + 1}/${date.getDate()} (${dayName}): `;
      }
      
      if (weather.highTemp && weather.lowTemp) {
        response += `${weather.lowTemp}°C ~ ${weather.highTemp}°C, `;
      } else {
        response += `${weather.temperature}°C, `;
      }
      
      response += weather.conditions;
      
      if (weather.precipitationProbability > 0) {
        response += ` (강수 ${weather.precipitationProbability}%)`;
      }
      
      // 밤 날씨 정보가 있고 오늘/내일인 경우 추가 표시
      if (index <= 1 && weather.nightWeather) {
        response += `\n   🌙 밤: ${weather.nightWeather.conditions}`;
        if (weather.nightWeather.precipitationProbability > 0) {
          response += ` (강수 ${weather.nightWeather.precipitationProbability}%)`;
        }
      }
      
      response += '\n';
    });
    
    return response;
  }
}

// 싱글톤 인스턴스
export const weatherChatbotService = new WeatherChatbotService();
