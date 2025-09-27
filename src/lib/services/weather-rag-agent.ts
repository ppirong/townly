/**
 * 날씨 RAG 결과 분석 및 처리 에이전트
 * RAG 검색 결과를 분석하여 사용자 의도에 최적화된 응답을 생성
 */

import { openaiEmbeddingService } from './openai-embedding';
import { WeatherIntentAnalysis } from './weather-intent-agent';

export interface RAGAnalysis {
  // 데이터 품질 분석
  relevanceScore: number; // 0-1
  completeness: number; // 0-1
  freshness: number; // 0-1
  coverage: string[]; // 커버되는 날씨 측면들
  
  // 데이터 특성
  availableTimeframes: string[];
  dataGaps: string[];
  strongestMatches: any[];
  
  // 응답 전략
  responseStrategy: 'direct' | 'synthesis' | 'interpolation' | 'fallback';
  confidenceLevel: number;
  
  // 메타데이터
  sourceCount: number;
  processingTime: number;
  suggestions: string[];
}

export interface AgentResponse {
  answer: string;
  confidence: number;
  sources: any[];
  analysis: RAGAnalysis;
  reasoning: string;
  suggestions: string[];
}

export class WeatherRAGAgent {
  /**
   * RAG 결과를 분석하고 최적화된 응답을 생성
   */
  async processRAGResults(
    userQuery: string,
    intentAnalysis: WeatherIntentAnalysis,
    ragResults: any[],
    userId: string
  ): Promise<AgentResponse> {
    console.log('🤖 RAG 결과 분석 에이전트 시작');
    console.log(`📊 입력 데이터: ${ragResults.length}개 RAG 결과`);
    
    try {
      // 1. RAG 결과 품질 분석
      const ragAnalysis = await this.analyzeRAGQuality(ragResults, intentAnalysis);
      
      // 2. 응답 전략 결정
      const responseStrategy = this.determineResponseStrategy(ragAnalysis, intentAnalysis);
      
      // 3. 최적화된 응답 생성
      const optimizedAnswer = await this.generateOptimizedResponse(
        userQuery,
        intentAnalysis,
        ragResults,
        ragAnalysis,
        responseStrategy
      );
      
      // 4. 응답 품질 검증 및 개선 제안
      const suggestions = this.generateSuggestions(intentAnalysis, ragAnalysis);
      
      const agentResponse: AgentResponse = {
        answer: optimizedAnswer,
        confidence: ragAnalysis.confidenceLevel,
        sources: ragResults,
        analysis: ragAnalysis,
        reasoning: this.generateReasoning(intentAnalysis, ragAnalysis, responseStrategy),
        suggestions
      };
      
      console.log('✅ RAG 에이전트 처리 완료:', {
        strategy: responseStrategy,
        confidence: ragAnalysis.confidenceLevel,
        sourceCount: ragResults.length
      });
      
      return agentResponse;
      
    } catch (error) {
      console.error('❌ RAG 에이전트 처리 실패:', error);
      
      // 폴백 응답
      return this.generateFallbackResponse(userQuery, intentAnalysis, ragResults);
    }
  }

  /**
   * RAG 결과의 품질과 관련성을 분석
   */
  private async analyzeRAGQuality(
    ragResults: any[],
    intentAnalysis: WeatherIntentAnalysis
  ): Promise<RAGAnalysis> {
    console.log('📈 RAG 품질 분석 시작');
    
    if (ragResults.length === 0) {
      return {
        relevanceScore: 0,
        completeness: 0,
        freshness: 0,
        coverage: [],
        availableTimeframes: [],
        dataGaps: ['데이터 없음'],
        strongestMatches: [],
        responseStrategy: 'fallback',
        confidenceLevel: 0,
        sourceCount: 0,
        processingTime: 0,
        suggestions: ['실시간 API 데이터 사용 권장']
      };
    }
    
    // 관련성 점수 계산 (유사도 기반)
    const relevanceScore = ragResults.reduce((sum, result) => sum + result.similarity, 0) / ragResults.length;
    
    // 완성도 분석 (의도한 날씨 측면 커버리지)
    const coverage = this.analyzeCoverage(ragResults, intentAnalysis.weatherAspects);
    const completeness = coverage.length / intentAnalysis.weatherAspects.length;
    
    // 신선도 분석 (날짜 기반)
    const freshness = this.analyzeFreshness(ragResults, intentAnalysis);
    
    // 시간대 커버리지
    const availableTimeframes = this.analyzeTimeframes(ragResults);
    
    // 데이터 갭 분석
    const dataGaps = this.identifyDataGaps(ragResults, intentAnalysis);
    
    // 최강 매치 선별 (상위 유사도)
    const strongestMatches = ragResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
    
    // 응답 전략 결정
    let responseStrategy: 'direct' | 'synthesis' | 'interpolation' | 'fallback' = 'synthesis';
    if (relevanceScore > 0.8 && completeness > 0.8) {
      responseStrategy = 'direct';
    } else if (relevanceScore < 0.3 || completeness < 0.3) {
      responseStrategy = 'fallback';
    } else if (dataGaps.length > 0) {
      responseStrategy = 'interpolation';
    }
    
    const confidenceLevel = (relevanceScore + completeness + freshness) / 3;
    
    return {
      relevanceScore,
      completeness,
      freshness,
      coverage,
      availableTimeframes,
      dataGaps,
      strongestMatches,
      responseStrategy,
      confidenceLevel,
      sourceCount: ragResults.length,
      processingTime: Date.now(),
      suggestions: []
    };
  }

