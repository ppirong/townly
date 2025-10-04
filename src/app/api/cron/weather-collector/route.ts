import { NextRequest, NextResponse } from 'next/server';
import { collectAllUsersWeatherData, shouldRunScheduler } from '@/lib/services/user-weather-scheduler';
import { env } from '@/lib/env';

/**
 * 사용자별 날씨 데이터 수집 크론 작업
 * 매일 6시, 12시, 18시, 24시(0시)에 실행됩니다.
 * 
 * Vercel Cron 설정:
 * - vercel.json에서 매시간 실행으로 설정
 * - 함수 내부에서 특정 시간(6, 12, 18, 24시)만 실제 실행
 * 
 * GET /api/cron/weather-collector
 */
export async function GET(request: NextRequest) {
  try {
    // 현재 시간 (KST)
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const currentHour = kstTime.getHours();
    
    console.log(`⏰ [${kstTime.toISOString()}] 날씨 수집 크론 작업 호출됨 (${currentHour}시)`);
    
    // Authorization 헤더 확인 (Vercel Cron 보안)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      console.warn('❌ 크론 작업 인증 실패');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 6시, 12시, 18시, 24시(0시)가 아니면 스킵
    if (!shouldRunScheduler(currentHour)) {
      console.log(`⏭️ 현재 시간(${currentHour}시)은 날씨 수집 시간이 아닙니다. 스킵합니다.`);
      return NextResponse.json({
        skipped: true,
        message: `날씨 수집 시간이 아닙니다 (현재: ${currentHour}시, 실행 시간: 6시, 12시, 18시, 24시)`,
        currentHour,
        executedAt: kstTime.toISOString(),
        timezone: 'Asia/Seoul'
      });
    }
    
    console.log(`🚀 날씨 수집 시작 (${currentHour}시)`);
    
    // 모든 사용자의 날씨 데이터 수집
    const result = await collectAllUsersWeatherData();
    
    console.log(`✅ 날씨 수집 완료 - 총 ${result.totalUsers}명, 성공 ${result.successCount}명, 실패 ${result.failureCount}명`);
    
    return NextResponse.json({
      success: true,
      message: '사용자별 날씨 데이터 수집 완료',
      data: {
        totalUsers: result.totalUsers,
        successCount: result.successCount,
        failureCount: result.failureCount,
        scheduleHour: result.scheduleHour,
        executedAt: result.executedAt,
      },
      // 상세 결과는 로그에만 출력하고 응답에는 요약만 포함
      summary: result.results.map(r => ({
        userId: r.userId,
        success: r.success,
        hourlyCount: r.hourlyDataCount,
        dailyCount: r.dailyDataCount,
        error: r.error,
      })),
      timezone: 'Asia/Seoul'
    });
    
  } catch (error) {
    console.error('❌ 날씨 수집 크론 작업 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: '날씨 수집 크론 작업 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      executedAt: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * 수동 실행 (테스트 및 관리 목적)
 * POST /api/cron/weather-collector
 * 
 * 사용 예시:
 * ```bash
 * curl -X POST https://your-domain.com/api/cron/weather-collector \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 날씨 수집 수동 실행 시작');
    
    // Authorization 헤더 확인
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      console.warn('❌ 수동 실행 인증 실패');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 시간 체크 없이 즉시 실행
    const result = await collectAllUsersWeatherData();
    
    console.log(`✅ 수동 실행 완료 - 총 ${result.totalUsers}명, 성공 ${result.successCount}명, 실패 ${result.failureCount}명`);
    
    return NextResponse.json({
      success: true,
      message: '날씨 데이터 수집 수동 실행 완료',
      data: result,
      timezone: 'Asia/Seoul'
    });
    
  } catch (error) {
    console.error('❌ 날씨 수집 수동 실행 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: '날씨 수집 수동 실행 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      executedAt: new Date().toISOString()
    }, { status: 500 });
  }
}

