/**
 * 에이전트 기반 날씨 RAG 시스템
 * 기존 universal-weather-rag를 대체하는 지능형 에이전트 시스템
 */

import { weatherAgentOrchestrator, AgentOrchestrationResult } from './weather-agent-orchestrator';

export interface AgentRAGResponse {
  success: boolean;
  answer: string;
  confidence: number;
  method: 'agent_orchestration';
  sourceData: any[];
  intent: {
    type: string;
    location?: string;
    date?: string;
    confidence: number;
  };
  debugInfo: {
    agentPipeline: string[];
    decisionPoints: any[];
    processingTime: number;
    qualityMetrics: {
      overallQuality: number;
      userSatisfactionPrediction: number;
    };
    optimization: string[];
  };
}

export class AgentWeatherRAGService {
  /**
   * 에이전트 기반 날씨 질의 처리
   */
  async processWeatherQuery(
    userQuery: string,
    userLocation: string,
    userId?: string
  ): Promise<AgentRAGResponse> {
    console.log('🤖 에이전트 기반 날씨 RAG 시작');
    console.log(`📝 질의: "${userQuery}" (사용자: ${userId})`);
    
    const startTime = Date.now();
    
    try {
      // 사용자 ID 필수 확인
      if (!userId) {
        throw new Error('에이전트 기반 시스템에서는 사용자 ID가 필수입니다.');
      }
      
      // 메인 에이전트 오케스트레이션 실행
      const orchestrationResult = await weatherAgentOrchestrator.orchestrateWeatherQuery(
        userQuery,
        userId,
        userLocation
      );
      
      // 에이전트 결과를 기존 인터페이스 형식으로 변환
      const agentResponse: AgentRAGResponse = {
        success: true,
        answer: orchestrationResult.finalAnswer,
        confidence: orchestrationResult.confidence,
        method: 'agent_orchestration',
        sourceData: orchestrationResult.ragAnalysis.sources,
        intent: {
          type: orchestrationResult.intentAnalysis.primaryIntent,
          location: userLocation,
          date: orchestrationResult.intentAnalysis.specificDate,
          confidence: orchestrationResult.intentAnalysis.confidence
        },
        debugInfo: {
          agentPipeline: orchestrationResult.agentPipeline,
          decisionPoints: orchestrationResult.decisionPoints,
          processingTime: orchestrationResult.processingTime,
          qualityMetrics: {
            overallQuality: orchestrationResult.overallQuality,
            userSatisfactionPrediction: orchestrationResult.userSatisfactionPrediction
          },
          optimization: orchestrationResult.optimizations
        }
      };
      
      console.log('✅ 에이전트 RAG 완료:', {
        success: true,
        confidence: orchestrationResult.confidence,
        quality: orchestrationResult.overallQuality,
        pipeline: orchestrationResult.agentPipeline,
        processingTime: orchestrationResult.processingTime
      });
      
      return agentResponse;
      
    } catch (error) {
      console.error('❌ 에이전트 RAG 실패:', error);
      
      // 에러 응답
      return {
        success: false,
        answer: this.generateErrorResponse(error),
        confidence: 0.3,
        method: 'agent_orchestration',
        sourceData: [],
        intent: {
          type: 'unknown',
          confidence: 0.3
        },
        debugInfo: {
          agentPipeline: ['error'],
          decisionPoints: [],
          processingTime: Date.now() - startTime,
          qualityMetrics: {
            overallQuality: 0.3,
            userSatisfactionPrediction: 0.2
          },
          optimization: ['error-handling']
        }
      };
    }
  }

  /**
   * 시스템 상태 확인
   */
  async getSystemStatus(): Promise<any> {
    return {
      service: '에이전트 기반 날씨 RAG 시스템',
      version: '1.0.0',
      status: 'healthy',
      agents: {
        intentAnalysisAgent: 'active',
        ragAnalysisAgent: 'active',
        orchestrationAgent: 'active'
      },
      capabilities: [
        '🤖 지능형 의도 분석',
        '📊 RAG 결과 품질 분석',
        '🎯 응답 최적화',
        '📈 품질 메트릭 추적',
        '🔄 에이전트 오케스트레이션'
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 에러 응답 생성
   */
  private generateErrorResponse(error: any): string {
    if (error instanceof Error) {
      if (error.message.includes('사용자 ID')) {
        return '사용자 인증이 필요합니다. 로그인 후 다시 시도해주세요.';
      } else if (error.message.includes('네트워크') || error.message.includes('연결')) {
        return '네트워크 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      } else {
        return '시스템 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
      }
    }
    
    return '알 수 없는 오류가 발생했습니다. 고객센터에 문의해주세요.';
  }

  /**
   * 개발자 디버그 정보 제공
   */
  async getDetailedDebugInfo(
    userQuery: string,
    userId: string
  ): Promise<any> {
    try {
      const result = await this.processWeatherQuery(userQuery, '', userId);
      
      return {
        query: userQuery,
        userId,
        result,
        systemInfo: {
          totalAgents: 3,
          processingStages: [
            '의도 분석',
            '벡터 검색',
            'RAG 분석',
            '응답 최적화',
            '품질 검증'
          ],
          qualityThresholds: {
            confidence: 0.7,
            relevance: 0.6,
            completeness: 0.5
          }
        },
        recommendations: this.generateDeveloperRecommendations(result)
      };
      
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        debugSuggestions: [
          '사용자 ID 확인',
          '네트워크 연결 상태 점검',
          '에이전트 서비스 상태 확인'
        ]
      };
    }
  }

  /**
   * 개발자용 권장사항 생성
   */
  private generateDeveloperRecommendations(result: AgentRAGResponse): string[] {
    const recommendations: string[] = [];
    
    if (result.confidence < 0.7) {
      recommendations.push('신뢰도 향상을 위한 더 많은 훈련 데이터 필요');
    }
    
    if (result.debugInfo.qualityMetrics.overallQuality < 0.6) {
      recommendations.push('전체적인 시스템 품질 개선 필요');
    }
    
    if (result.debugInfo.processingTime > 10000) {
      recommendations.push('응답 시간 최적화 권장 (현재 10초 초과)');
    }
    
    if (result.sourceData.length < 3) {
      recommendations.push('더 많은 벡터 검색 결과로 응답 품질 향상 가능');
    }
    
    return recommendations;
  }
}

export const agentWeatherRAGService = new AgentWeatherRAGService();
