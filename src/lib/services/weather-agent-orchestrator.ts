/**
 * 날씨 에이전트 오케스트레이션 시스템
 * 모든 에이전트들을 조율하여 최적의 날씨 정보 서비스를 제공
 */

import { weatherIntentAgent, WeatherIntentAnalysis } from './weather-intent-agent';
import { weatherRAGAgent, AgentResponse } from './weather-rag-agent';
import { simpleWeatherVectorDBService } from './weather-vector-db-simple';

export interface AgentOrchestrationResult {
  // 최종 결과
  finalAnswer: string;
  confidence: number;
  processingTime: number;
  
  // 에이전트별 결과
  intentAnalysis: WeatherIntentAnalysis;
  ragAnalysis: AgentResponse;
  
  // 메타데이터
  agentPipeline: string[];
  decisionPoints: any[];
  optimizations: string[];
  
  // 품질 메트릭
  overallQuality: number;
  userSatisfactionPrediction: number;
  
  // 디버깅 정보
  debugInfo: {
    intentProcessingTime: number;
    ragProcessingTime: number;
    vectorSearchTime: number;
    responseGenerationTime: number;
  };
}

export class WeatherAgentOrchestrator {
  /**
   * 메인 오케스트레이션: 전체 에이전트 파이프라인 실행
   */
  async orchestrateWeatherQuery(
    userQuery: string,
    userId: string,
    userLocation?: string
  ): Promise<AgentOrchestrationResult> {
    const startTime = Date.now();
    const agentPipeline: string[] = [];
    const decisionPoints: any[] = [];
    
    console.log('🎭 날씨 에이전트 오케스트레이션 시작');
    console.log(`📝 입력: "${userQuery}" (사용자: ${userId})`);
    
    try {
      // 1단계: 의도 분석 에이전트
      console.log('1️⃣ 의도 분석 에이전트 실행');
      const intentStart = Date.now();
      const intentAnalysis = await weatherIntentAgent.analyzeIntent(userQuery);
      const intentTime = Date.now() - intentStart;
      agentPipeline.push('intent-analysis');
      
      // 결정점 1: 의도 분석 품질 평가
      const intentDecision = this.evaluateIntentQuality(intentAnalysis);
      decisionPoints.push({
        stage: 'intent-analysis',
        decision: intentDecision,
        confidence: intentAnalysis.confidence,
        timestamp: Date.now()
      });
      
      // 2단계: 벡터 검색 실행 (사용자별)
      console.log('2️⃣ 사용자별 벡터 검색 실행');
      const vectorStart = Date.now();
      const vectorResults = await this.executeOptimizedVectorSearch(
        intentAnalysis,
        userId
      );
      const vectorTime = Date.now() - vectorStart;
      agentPipeline.push('vector-search');
      
      // 결정점 2: 벡터 검색 결과 평가
      const vectorDecision = this.evaluateVectorResults(vectorResults, intentAnalysis);
      decisionPoints.push({
        stage: 'vector-search',
        decision: vectorDecision,
        resultCount: vectorResults.length,
        timestamp: Date.now()
      });
      
      // 3단계: RAG 분석 및 응답 생성 에이전트
      console.log('3️⃣ RAG 분석 에이전트 실행');
      const ragStart = Date.now();
      const ragAnalysis = await weatherRAGAgent.processRAGResults(
        userQuery,
        intentAnalysis,
        vectorResults,
        userId
      );
      const ragTime = Date.now() - ragStart;
      agentPipeline.push('rag-analysis');
      
      // 4단계: 품질 최적화 및 개선
      console.log('4️⃣ 응답 품질 최적화');
      const optimizedResult = await this.optimizeResponse(
        ragAnalysis,
        intentAnalysis,
        decisionPoints
      );
      agentPipeline.push('optimization');
      
      // 5단계: 최종 품질 평가
      const qualityMetrics = this.calculateQualityMetrics(
        intentAnalysis,
        ragAnalysis,
        optimizedResult
      );
      
      const totalTime = Date.now() - startTime;
      
      const orchestrationResult: AgentOrchestrationResult = {
        finalAnswer: optimizedResult.answer,
        confidence: optimizedResult.confidence,
        processingTime: totalTime,
        intentAnalysis,
        ragAnalysis,
        agentPipeline,
        decisionPoints,
        optimizations: optimizedResult.optimizations,
        overallQuality: qualityMetrics.overallQuality,
        userSatisfactionPrediction: qualityMetrics.userSatisfactionPrediction,
        debugInfo: {
          intentProcessingTime: intentTime,
          ragProcessingTime: ragTime,
          vectorSearchTime: vectorTime,
          responseGenerationTime: optimizedResult.responseTime || 0
        }
      };
      
      console.log('✅ 에이전트 오케스트레이션 완료:', {
        pipeline: agentPipeline,
        quality: qualityMetrics.overallQuality,
        confidence: optimizedResult.confidence,
        totalTime
      });
      
      return orchestrationResult;
      
    } catch (error) {
      console.error('❌ 에이전트 오케스트레이션 실패:', error);
      
      // 폴백 오케스트레이션
      return this.generateFallbackOrchestration(userQuery, userId, error);
    }
  }

