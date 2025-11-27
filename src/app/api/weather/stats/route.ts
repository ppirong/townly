import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { apiTrackingService } from '@/lib/services/api-tracking';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api-response';
import { z } from 'zod';

const statsRequestSchema = z.object({
  days: z.number().min(1).max(30).optional().default(7),
});

/**
 * 날씨 API 호출 통계 조회
 * GET /api/weather/stats
 * GET /api/weather/stats?days=7
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const validatedParams = statsRequestSchema.parse({
      days: searchParams.get('days') ? parseInt(searchParams.get('days')!) : undefined
    });
    const days = validatedParams.days;

    // AccuWeather API 통계 조회
    const [todayStats, recentStats, apiLimit] = await Promise.all([
      apiTrackingService.getDailyStats('accuweather'),
      apiTrackingService.getRecentStats('accuweather', days),
      apiTrackingService.checkApiLimit('accuweather', 500), // 무료 플랜 500회
    ]);

    // 시간대별 사용량 계산 (오늘 기준)
    const hourlyUsage = todayStats?.hourlyStats || [];
    
    // 엔드포인트별 사용량
    const endpointUsage = todayStats?.endpointStats || {};

    // 주간 트렌드 계산
    const weeklyTrend = recentStats.map(stat => ({
      date: stat.date,
      totalCalls: stat.totalCalls,
      successRate: stat.totalCalls > 0 ? Math.round((stat.successfulCalls / stat.totalCalls) * 100) : 100,
      avgResponseTime: stat.avgResponseTime,
    }));

    return createSuccessResponse({
      today: {
        date: new Date().toISOString().split('T')[0],
        totalCalls: todayStats?.totalCalls || 0,
        successfulCalls: todayStats?.successfulCalls || 0,
        failedCalls: todayStats?.failedCalls || 0,
        successRate: todayStats && todayStats.totalCalls > 0 
          ? Math.round((todayStats.successfulCalls / todayStats.totalCalls) * 100) 
          : 100,
        avgResponseTime: todayStats?.avgResponseTime || 0,
        hourlyUsage,
        endpointUsage,
      },
      limit: {
        current: apiLimit.currentCalls,
        limit: apiLimit.limit,
        remaining: apiLimit.remaining,
        percentage: apiLimit.percentage,
        canMakeRequest: apiLimit.canMakeRequest,
        status: apiLimit.percentage >= 90 ? 'critical' : 
               apiLimit.percentage >= 70 ? 'warning' : 'ok',
      },
      recent: {
        days: days,
        stats: weeklyTrend,
        totalCalls: recentStats.reduce((sum, stat) => sum + stat.totalCalls, 0),
        averageDaily: Math.round(recentStats.reduce((sum, stat) => sum + stat.totalCalls, 0) / Math.max(recentStats.length, 1)),
      },
      recommendations: {
        shouldOptimizeCache: apiLimit.percentage > 80,
        shouldUpgradePlan: apiLimit.percentage > 95,
        peakHours: hourlyUsage
          .sort((a, b) => b.calls - a.calls)
          .slice(0, 3)
          .map(h => h.hour),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('날씨 API 통계 조회 실패:', error);
    
    return createErrorResponse(
      '날씨 API 통계를 조회하는데 실패했습니다',
      500,
      error instanceof Error ? error.message : '알 수 없는 오류'
    );
  }
}
