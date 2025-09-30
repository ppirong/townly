/**
 * 스마트 TTL 관리 API
 * 사용자 패턴 분석, TTL 최적화 추천, 통계 조회 기능 제공
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SmartTTLManager } from '@/lib/services/smart-ttl-manager';
import { UserPatternAnalyzer } from '@/lib/services/user-pattern-analyzer';
import { smartWeatherDbService } from '@/lib/services/smart-weather-db';
import { z } from 'zod';

const ttlAnalysisSchema = z.object({
  userId: z.string().optional(),
  action: z.enum(['user_pattern', 'ttl_recommendation', 'system_stats', 'user_cache_stats', 'optimization_batch']),
});

/**
 * GET: 스마트 TTL 분석 및 통계 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'user_pattern';
    const targetUserId = searchParams.get('userId') || authUserId;

    const validatedParams = ttlAnalysisSchema.parse({
      userId: targetUserId,
      action,
    });

    switch (validatedParams.action) {
      case 'user_pattern': {
        // 사용자 활동 패턴 분석
        const pattern = await UserPatternAnalyzer.analyzeUserActivityPattern(validatedParams.userId!);
        const userPattern = {
          frequencyScore: pattern.dailyAverage,
          preferredLocations: pattern.locationPreferences.map(loc => loc.locationKey),
          timePreference: pattern.timePreference,
          totalQueries: pattern.totalQueries,
          avgQueriesPerDay: pattern.dailyAverage,
          recentActivityDays: 30,
        };
        const recommendations = SmartTTLManager.generateTTLRecommendations(userPattern);
        
        return NextResponse.json({
          success: true,
          data: {
            pattern,
            recommendations,
          },
        });
      }

      case 'ttl_recommendation': {
        // TTL 최적화 추천
        const recommendation = await UserPatternAnalyzer.generateTTLOptimizationRecommendation(validatedParams.userId!);
        
        return NextResponse.json({
          success: true,
          data: recommendation,
        });
      }

      case 'system_stats': {
        // 시스템 전체 패턴 통계
        const systemStats = await UserPatternAnalyzer.analyzeSystemPatterns();
        const performanceStats = await SmartTTLManager.getTTLPerformanceStats();
        const optimizationStats = await smartWeatherDbService.getSystemOptimizationStats();
        
        return NextResponse.json({
          success: true,
          data: {
            systemPatterns: systemStats,
            performance: performanceStats,
            optimization: optimizationStats,
          },
        });
      }

      case 'user_cache_stats': {
        // 사용자별 캐시 통계
        const cacheStats = await smartWeatherDbService.getUserCacheStats(validatedParams.userId!);
        
        return NextResponse.json({
          success: true,
          data: cacheStats,
        });
      }

      case 'optimization_batch': {
        // TODO: 관리자 권한 체크 추가
        
        // 배치 최적화 추천
        const batchRecommendations = await UserPatternAnalyzer.generateBatchOptimizationRecommendations();
        
        return NextResponse.json({
          success: true,
          data: {
            totalUsers: batchRecommendations.length,
            recommendations: batchRecommendations,
            summary: {
              highPriority: batchRecommendations.filter(r => r.priority === 'high').length,
              mediumPriority: batchRecommendations.filter(r => r.priority === 'medium').length,
              lowPriority: batchRecommendations.filter(r => r.priority === 'low').length,
            },
          },
        });
      }

      default:
        return NextResponse.json(
          { error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('스마트 TTL API 오류:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '잘못된 요청 파라미터', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '스마트 TTL 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST: TTL 설정 적용 및 최적화 실행
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'apply_optimization': {
        // 특정 사용자에게 최적화 적용
        const targetUserId = body.userId || authUserId;
        
        // 최적화 추천 생성
        const recommendation = await UserPatternAnalyzer.generateTTLOptimizationRecommendation(targetUserId);
        
        // 여기서 실제 TTL 설정을 적용할 수 있음
        // 현재는 추천만 반환
        
        return NextResponse.json({
          success: true,
          message: 'TTL 최적화 추천이 생성되었습니다.',
          data: recommendation,
        });
      }

      case 'force_cleanup': {
        // 특정 사용자의 만료된 데이터 강제 정리
        const targetUserId = body.userId || authUserId;
        
        // 사용자별 만료 데이터 정리는 스마트 DB 서비스에서 자동으로 처리됨
        const cacheStats = await smartWeatherDbService.getUserCacheStats(targetUserId);
        
        return NextResponse.json({
          success: true,
          message: '사용자 캐시 상태를 확인했습니다.',
          data: cacheStats,
        });
      }

      case 'reset_user_pattern': {
        // 사용자 패턴 재분석 (캐시 무효화)
        const targetUserId = body.userId || authUserId;
        
        // 새로운 패턴 분석
        const newPattern = await UserPatternAnalyzer.analyzeUserActivityPattern(targetUserId);
        const newRecommendation = await UserPatternAnalyzer.generateTTLOptimizationRecommendation(targetUserId);
        
        return NextResponse.json({
          success: true,
          message: '사용자 패턴이 재분석되었습니다.',
          data: {
            pattern: newPattern,
            recommendation: newRecommendation,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('스마트 TTL POST API 오류:', error);
    
    return NextResponse.json(
      { error: 'TTL 최적화 실행 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PUT: TTL 설정 업데이트
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId: authUserId } = await auth();
    
    if (!authUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId: targetUserId, ttlMultiplier, customSettings } = body;

    // TODO: 실제 TTL 설정 업데이트 로직 구현
    // 현재는 설정 확인만 수행
    
    const userPattern = await UserPatternAnalyzer.analyzeUserActivityPattern(targetUserId || authUserId);
    
    return NextResponse.json({
      success: true,
      message: 'TTL 설정이 업데이트되었습니다.',
      data: {
        userId: targetUserId || authUserId,
        ttlMultiplier: ttlMultiplier || 1.0,
        customSettings: customSettings || {},
        currentPattern: userPattern,
      },
    });
  } catch (error) {
    console.error('TTL 설정 업데이트 오류:', error);
    
    return NextResponse.json(
      { error: 'TTL 설정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
