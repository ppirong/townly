/**
 * ChatGPT RAG 서비스
 * 벡터 검색으로 찾은 날씨 정보를 컨텍스트로 활용하여 ChatGPT가 응답을 생성합니다.
 */

import OpenAI from 'openai';
import { env } from '@/lib/env';
import { weatherVectorDBService, type SearchResult } from './weather-vector-db';
import { db } from '@/db';
import { chatGptConversations } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { NewChatGptConversation } from '@/db/schema';

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export interface RAGResponse {
  answer: string;
  context: SearchResult[];
  tokensUsed: number;
  responseTime: number;
  conversationId: string;
}

export interface ChatGPTConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export class ChatGPTRAGService {
  private readonly defaultConfig: ChatGPTConfig = {
    model: 'gpt-4o-mini', // 비용 효율적인 모델
    temperature: 0.3, // 일관성 있는 응답을 위해 낮은 온도
    maxTokens: 800,
    systemPrompt: `당신은 한국의 날씨 정보를 제공하는 전문적이고 친근한 AI 어시스턴트입니다.

주요 역할:
1. 제공된 날씨 데이터를 바탕으로 정확하고 유용한 정보를 제공합니다.
2. 사용자의 질문에 대해 구체적이고 실용적인 답변을 제공합니다.
3. 날씨에 따른 생활 조언(옷차림, 우산 필요성 등)을 포함합니다.
4. 한국어로 자연스럽고 친근하게 대화합니다.

응답 가이드라인:
- 간결하면서도 충분한 정보를 제공하세요
- 온도, 날씨 상태, 강수확률 등 핵심 정보를 포함하세요
- 사용자의 안전과 편의를 위한 실용적 조언을 제공하세요
- 불확실한 정보에 대해서는 정확히 명시하세요
- 이모지를 적절히 사용하여 친근함을 표현하세요

컨텍스트 정보:
아래는 사용자의 질문과 관련된 실제 날씨 데이터입니다. 이 정보를 바탕으로 정확한 답변을 제공하세요.`
  };