  /**
   * 의도 분석 품질 평가
   */
  private evaluateIntentQuality(intentAnalysis: WeatherIntentAnalysis): any {
    const quality = {
      confidence: intentAnalysis.confidence,
      specificity: intentAnalysis.specificity,
      clarity: 'high' // 분석 결과의 명확성
    };
    
    if (intentAnalysis.confidence < 0.6) {
      return {
        ...quality,
        recommendation: 'clarification-needed',
        action: 'request-more-specific-query'
      };
    } else if (intentAnalysis.confidence < 0.8) {
      return {
        ...quality,
        recommendation: 'proceed-with-caution',
        action: 'use-multiple-strategies'
      };
    } else {
      return {
        ...quality,
        recommendation: 'high-confidence',
        action: 'proceed-optimally'
      };
    }
  }

  /**
   * 최적화된 벡터 검색 실행
   */
  private async executeOptimizedVectorSearch(
    intentAnalysis: WeatherIntentAnalysis,
    userId: string
  ): Promise<any[]> {
    // 의도에 따른 검색 최적화
    const searchLimit = this.determineSearchLimit(intentAnalysis);
    const contentTypes = this.determineContentTypes(intentAnalysis);
    
    console.log(`🔍 최적화된 검색: ${contentTypes.join(', ')}, 한도: ${searchLimit}`);
    
    const results = await simpleWeatherVectorDBService.searchSimilarWeather(
      intentAnalysis.query,
      userId,
      contentTypes,
      searchLimit
    );
    
    // 결과 후처리 및 필터링
    return this.postProcessVectorResults(results, intentAnalysis);
  }

  /**
   * 검색 한도 결정
   */
  private determineSearchLimit(intentAnalysis: WeatherIntentAnalysis): number {
    switch (intentAnalysis.expectedResponseType) {
      case 'detailed':
        return 10;
      case 'comparative':
        return 8;
      case 'simple':
        return 5;
      default:
        return 7;
    }
  }

  /**
   * 콘텐츠 타입 결정
   */
  private determineContentTypes(intentAnalysis: WeatherIntentAnalysis): string[] {
    const types: string[] = [];
    
    if (intentAnalysis.timeframe === 'now' || intentAnalysis.timeframe === 'today') {
      types.push('hourly');
    }
    
    if (intentAnalysis.timeframe === 'tomorrow' || intentAnalysis.timeframe === 'week') {
      types.push('daily');
    }
    
    if (types.length === 0) {
      types.push('hourly', 'daily');
    }
    
    return types;
  }

  /**
   * 벡터 검색 결과 후처리
   */
  private postProcessVectorResults(results: any[], intentAnalysis: WeatherIntentAnalysis): any[] {
    // 날짜 관련성에 따른 가중치 조정
    if (intentAnalysis.specificDate) {
      const targetDate = new Date(intentAnalysis.specificDate);
      
      results.forEach(result => {
        if (result.forecastDate) {
          const resultDate = new Date(result.forecastDate);
          const dateDiff = Math.abs(targetDate.getTime() - resultDate.getTime()) / (1000 * 60 * 60 * 24);
          
          // 날짜가 가까울수록 유사도 부스트
          if (dateDiff <= 1) {
            result.similarity *= 1.2;
          } else if (dateDiff <= 3) {
            result.similarity *= 1.1;
          }
        }
      });
      
      // 다시 정렬
      results.sort((a, b) => b.similarity - a.similarity);
    }
    
    return results;
  }

  /**
   * 벡터 검색 결과 평가
   */
  private evaluateVectorResults(results: any[], intentAnalysis: WeatherIntentAnalysis): any {
    const resultCount = results.length;
    const avgSimilarity = resultCount > 0 
      ? results.reduce((sum, r) => sum + r.similarity, 0) / resultCount 
      : 0;
    
    if (resultCount === 0) {
      return {
        quality: 'poor',
        recommendation: 'fallback-to-live-api',
        action: 'use-real-time-data'
      };
    } else if (avgSimilarity < 0.3) {
      return {
        quality: 'low',
        recommendation: 'supplement-with-live-data',
        action: 'hybrid-response'
      };
    } else if (avgSimilarity < 0.6) {
      return {
        quality: 'medium',
        recommendation: 'proceed-with-synthesis',
        action: 'careful-processing'
      };
    } else {
      return {
        quality: 'high',
        recommendation: 'optimal-processing',
        action: 'direct-response'
      };
    }
  }

