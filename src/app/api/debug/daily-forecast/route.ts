import { NextRequest, NextResponse } from 'next/server';
import { getSevenDayForecast } from '@/actions/daily-forecast';

/**
 * 7일간 대기질 예보 디버그 API
 * GET /api/debug/daily-forecast?region=서울
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const region = searchParams.get('region') || '서울';

    console.log('7일간 예보 API 테스트 시작 - 지역:', region);

    const forecastData = await getSevenDayForecast({ userRegion: region });

    return NextResponse.json({
      success: true,
      region,
      data: forecastData,
      timestamp: new Date().toISOString(),
      totalDays: forecastData.length,
    });

  } catch (error) {
    console.error('7일간 예보 API 테스트 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