  /**
   * 날씨 측면 커버리지 분석
   */
  private analyzeCoverage(ragResults: any[], intendedAspects: string[]): string[] {
    const coverage = new Set<string>();
    
    ragResults.forEach(result => {
      const content = result.content?.toLowerCase() || '';
      
      if (intendedAspects.includes('temperature') && 
          (content.includes('온도') || content.includes('도') || content.includes('기온'))) {
        coverage.add('temperature');
      }
      
      if (intendedAspects.includes('precipitation') && 
          (content.includes('비') || content.includes('강수') || content.includes('눈'))) {
        coverage.add('precipitation');
      }
      
      if (intendedAspects.includes('general')) {
        coverage.add('general');
      }
    });
    
    return Array.from(coverage);
  }

  /**
   * 데이터 신선도 분석
   */
  private analyzeFreshness(ragResults: any[], intentAnalysis: WeatherIntentAnalysis): number {
    if (!intentAnalysis.specificDate) return 0.8; // 날짜가 명시되지 않으면 중간 점수
    
    const targetDate = new Date(intentAnalysis.specificDate);
    const today = new Date();
    
    let relevantResults = 0;
    const totalResults = ragResults.length;
    
    ragResults.forEach(result => {
      if (result.forecastDate) {
        const resultDate = new Date(result.forecastDate);
        const dateDiff = Math.abs(targetDate.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (dateDiff <= 1) { // 1일 이내
          relevantResults++;
        }
      }
    });
    
    return totalResults > 0 ? relevantResults / totalResults : 0.5;
  }

  /**
   * 시간대 분석
   */
  private analyzeTimeframes(ragResults: any[]): string[] {
    const timeframes = new Set<string>();
    
    ragResults.forEach(result => {
      if (result.contentType === 'hourly') {
        timeframes.add('hourly');
      } else if (result.contentType === 'daily') {
        timeframes.add('daily');
      }
    });
    
    return Array.from(timeframes);
  }

  /**
   * 데이터 갭 식별
   */
  private identifyDataGaps(ragResults: any[], intentAnalysis: WeatherIntentAnalysis): string[] {
    const gaps: string[] = [];
    
    // 시간대별 갭 확인
    if (intentAnalysis.timeframe === 'now' && !ragResults.some(r => r.contentType === 'hourly')) {
      gaps.push('실시간 데이터 부족');
    }
    
    if (intentAnalysis.timeframe === 'week' && !ragResults.some(r => r.contentType === 'daily')) {
      gaps.push('주간 예보 데이터 부족');
    }
    
    // 날씨 측면별 갭 확인
    const coverage = this.analyzeCoverage(ragResults, intentAnalysis.weatherAspects);
    intentAnalysis.weatherAspects.forEach(aspect => {
      if (!coverage.includes(aspect)) {
        gaps.push(`${aspect} 정보 부족`);
      }
    });
    
    return gaps;
  }

  /**
   * 응답 전략 결정
   */
  private determineResponseStrategy(
    ragAnalysis: RAGAnalysis,
    intentAnalysis: WeatherIntentAnalysis
  ): 'direct' | 'synthesis' | 'interpolation' | 'fallback' {
    console.log('🎯 응답 전략 결정:', {
      relevance: ragAnalysis.relevanceScore,
      completeness: ragAnalysis.completeness,
      confidence: ragAnalysis.confidenceLevel
    });
    
    return ragAnalysis.responseStrategy;
  }

  /**
   * 최적화된 응답 생성
   */
  private async generateOptimizedResponse(
    userQuery: string,
    intentAnalysis: WeatherIntentAnalysis,
    ragResults: any[],
    ragAnalysis: RAGAnalysis,
    strategy: string
  ): Promise<string> {
    console.log(`🎨 ${strategy} 전략으로 응답 생성`);
    
    const prompt = `
당신은 날씨 정보 응답 생성 전문가입니다. 사용자의 질의와 분석된 의도, RAG 검색 결과를 바탕으로 최적화된 응답을 생성해주세요.

사용자 질의: "${userQuery}"

의도 분석:
- 주요 의도: ${intentAnalysis.primaryIntent}
- 시간대: ${intentAnalysis.timeframe}
- 날씨 측면: ${intentAnalysis.weatherAspects.join(', ')}
- 기대 응답 형식: ${intentAnalysis.expectedResponseType}
- 맥락: ${intentAnalysis.context}

RAG 분석:
- 관련성 점수: ${ragAnalysis.relevanceScore.toFixed(2)}
- 완성도: ${ragAnalysis.completeness.toFixed(2)}
- 응답 전략: ${strategy}
- 데이터 갭: ${ragAnalysis.dataGaps.join(', ')}

RAG 검색 결과:
${ragResults.map((result, index) => 
  `${index + 1}. [${result.contentType}] ${result.forecastDate || '날짜미지정'} ${result.forecastHour !== null ? result.forecastHour + '시' : ''}\n   유사도: ${result.similarity?.toFixed(3)}\n   내용: ${result.content?.substring(0, 200)}...`
).join('\n\n')}

응답 생성 지침:
1. 사용자의 의도와 맥락에 정확히 맞는 답변을 제공하세요
2. RAG 결과의 정확한 정보를 활용하되, 자연스럽게 종합하세요
3. ${intentAnalysis.expectedResponseType} 형식으로 응답하세요
4. 불확실한 정보는 명확히 표시하세요
5. 한국어로 친근하고 이해하기 쉽게 작성하세요

최적화된 응답:`;

    try {
      const response = await openaiEmbeddingService.generateChatCompletion([
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 500
      });

      return response.trim();
      
    } catch (error) {
      console.error('❌ 응답 생성 실패:', error);
      return this.generateBasicResponse(ragResults, intentAnalysis);
    }
  }

  /**
   * 기본 응답 생성 (폴백)
   */
  private generateBasicResponse(ragResults: any[], intentAnalysis: WeatherIntentAnalysis): string {
    if (ragResults.length === 0) {
      return '죄송합니다. 해당 날씨 정보를 찾을 수 없습니다. 다른 날짜나 지역을 시도해보세요.';
    }
    
    const bestResult = ragResults[0];
    const content = bestResult.content || '';
    
    return `${content.substring(0, 200)}... (신뢰도: ${(bestResult.similarity * 100).toFixed(1)}%)`;
  }

  /**
   * 응답 근거 생성
   */
  private generateReasoning(
    intentAnalysis: WeatherIntentAnalysis,
    ragAnalysis: RAGAnalysis,
    strategy: string
  ): string {
    return `
응답 근거:
- 의도 분석 신뢰도: ${(intentAnalysis.confidence * 100).toFixed(1)}%
- RAG 관련성: ${(ragAnalysis.relevanceScore * 100).toFixed(1)}%
- 데이터 완성도: ${(ragAnalysis.completeness * 100).toFixed(1)}%
- 사용된 전략: ${strategy}
- 소스 데이터: ${ragAnalysis.sourceCount}개
    `.trim();
  }

  /**
   * 개선 제안 생성
   */
  private generateSuggestions(
    intentAnalysis: WeatherIntentAnalysis,
    ragAnalysis: RAGAnalysis
  ): string[] {
    const suggestions: string[] = [];
    
    if (ragAnalysis.relevanceScore < 0.7) {
      suggestions.push('더 구체적인 질문으로 다시 시도해보세요');
    }
    
    if (ragAnalysis.completeness < 0.5) {
      suggestions.push('관련 정보가 부족합니다. 실시간 데이터를 확인해보세요');
    }
    
    if (ragAnalysis.dataGaps.length > 0) {
      suggestions.push(`다음 정보가 부족합니다: ${ragAnalysis.dataGaps.join(', ')}`);
    }
    
    return suggestions;
  }

  /**
   * 폴백 응답 생성
   */
  private generateFallbackResponse(
    userQuery: string,
    intentAnalysis: WeatherIntentAnalysis,
    ragResults: any[]
  ): AgentResponse {
    return {
      answer: '죄송합니다. 현재 날씨 정보 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      confidence: 0.3,
      sources: ragResults,
      analysis: {
        relevanceScore: 0,
        completeness: 0,
        freshness: 0,
        coverage: [],
        availableTimeframes: [],
        dataGaps: ['처리 오류'],
        strongestMatches: [],
        responseStrategy: 'fallback',
        confidenceLevel: 0.3,
        sourceCount: ragResults.length,
        processingTime: Date.now(),
        suggestions: ['시스템 상태 확인 필요']
      },
      reasoning: '에이전트 처리 중 오류 발생으로 폴백 응답 제공',
      suggestions: ['잠시 후 다시 시도해주세요']
    };
  }
}

export const weatherRAGAgent = new WeatherRAGAgent();
