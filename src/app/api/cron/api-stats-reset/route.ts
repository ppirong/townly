import { NextRequest, NextResponse } from 'next/server';
import { apiTrackingService } from '@/lib/services/api-tracking';

/**
 * 일일 API 통계 초기화 크론 작업
 * 매일 자정에 실행되어 전날 통계를 확정하고 새로운 날의 통계를 시작합니다.
 * 
 * Vercel Cron 설정:
 * - vercel.json에서 "0 0 * * *" (매일 자정 KST)로 설정
 * 
 * GET /api/cron/api-stats-reset
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🕛 일일 API 통계 초기화 크론 작업 시작');
    
    // Authorization 헤더 확인 (Vercel Cron 보안)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('❌ 크론 작업 인증 실패');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 일일 통계 초기화 실행
    await apiTrackingService.resetDailyStats();
    
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // KST 변환
    
    console.log(`✅ 일일 API 통계 초기화 완료: ${kstTime.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: '일일 API 통계 초기화 완료',
      executedAt: kstTime.toISOString(),
      timezone: 'Asia/Seoul'
    });

  } catch (error) {
    console.error('❌ 일일 API 통계 초기화 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: '일일 API 통계 초기화 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      executedAt: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * 수동 초기화 (테스트 및 관리 목적)
 * POST /api/cron/api-stats-reset
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 수동 API 통계 초기화 요청');
    
    // 간단한 보안 검증 (필요시 더 강화 가능)
    const body = await request.json();
    if (body.secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await apiTrackingService.resetDailyStats();
    
    const now = new Date();
    console.log(`✅ 수동 API 통계 초기화 완료: ${now.toISOString()}`);

    return NextResponse.json({
      success: true,
      message: '수동 API 통계 초기화 완료',
      executedAt: now.toISOString(),
      manual: true
    });

  } catch (error) {
    console.error('❌ 수동 API 통계 초기화 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: '수동 API 통계 초기화 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