  /**
   * 응답 최적화
   */
  private async optimizeResponse(
    ragAnalysis: AgentResponse,
    intentAnalysis: WeatherIntentAnalysis,
    decisionPoints: any[]
  ): Promise<any> {
    const optimizations: string[] = [];
    let optimizedAnswer = ragAnalysis.answer;
    const optimizedConfidence = ragAnalysis.confidence;
    
    // 최적화 1: 신뢰도가 낮은 경우 보완
    if (ragAnalysis.confidence < 0.7) {
      optimizations.push('confidence-enhancement');
      optimizedAnswer = `${optimizedAnswer}\n\n💡 이 정보는 예측 데이터를 기반으로 하므로 실제 날씨와 다를 수 있습니다.`;
    }
    
    // 최적화 2: 불완전한 데이터에 대한 투명성
    if (ragAnalysis.analysis.completeness < 0.8) {
      optimizations.push('transparency-enhancement');
      optimizedAnswer = `${optimizedAnswer}\n\n⚠️ 일부 정보가 부족할 수 있으니 최신 날씨 정보도 확인해보세요.`;
    }
    
    // 최적화 3: 개인화 강화
    if (intentAnalysis.context !== 'general') {
      optimizations.push('personalization');
      optimizedAnswer = this.addContextualAdvice(optimizedAnswer, intentAnalysis.context);
    }
    
    return {
      answer: optimizedAnswer,
      confidence: optimizedConfidence,
      optimizations,
      responseTime: Date.now()
    };
  }

  /**
   * 맥락별 조언 추가
   */
  private addContextualAdvice(answer: string, context: string): string {
    const advice: { [key: string]: string } = {
      '외출': '\n\n🚶‍♀️ 외출 시 우산이나 적절한 옷차림을 준비하세요.',
      '운동': '\n\n🏃‍♂️ 운동하기에 좋은 날씨인지 확인하고 수분 섭취에 주의하세요.',
      '빨래': '\n\n👕 빨래 건조에 적합한 날씨인지 고려해보세요.',
      '여행': '\n\n✈️ 여행 계획에 날씨 변화를 미리 고려하시기 바랍니다.'
    };
    
    return answer + (advice[context] || '');
  }

  /**
   * 품질 메트릭 계산
   */
  private calculateQualityMetrics(
    intentAnalysis: WeatherIntentAnalysis,
    ragAnalysis: AgentResponse,
    optimizedResult: any
  ): { overallQuality: number; userSatisfactionPrediction: number } {
    const intentQuality = intentAnalysis.confidence;
    const ragQuality = ragAnalysis.analysis.confidenceLevel;
    const responseQuality = optimizedResult.confidence;
    
    const overallQuality = (intentQuality + ragQuality + responseQuality) / 3;
    
    // 사용자 만족도 예측 (휴리스틱 기반)
    let satisfactionPrediction = overallQuality;
    
    // 응답 길이 적절성 (너무 짧거나 길면 감점)
    const answerLength = optimizedResult.answer.length;
    if (answerLength < 50 || answerLength > 1000) {
      satisfactionPrediction *= 0.9;
    }
    
    // 맥락 적합성
    if (intentAnalysis.context !== 'general') {
      satisfactionPrediction *= 1.1; // 맥락이 있으면 보너스
    }
    
    return {
      overallQuality: Math.min(overallQuality, 1.0),
      userSatisfactionPrediction: Math.min(satisfactionPrediction, 1.0)
    };
  }

  /**
   * 폴백 오케스트레이션
   */
  private generateFallbackOrchestration(
    userQuery: string,
    userId: string,
    error: any
  ): AgentOrchestrationResult {
    console.log('🚨 폴백 오케스트레이션 실행');
    
    return {
      finalAnswer: '죄송합니다. 현재 날씨 정보 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      confidence: 0.3,
      processingTime: Date.now(),
      intentAnalysis: {
        query: userQuery,
        primaryIntent: 'current',
        timeframe: 'today',
        weatherAspects: ['general'],
        urgency: 'medium',
        specificity: 'general',
        context: 'general',
        expectedResponseType: 'simple',
        confidence: 0.3,
        analysisReason: '폴백 분석',
        suggestedDataTypes: ['hourly'],
        priorityFactors: ['기본 정보']
      },
      ragAnalysis: {
        answer: '시스템 오류로 인한 폴백 응답',
        confidence: 0.3,
        sources: [],
        analysis: {
          relevanceScore: 0,
          completeness: 0,
          freshness: 0,
          coverage: [],
          availableTimeframes: [],
          dataGaps: ['시스템 오류'],
          strongestMatches: [],
          responseStrategy: 'fallback',
          confidenceLevel: 0.3,
          sourceCount: 0,
          processingTime: 0,
          suggestions: []
        },
        reasoning: '시스템 오류로 인한 폴백',
        suggestions: ['잠시 후 다시 시도해주세요']
      },
      agentPipeline: ['fallback'],
      decisionPoints: [],
      optimizations: ['error-handling'],
      overallQuality: 0.3,
      userSatisfactionPrediction: 0.2,
      debugInfo: {
        intentProcessingTime: 0,
        ragProcessingTime: 0,
        vectorSearchTime: 0,
        responseGenerationTime: 0
      }
    };
  }
}

export const weatherAgentOrchestrator = new WeatherAgentOrchestrator();
