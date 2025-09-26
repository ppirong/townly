/**
 * OpenAI 임베딩 서비스
 * 날씨 데이터를 벡터로 변환하고 유사도 검색을 수행합니다.
 */

import OpenAI from 'openai';
import { env } from '@/lib/env';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export interface EmbeddingResult {
  embedding: number[];
  tokensUsed: number;
}

export interface WeatherContent {
  type: 'current' | 'hourly' | 'daily' | 'forecast';
  location: string;
  date?: string;
  hour?: number;
  content: string;
  metadata: Record<string, any>;
}

export class OpenAIEmbeddingService {
  private readonly model = 'text-embedding-3-small'; // 비용 효율적인 모델

  /**
   * 텍스트를 벡터 임베딩으로 변환
   */
  async createEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      console.log('🤖 OpenAI 임베딩 생성:', text.substring(0, 100) + '...');
      
      const response = await openai.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;
      const tokensUsed = response.usage.total_tokens;

      console.log('✅ 임베딩 생성 완료:', {
        dimensions: embedding.length,
        tokensUsed
      });

      return {
        embedding,
        tokensUsed
      };
    } catch (error) {
      console.error('❌ OpenAI 임베딩 생성 실패:', error);
      throw new Error('임베딩 생성에 실패했습니다.');
    }
  }

  /**
   * 여러 텍스트를 배치로 임베딩 생성
   */
  async createBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      console.log('🤖 배치 임베딩 생성:', texts.length, '개');
      
      const response = await openai.embeddings.create({
        model: this.model,
        input: texts,
        encoding_format: 'float',
      });

      const results = response.data.map((item, index) => ({
        embedding: item.embedding,
        tokensUsed: Math.ceil(response.usage.total_tokens / texts.length) // 근사치
      }));

      console.log('✅ 배치 임베딩 생성 완료:', {
        count: results.length,
        totalTokens: response.usage.total_tokens
      });

      return results;
    } catch (error) {
      console.error('❌ 배치 임베딩 생성 실패:', error);
      throw new Error('배치 임베딩 생성에 실패했습니다.');
    }
  }

  /**
   * 날씨 데이터를 자연어 텍스트로 변환
   */
  weatherDataToText(weatherData: any, type: string): string {
    switch (type) {
      case 'current':
        return this.formatCurrentWeatherText(weatherData);
      case 'hourly':
        return this.formatHourlyWeatherText(weatherData);
      case 'daily':
        return this.formatDailyWeatherText(weatherData);
      case 'forecast':
        return this.formatForecastWeatherText(weatherData);
      default:
        return this.formatGenericWeatherText(weatherData);
    }
  }

  /**
   * 현재 날씨 텍스트 포맷
   */
  private formatCurrentWeatherText(data: any): string {
    const location = data.locationName || data.location || '알 수 없는 지역';
    const date = data.forecastDate || new Date().toISOString().split('T')[0];
    const hour = data.forecastHour || new Date().getHours();
    
    let text = `${location}의 ${date} ${hour}시 현재 날씨: `;
    text += `온도 ${data.temperature}도, `;
    text += `날씨 상태 ${data.conditions || data.weatherConditions}, `;
    
    if (data.humidity) text += `습도 ${data.humidity}%, `;
    if (data.precipitationProbability > 0) text += `강수확률 ${data.precipitationProbability}%, `;
    if (data.rainProbability > 0) text += `비확률 ${data.rainProbability}%, `;
    if (data.windSpeed > 0) text += `풍속 ${data.windSpeed}km/h, `;
    
    return text.trim().replace(/,$/, '');
  }

  /**
   * 시간별 날씨 텍스트 포맷
   */
  private formatHourlyWeatherText(data: any): string {
    const location = data.locationName || data.location || '알 수 없는 지역';
    const date = data.forecastDate || new Date().toISOString().split('T')[0];
    const hour = data.forecastHour || new Date().getHours();
    
    let text = `${location}의 ${date} ${hour}시 시간별 날씨 예보: `;
    text += `예상 온도 ${data.temperature}도, `;
    text += `날씨 ${data.conditions}, `;
    
    if (data.precipitationProbability > 0) text += `강수확률 ${data.precipitationProbability}%, `;
    if (data.humidity) text += `습도 ${data.humidity}%, `;
    
    return text.trim().replace(/,$/, '');
  }

  /**
   * 일별 날씨 텍스트 포맷
   */
  private formatDailyWeatherText(data: any): string {
    const location = data.locationName || data.location || '알 수 없는 지역';
    const date = data.forecastDate || new Date().toISOString().split('T')[0];
    const dayOfWeek = data.dayOfWeek || '';
    
    let text = `${location}의 ${date} ${dayOfWeek}요일 일별 날씨 예보: `;
    
    if (data.highTemp && data.lowTemp) {
      text += `최고기온 ${data.highTemp}도, 최저기온 ${data.lowTemp}도, `;
    } else if (data.temperature) {
      text += `온도 ${data.temperature}도, `;
    }
    
    text += `날씨 ${data.conditions}, `;
    
    if (data.precipitationProbability > 0) text += `강수확률 ${data.precipitationProbability}%, `;
    
    // 낮과 밤 날씨 정보 추가
    if (data.dayWeather) {
      text += `낮 날씨: ${data.dayWeather.conditions}`;
      if (data.dayWeather.precipitationProbability > 0) {
        text += ` (강수확률 ${data.dayWeather.precipitationProbability}%)`;
      }
      text += ', ';
    }
    
    if (data.nightWeather) {
      text += `밤 날씨: ${data.nightWeather.conditions}`;
      if (data.nightWeather.precipitationProbability > 0) {
        text += ` (강수확률 ${data.nightWeather.precipitationProbability}%)`;
      }
      text += ', ';
    }
    
    return text.trim().replace(/,$/, '');
  }

  /**
   * 예보 날씨 텍스트 포맷
   */
  private formatForecastWeatherText(data: any): string {
    const location = data.locationName || data.location || '알 수 없는 지역';
    const date = data.forecastDate || new Date().toISOString().split('T')[0];
    
    let text = `${location}의 ${date} 날씨 예보: `;
    text += `${data.conditions}, `;
    
    if (data.temperature) text += `온도 ${data.temperature}도, `;
    if (data.precipitationProbability > 0) text += `강수확률 ${data.precipitationProbability}%, `;
    
    return text.trim().replace(/,$/, '');
  }

  /**
   * 일반 날씨 텍스트 포맷
   */
  private formatGenericWeatherText(data: any): string {
    const location = data.locationName || data.location || '알 수 없는 지역';
    let text = `${location}의 날씨 정보: `;
    
    if (data.temperature) text += `온도 ${data.temperature}도, `;
    if (data.conditions) text += `날씨 ${data.conditions}, `;
    if (data.precipitationProbability > 0) text += `강수확률 ${data.precipitationProbability}%, `;
    if (data.humidity) text += `습도 ${data.humidity}%, `;
    
    return text.trim().replace(/,$/, '');
  }

  /**
   * 코사인 유사도 계산
   */
  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('벡터 차원이 일치하지 않습니다.');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * 검색 쿼리를 임베딩으로 변환
   */
  async embedQuery(query: string): Promise<number[]> {
    const result = await this.createEmbedding(query);
    return result.embedding;
  }
}

// 싱글톤 인스턴스
export const openaiEmbeddingService = new OpenAIEmbeddingService();
