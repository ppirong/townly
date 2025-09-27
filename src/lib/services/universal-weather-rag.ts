/**
 * 범용 날씨 RAG 시스템
 * 하드코딩 없이 LLM 기반 의도 분석 + 벡터 검색으로 모든 날씨 질문 처리
 */

import { intelligentWeatherIntentAnalyzer, IntelligentWeatherIntent } from './intelligent-weather-intent';
import { weatherVectorDBService } from './weather-vector-db';
import { simpleWeatherVectorDBService } from './weather-vector-db-simple';
import { chatGPTRAGService } from './chatgpt-rag';
import { weatherChatbotService } from './weather-chatbot';

export interface UniversalRAGResponse {
  success: boolean;
  answer: string;
  confidence: number;
  method: 'vector_search' | 'live_api' | 'hybrid';
  sourceData: any[];
  intent: IntelligentWeatherIntent;
  debugInfo?: {
    vectorResults: number;
    tokensUsed: number;
    responseTime: number;
  };
}

export class UniversalWeatherRAGService {

  /**
   * 범용 날씨 질문 처리 파이프라인
   */
  async processWeatherQuery(
    userQuery: string,
    location: string = '서울',
    userId: string
  ): Promise<UniversalRAGResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🌐 범용 날씨 RAG 처리 시작:', { userQuery, location, userId });

      // 1. LLM 기반 지능형 의도 분석
      const intent = await intelligentWeatherIntentAnalyzer.analyzeIntent(userQuery, location);
      console.log('🧠 지능형 의도 분석 결과:', intent);

      // 2. 벡터 DB에서 관련 데이터 검색
      const vectorResults = await this.searchRelevantWeatherData(intent, userId);
      console.log(`🔍 벡터 검색 결과: ${vectorResults.length}개 데이터 발견`);

      // 3. 벡터 데이터가 있으면 RAG 응답 생성 (조건 완화)
      if (vectorResults.length >= 1) {
        console.log('📊 벡터 데이터로 RAG 응답 생성');
        
        const ragResponse = await chatGPTRAGService.generateWeatherResponse(
          userQuery,
          userId || 'anonymous',
          `session-${Date.now()}`,
          intent.location || location
        );

        return {
          success: true,
          answer: ragResponse.answer,
          confidence: intent.confidence,
          method: 'vector_search',
          sourceData: vectorResults,
          intent,
          debugInfo: {
            vectorResults: vectorResults.length,
            tokensUsed: ragResponse.tokensUsed,
            responseTime: Date.now() - startTime
          }
        };
      }

      // 4. 벡터 데이터가 부족하면 실시간 API + 하이브리드 응답
      console.log('🌤️ 실시간 API로 폴백 + 하이브리드 응답');
      
      const liveWeatherData = await this.getLiveWeatherData(intent, userId);
      const hybridResponse = await this.generateHybridResponse(userQuery, intent, vectorResults, liveWeatherData);

