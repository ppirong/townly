import { NextRequest, NextResponse } from 'next/server';
import { apiTrackingService } from '@/lib/services/api-tracking';
import { db } from '@/db';
import { apiCallLogs } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

/**
 * API 호출 기록 디버그 API (인증 불필요)
 * GET /api/debug/api-stats
 * GET /api/debug/api-stats?type=logs
 * GET /api/debug/api-stats?type=today
 * GET /api/debug/api-stats?type=recent&days=7
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const days = parseInt(searchParams.get('days') || '7');

    console.log('🔍 API 통계 디버그 조회:', type);

    switch (type) {
      case 'logs': {
        // 최근 API 호출 로그 조회
        const logs = await db
          .select()
          .from(apiCallLogs)
          .where(eq(apiCallLogs.service, 'accuweather'))
          .orderBy(desc(apiCallLogs.createdAt))
          .limit(10);

        return NextResponse.json({
          success: true,
          type: 'logs',
          data: logs,
          count: logs.length,
          timestamp: new Date().toISOString()
        });
      }

      case 'today': {
        // 오늘의 통계
        const today = new Date().toISOString().split('T')[0];
        const todayCount = await apiTrackingService.getTodayCallCount('accuweather');
        const todayStats = await apiTrackingService.getDailyStats('accuweather', today);
        const limitCheck = await apiTrackingService.checkApiLimit('accuweather', 500);

        return NextResponse.json({
          success: true,
          type: 'today',
          date: today,
          data: {
            callCount: todayCount,
            stats: todayStats,
            limit: limitCheck
          },
          timestamp: new Date().toISOString()
        });
      }

      case 'recent': {
        // 최근 N일 통계
        const recentStats = await apiTrackingService.getRecentStats('accuweather', days);
        
        return NextResponse.json({
          success: true,
          type: 'recent',
          days: days,
          data: recentStats,
          count: recentStats.length,
          timestamp: new Date().toISOString()
        });
      }

      case 'all': {
        // 모든 API 제공자 통계
        const allStats = await apiTrackingService.getAllTodayStats();
        
        return NextResponse.json({
          success: true,
          type: 'all',
          data: allStats,
          timestamp: new Date().toISOString()
        });
      }

      default: {
        // 요약 정보
        const today = new Date().toISOString().split('T')[0];
        const [todayCount, todayStats, limitCheck, recentStats] = await Promise.all([
          apiTrackingService.getTodayCallCount('accuweather'),
          apiTrackingService.getDailyStats('accuweather', today),
          apiTrackingService.checkApiLimit('accuweather', 500),
          apiTrackingService.getRecentStats('accuweather', 7)
        ]);

        // 최근 호출 로그도 몇 개 가져오기
        const recentLogs = await db
          .select({
            endpoint: apiCallLogs.endpoint,
            callTime: apiCallLogs.createdAt,
            httpStatus: apiCallLogs.statusCode,
            responseTime: apiCallLogs.responseTime,
            service: apiCallLogs.service
          })
          .from(apiCallLogs)
          .where(eq(apiCallLogs.service, 'accuweather'))
          .orderBy(desc(apiCallLogs.createdAt))
          .limit(5);

        return NextResponse.json({
          success: true,
          type: 'summary',
          date: today,
          summary: {
            todayCallCount: todayCount,
            todayStats: todayStats,
            limitStatus: limitCheck,
            recentStats: recentStats.length,
            recentLogs: recentLogs.length
          },
          details: {
            recentLogs,
            weeklyTrend: recentStats.map(stat => ({
              date: stat.date,
              totalCalls: stat.totalCalls,
              successRate: stat.totalCalls > 0 ? Math.round((stat.successfulCalls / stat.totalCalls) * 100) : 0
            }))
          },
          recommendations: {
            message: limitCheck.percentage > 80 ? 
              '⚠️ API 사용량이 높습니다. 캐시 최적화를 고려하세요.' :
              '✅ API 사용량이 정상 범위입니다.',
            cacheOptimization: limitCheck.percentage > 80,
            upgradeNeeded: limitCheck.percentage > 95
          },
          timestamp: new Date().toISOString()
        });
      }
    }

  } catch (error) {
    console.error('API 통계 디버그 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: 'API 통계 디버그 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * API 통계 테스트 데이터 생성 (개발용)
 * POST /api/debug/api-stats
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, count = 5 } = body;

    if (action === 'generate-test-data') {
      console.log(`🧪 테스트 API 호출 데이터 생성 중... (${count}개)`);
      
      const promises = [];
      for (let i = 0; i < count; i++) {
        promises.push(
          apiTrackingService.recordApiCall({
            provider: 'accuweather',
            endpoint: '/forecasts/v1/hourly/12hour',
            method: 'GET',
            httpStatus: Math.random() > 0.1 ? 200 : 500,
            responseTime: Math.floor(Math.random() * 2000) + 100,
            isSuccessful: Math.random() > 0.1,
            requestParams: {
              locationKey: '3429921',
              metric: true
            }
          })
        );
      }
      
      await Promise.all(promises);
      
      return NextResponse.json({
        success: true,
        message: `${count}개의 테스트 API 호출 기록이 생성되었습니다`,
        action: 'generate-test-data',
        count,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      error: '알 수 없는 action',
      availableActions: ['generate-test-data']
    }, { status: 400 });

  } catch (error) {
    console.error('API 통계 테스트 데이터 생성 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: 'API 통계 테스트 데이터 생성 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