  /**
   * RAG 기반 날씨 질문 답변 생성
   */
  async generateWeatherResponse(
    userQuestion: string,
    userId: string,
    sessionId: string,
    locationName?: string,
    config: Partial<ChatGPTConfig> = {}
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 ChatGPT RAG 처리 시작:', { userQuestion, userId, locationName });
      
      // 1. 벡터 검색으로 관련 날씨 정보 수집
      const searchResults = await weatherVectorDBService.searchSimilarWeather(
        userQuestion,
        locationName,
        undefined, // 모든 타입 검색
        5 // 상위 5개 결과
      );

      // 벡터 데이터가 없으면 기존 날씨 서비스로 폴백
      if (searchResults.length === 0) {
        console.log('🔄 벡터 데이터 없음 - 기존 날씨 서비스로 폴백');
        const { weatherChatbotService } = await import('./weather-chatbot');
        const fallbackResponse = await weatherChatbotService.processWeatherQuery(userQuestion, locationName);
        
        if (fallbackResponse.success) {
          // 임시로 대화 기록 저장을 비활성화 (테이블이 없는 경우)
          let conversationId = '';
          try {
            const conversationData: NewChatGptConversation = {
              clerkUserId: userId,
              sessionId,
              userQuestion,
              retrievedContext: [{ content: '기존 시스템 폴백', metadata: { fallback: true } }],
              gptResponse: fallbackResponse.message,
              tokensUsed: 0,
              responseTime: Date.now() - startTime
            };

            const savedConversation = await db
              .insert(chatGptConversations)
              .values(conversationData)
              .returning();
            
            conversationId = savedConversation[0].id;
          } catch (dbError) {
            console.log('⚠️ 대화 기록 저장 실패 (테이블이 존재하지 않음):', dbError);
            // 테이블이 없어도 서비스는 계속 동작
          }

          return {
            answer: fallbackResponse.message + '\n\n💡 더 정확한 정보를 위해 날씨 데이터를 학습 중입니다.',
            context: [],
            tokensUsed: 0,
            responseTime: Date.now() - startTime,
            conversationId
          };
        } else {
          throw new Error('관련된 날씨 정보를 찾을 수 없습니다.');
        }
      }

      console.log('🔍 벡터 검색 결과:', {
        found: searchResults.length,
        topSimilarity: searchResults[0]?.similarity
      });

      // 2. 컨텍스트 생성
      const context = this.buildContext(searchResults);
      
      // 3. ChatGPT 프롬프트 구성
      const finalConfig = { ...this.defaultConfig, ...config };
      const prompt = this.buildPrompt(userQuestion, context, finalConfig.systemPrompt);
      
      // 4. ChatGPT API 호출
      const completion = await openai.chat.completions.create({
        model: finalConfig.model,
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
        messages: [
          {
            role: 'system',
            content: finalConfig.systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const answer = completion.choices[0]?.message?.content || '죄송합니다. 답변을 생성할 수 없습니다.';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const responseTime = Date.now() - startTime;

      // 5. 대화 기록 저장
      const conversationData: NewChatGptConversation = {
        clerkUserId: userId,
        sessionId,
        userQuestion,
        retrievedContext: searchResults,
        gptResponse: answer,
        tokensUsed,
        responseTime
      };

      let conversationId = '';
      try {
        const savedConversation = await db
          .insert(chatGptConversations)
          .values(conversationData)
          .returning();

        conversationId = savedConversation[0].id;
        console.log('💾 대화 기록 저장 완료:', conversationId);
      } catch (dbError) {
        console.log('⚠️ 대화 기록 저장 실패 (테이블이 존재하지 않음):', dbError);
        // 테이블이 없어도 서비스는 계속 동작
      }

      console.log('✅ ChatGPT RAG 응답 생성 완료:', {
        conversationId,
        tokensUsed,
        responseTime
      });

      return {
        answer,
        context: searchResults,
        tokensUsed,
        responseTime,
        conversationId
      };

    } catch (error) {
      console.error('❌ ChatGPT RAG 응답 생성 실패:', error);
      
      // 실패한 경우에도 기본 응답 제공
      const responseTime = Date.now() - startTime;
      return {
        answer: `죄송합니다. 현재 날씨 정보를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.\n\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        context: [],
        tokensUsed: 0,
        responseTime,
        conversationId: ''
      };
    }
  }

  /**
   * 검색 결과를 컨텍스트 텍스트로 변환
   */
  private buildContext(searchResults: SearchResult[]): string {
    let context = '=== 관련 날씨 정보 ===\n\n';
    
    searchResults.forEach((result, index) => {
      context += `${index + 1}. ${result.content}\n`;
      context += `   위치: ${result.locationName}\n`;
      context += `   유형: ${result.contentType}\n`;
      
      if (result.forecastDate) {
        context += `   날짜: ${result.forecastDate}\n`;
      }
      
      if (result.forecastHour !== undefined) {
        context += `   시간: ${result.forecastHour}시\n`;
      }
      
      if (result.metadata) {
        const meta = result.metadata;
        if (meta.temperature) context += `   온도: ${meta.temperature}°C\n`;
        if (meta.precipitationProbability > 0) context += `   강수확률: ${meta.precipitationProbability}%\n`;
        if (meta.humidity) context += `   습도: ${meta.humidity}%\n`;
      }
      
      context += `   유사도: ${(result.similarity * 100).toFixed(1)}%\n\n`;
    });
    
    return context;
  }

  /**
   * ChatGPT용 프롬프트 구성
   */
  private buildPrompt(userQuestion: string, context: string, systemPrompt: string): string {
    return `${context}

=== 사용자 질문 ===
${userQuestion}

위의 날씨 정보를 바탕으로 사용자의 질문에 정확하고 도움이 되는 답변을 제공해 주세요. 날씨에 따른 실용적인 조언도 포함해 주세요.`;
  }

  /**
   * 간단한 날씨 질문 답변 (컨텍스트 검색 없이)
   */
  async generateSimpleWeatherResponse(
    question: string,
    weatherData: any,
    userId: string,
    sessionId: string
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    
    try {
      // 날씨 데이터를 텍스트로 변환
      const weatherText = this.formatWeatherDataForPrompt(weatherData);
      
      const prompt = `현재 날씨 정보:
${weatherText}

사용자 질문: ${question}

위의 날씨 정보를 바탕으로 사용자의 질문에 친근하고 유용한 답변을 제공해 주세요.`;

      const completion = await openai.chat.completions.create({
        model: this.defaultConfig.model,
        temperature: this.defaultConfig.temperature,
        max_tokens: this.defaultConfig.maxTokens,
        messages: [
          {
            role: 'system',
            content: this.defaultConfig.systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const answer = completion.choices[0]?.message?.content || '답변을 생성할 수 없습니다.';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const responseTime = Date.now() - startTime;

      // 대화 기록 저장
      const conversationData: NewChatGptConversation = {
        clerkUserId: userId,
        sessionId,
        userQuestion: question,
        retrievedContext: [{ content: weatherText, metadata: weatherData }],
        gptResponse: answer,
        tokensUsed,
        responseTime
      };

      const savedConversation = await db
        .insert(chatGptConversations)
        .values(conversationData)
        .returning();

      return {
        answer,
        context: [],
        tokensUsed,
        responseTime,
        conversationId: savedConversation[0].id
      };

    } catch (error) {
      console.error('❌ 간단한 날씨 응답 생성 실패:', error);
      
      const responseTime = Date.now() - startTime;
      return {
        answer: '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다.',
        context: [],
        tokensUsed: 0,
        responseTime,
        conversationId: ''
      };
    }
  }

  /**
   * 날씨 데이터를 프롬프트용 텍스트로 포맷팅
   */
  private formatWeatherDataForPrompt(weatherData: any): string {
    if (Array.isArray(weatherData)) {
      return weatherData.map(data => this.formatSingleWeatherData(data)).join('\n\n');
    } else {
      return this.formatSingleWeatherData(weatherData);
    }
  }

  /**
   * 단일 날씨 데이터 포맷팅
   */
  private formatSingleWeatherData(data: any): string {
    let text = `위치: ${data.locationName || data.location || '알 수 없음'}\n`;
    
    if (data.forecastDate) text += `날짜: ${data.forecastDate}\n`;
    if (data.forecastHour !== undefined) text += `시간: ${data.forecastHour}시\n`;
    if (data.temperature) text += `온도: ${data.temperature}°C\n`;
    if (data.highTemp && data.lowTemp) text += `최고/최저: ${data.highTemp}°C/${data.lowTemp}°C\n`;
    if (data.conditions) text += `날씨: ${data.conditions}\n`;
    if (data.precipitationProbability > 0) text += `강수확률: ${data.precipitationProbability}%\n`;
    if (data.humidity) text += `습도: ${data.humidity}%\n`;
    if (data.windSpeed > 0) text += `풍속: ${data.windSpeed}km/h\n`;
    
    if (data.dayWeather) {
      text += `낮 날씨: ${data.dayWeather.conditions}`;
      if (data.dayWeather.precipitationProbability > 0) {
        text += ` (강수확률 ${data.dayWeather.precipitationProbability}%)`;
      }
      text += '\n';
    }
    
    if (data.nightWeather) {
      text += `밤 날씨: ${data.nightWeather.conditions}`;
      if (data.nightWeather.precipitationProbability > 0) {
        text += ` (강수확률 ${data.nightWeather.precipitationProbability}%)`;
      }
      text += '\n';
    }
    
    return text.trim();
  }

  /**
   * 대화 히스토리 조회
   */
  async getConversationHistory(userId: string, limit: number = 10) {
    try {
      const conversations = await db
        .select()
        .from(chatGptConversations)
        .where(eq(chatGptConversations.clerkUserId, userId))
        .orderBy(desc(chatGptConversations.createdAt))
        .limit(limit);

      return conversations;
    } catch (error) {
      console.error('❌ 대화 히스토리 조회 실패:', error);
      return [];
    }
  }

  /**
   * 토큰 사용량 통계
   */
  async getTokenUsageStats(days: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const stats = await db
        .select({
          totalConversations: sql<number>`count(*)`,
          totalTokens: sql<number>`sum(${chatGptConversations.tokensUsed})`,
          avgTokensPerConversation: sql<number>`avg(${chatGptConversations.tokensUsed})`,
          avgResponseTime: sql<number>`avg(${chatGptConversations.responseTime})`
        })
        .from(chatGptConversations)
        .where(sql`${chatGptConversations.createdAt} >= ${cutoffDate}`);

      return stats[0] || {
        totalConversations: 0,
        totalTokens: 0,
        avgTokensPerConversation: 0,
        avgResponseTime: 0
      };
    } catch (error) {
      console.error('❌ 토큰 사용량 통계 조회 실패:', error);
      return {
        totalConversations: 0,
        totalTokens: 0,
        avgTokensPerConversation: 0,
        avgResponseTime: 0
      };
    }
  }
}

// 싱글톤 인스턴스
export const chatGPTRAGService = new ChatGPTRAGService();
