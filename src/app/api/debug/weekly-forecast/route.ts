import { NextRequest, NextResponse } from 'next/server';
import { getLatestWeeklyForecast } from '@/actions/airquality';

/**
 * 미세먼지 주간예보 API 디버그 라우트
 * 개발 중 테스트용
 */
export async function GET(request: NextRequest) {
  try {
    console.log('주간예보 API 테스트 요청 받음');
    
    // 쿼리 파라미터에서 날짜 가져오기 (선택사항)
    const { searchParams } = new URL(request.url);
    const searchDate = searchParams.get('searchDate');
    
    // 주간예보 데이터 조회
    const forecasts = await getLatestWeeklyForecast();
    
    console.log(`주간예보 조회 완료: ${forecasts.length}개 항목`);
    
    return NextResponse.json({
      success: true,
      message: `주간예보 데이터 ${forecasts.length}개 조회 완료`,
      data: forecasts,
      searchDate: searchDate || '오늘',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('주간예보 API 테스트 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
