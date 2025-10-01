import { NextRequest, NextResponse } from 'next/server';
import { recalculateAllScheduleTimes } from '@/actions/email-schedules';

/**
 * 모든 스케줄의 nextSendAt 시간 재계산 API
 * POST /api/admin/recalculate-schedules
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 관리자 스케줄 시간 재계산 요청');
    
    const result = await recalculateAllScheduleTimes();
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 스케줄 시간 재계산 API 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