      return {
        success: true,
        answer: hybridResponse.answer,
        confidence: Math.max(intent.confidence, 0.8), // 실시간 데이터는 높은 신뢰도
        method: vectorResults.length > 0 ? 'hybrid' : 'live_api',
        sourceData: [...vectorResults, liveWeatherData],
        intent,
        debugInfo: {
          vectorResults: vectorResults.length,
          tokensUsed: hybridResponse.tokensUsed || 0,
          responseTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('❌ 범용 RAG 처리 실패:', error);
      
      // 최후 폴백: 기본 날씨 서비스
      const fallbackResponse = await this.getFallbackResponse(userQuery, userId || 'anonymous', location);
      
      return {
        success: false,
        answer: fallbackResponse,
        confidence: 0.5,
        method: 'live_api',
        sourceData: [],
        intent: {
          type: 'current',
          date: new Date().toISOString().split('T')[0],
          location,
          confidence: 0.5,
          originalQuery: userQuery,
          extractedInfo: {}
        },
        debugInfo: {
          vectorResults: 0,
          tokensUsed: 0,
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * 의도에 맞는 벡터 데이터 검색
   */
  private async searchRelevantWeatherData(intent: IntelligentWeatherIntent, userId?: string): Promise<any[]> {
    try {
      // 콘텐츠 타입 결정
      const contentTypes = this.determineContentTypes(intent);
      
      // 사용자별 벡터 검색 실행 (위치 무관)
      if (!userId) {
        throw new Error('사용자 기반 RAG 시스템에서는 사용자 ID가 필수입니다.');
      }
      
      // 임시로 간단한 벡터 검색 사용 (디버깅용)
      const searchResults = await simpleWeatherVectorDBService.searchSimilarWeather(
        intent.originalQuery,
        userId, // 사용자 ID 기반 검색
        contentTypes,
        10 // 최대 10개 결과
      );

      // 날짜 필터링 (의도한 날짜와 유사한 데이터 우선)
      return this.filterByDateRelevance(searchResults, intent);

    } catch (error) {
      console.error('❌ 벡터 검색 실패:', error);
      return [];
    }
  }

  /**
   * 의도에 따른 콘텐츠 타입 결정
   */
  private determineContentTypes(intent: IntelligentWeatherIntent): string[] {
    switch (intent.type) {
      case 'hourly':
        return ['hourly'];
      case 'daily':
        return ['daily'];
      case 'forecast':
        return ['daily', 'forecast'];
      case 'current':
      default:
        // 시간이 명시된 경우 시간별, 아니면 일별
        return intent.time ? ['hourly', 'current'] : ['daily', 'current'];
    }
  }

  /**
   * 날짜 관련성으로 결과 필터링
   */
  private filterByDateRelevance(results: any[], intent: IntelligentWeatherIntent): any[] {
    const targetDate = intent.date;
    
    // 정확한 날짜 매칭 결과를 우선 순위로 정렬
    return results.sort((a, b) => {
      const aDateMatch = a.forecast_date === targetDate;
      const bDateMatch = b.forecast_date === targetDate;
      
      if (aDateMatch && !bDateMatch) return -1;
      if (!aDateMatch && bDateMatch) return 1;
      
      // 같은 우선순위면 유사도 점수로 정렬
      return (b.similarity || 0) - (a.similarity || 0);
    }).slice(0, 5); // 상위 5개만 선택
  }

  /**
   * 실시간 날씨 데이터 조회
   */
  private async getLiveWeatherData(intent: IntelligentWeatherIntent, userId: string): Promise<any> {
    try {
      // 날짜와 타입에 따라 적절한 API 호출
      if (intent.type === 'hourly' || intent.time) {
        const weatherData = await weatherChatbotService.processWeatherQuery(intent.location || '서울', intent.location || '서울', userId);
        return { source: 'live_api', type: 'hourly', data: weatherData };
      } else {
        const weatherData = await weatherChatbotService.processWeatherQuery(intent.location || '서울', intent.location || '서울', userId);
        return { source: 'live_api', type: 'daily', data: weatherData };
      }
    } catch (error) {
      console.error('❌ 실시간 날씨 조회 실패:', error);
      return { source: 'live_api', type: 'error', data: null };
    }
  }

  /**
   * 하이브리드 응답 생성 (벡터 데이터 + 실시간 데이터)
   */
  private async generateHybridResponse(
    userQuery: string,
    intent: IntelligentWeatherIntent,
    vectorData: any[],
    liveData: any
  ): Promise<{ answer: string; tokensUsed?: number }> {
    try {
      // 컨텍스트 구성
      let context = '';
      
      if (vectorData.length > 0) {
        context += '## 기존 날씨 데이터:\n';
        vectorData.forEach((item, index) => {
          context += `${index + 1}. ${item.content}\n`;
        });
        context += '\n';
      }
      
      if (liveData.data) {
        context += '## 실시간 날씨 데이터:\n';
        context += JSON.stringify(liveData.data, null, 2) + '\n\n';
      }

      // LLM으로 통합 응답 생성
      const response = await chatGPTRAGService.generateWeatherResponse(
        `${context}\n사용자 질문: ${userQuery}\n\n위 데이터를 종합하여 사용자 질문에 정확하고 친절하게 답변해주세요.`,
        'hybrid-system',
        `hybrid-${Date.now()}`,
        intent.location || '서울'
      );

      return {
        answer: response.answer,
        tokensUsed: response.tokensUsed
      };

    } catch (error) {
      console.error('❌ 하이브리드 응답 생성 실패:', error);
      
      // 간단한 폴백 응답
      const fallback = this.generateSimpleResponse(intent, liveData);
      return { answer: fallback };
    }
  }

  /**
   * 간단한 응답 생성 (LLM 실패 시)
   */
  private generateSimpleResponse(intent: IntelligentWeatherIntent, liveData: any): string {
    const location = intent.location || '서울';
    const date = intent.date;
    
    if (liveData.data && Array.isArray(liveData.data) && liveData.data.length > 0) {
      const data = liveData.data[0];
      return `📍 ${location}의 ${date} 날씨 정보:\n\n` +
             `🌡️ 기온: ${data.temperature || 'N/A'}°C\n` +
             `☁️ 날씨: ${data.conditions || 'N/A'}\n` +
             `🌧️ 강수확률: ${data.precipitationProbability || 0}%\n\n` +
             `💡 실시간 날씨 정보를 제공해드렸습니다.`;
    }
    
    return `죄송합니다. ${location}의 ${date} 날씨 정보를 찾을 수 없습니다. 다시 시도해주세요.`;
  }

  /**
   * 최후 폴백 응답 (사용자 기반)
   */
  private async getFallbackResponse(userQuery: string, userId: string, location?: string): Promise<string> {
    try {
      const response = await weatherChatbotService.processWeatherQuery(userQuery, userId, location);
      return response.message || '날씨 정보를 조회할 수 없습니다.';
    } catch (error) {
      return '죄송합니다. 현재 날씨 서비스에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
    }
  }

  /**
   * 시스템 상태 확인
   */
  async getSystemStatus(): Promise<any> {
    try {
      const vectorStats = await weatherVectorDBService.getVectorDBStats();
      
      return {
        vectorDB: {
          status: 'healthy',
          totalEmbeddings: vectorStats.totalEmbeddings,
          byContentType: vectorStats.byContentType,
          byLocation: vectorStats.byLocation
        },
        intelligentIntent: {
          status: 'healthy',
          model: 'gpt-4o-mini'
        },
        chatGPTRAG: {
          status: 'healthy',
          model: 'gpt-4o-mini'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        vectorDB: { status: 'error', error: error instanceof Error ? error.message : String(error) },
        timestamp: new Date().toISOString()
      };
    }
  }
}

// 싱글톤 인스턴스
export const universalWeatherRAGService = new UniversalWeatherRAGService();
