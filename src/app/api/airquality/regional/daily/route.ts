import { NextRequest, NextResponse } from 'next/server';
import { getDailyAirQualityByRegion } from '@/actions/regional-airquality';

/**
 * 지역별 일별 대기질 정보 API
 * GET /api/airquality/regional/daily?regionCode=seoul&date=2024-01-15&numOfRows=7
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const regionCode = searchParams.get('regionCode');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const numOfRows = parseInt(searchParams.get('numOfRows') || '7');

    if (!regionCode) {
      return NextResponse.json(
        { error: 'regionCode 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const airQualityData = await getDailyAirQualityByRegion(regionCode, date, numOfRows);

    return NextResponse.json({
      success: true,
      data: airQualityData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('지역별 일별 대기질 조회 오류:', error);
    
    return NextResponse.json(
      { 
        error: '지역별 일별 대기질 정보를 가져오는데 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
