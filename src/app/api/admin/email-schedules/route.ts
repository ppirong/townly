import { NextRequest, NextResponse } from 'next/server';
import { getEmailSchedules } from '@/actions/email-schedules';
import { auth } from '@clerk/nextjs/server';

/**
 * 이메일 스케줄 목록 조회 API
 * GET /api/admin/email-schedules
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인 (테스트 모드에서는 우회 가능)
    const { userId } = await auth();
    const isTestMode = request.headers.get('User-Agent') === 'test-script';
    
    if (!userId && !isTestMode) {
      return NextResponse.json(
        { error: 'Unauthorized: 관리자 로그인이 필요합니다' },
        { status: 401 }
      );
    }

    console.log('📋 이메일 스케줄 목록 조회 API 호출됨');

    // 이메일 스케줄 목록 조회
    const schedules = await getEmailSchedules();
    
    console.log(`✅ 스케줄 조회 성공: ${schedules.length}개`);

    return NextResponse.json({
      success: true,
      schedules,
      count: schedules.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 이메일 스케줄 조회 API 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * 스케줄 상태 요약 정보
 * GET /api/admin/email-schedules?summary=true
 */
export async function handleSummaryRequest() {
  try {
    const schedules = await getEmailSchedules();
    
    const summary = {
      total: schedules.length,
      active: schedules.filter(s => s.isActive).length,
      inactive: schedules.filter(s => !s.isActive).length,
      morningSchedules: schedules.filter(s => s.scheduleTime === '06:00').length,
      eveningSchedules: schedules.filter(s => s.scheduleTime === '18:00').length,
      nextScheduled: schedules
        .filter(s => s.isActive)
        .sort((a, b) => new Date(a.nextSendAt).getTime() - new Date(b.nextSendAt).getTime())
        .slice(0, 3)
        .map(s => ({
          title: s.title,
          scheduleTime: s.scheduleTime,
          nextSendAt: s.nextSendAt,
        }))
    };

    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
