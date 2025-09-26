import { NextRequest, NextResponse } from 'next/server';
import { 
  getHourlyAirQualityByStation, 
  getDailyAirQualityByStation,
  getStationAndRegionInfo 
} from '@/actions/regional-airquality';

/**
 * 측정소 기반 지역별 대기질 정보 API
 * GET /api/airquality/station/region?stationName=중구&type=hourly&date=2024-01-15&numOfRows=24
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const stationName = searchParams.get('stationName');
    const type = searchParams.get('type') || 'hourly';
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const numOfRows = parseInt(searchParams.get('numOfRows') || (type === 'hourly' ? '24' : '7'));

    if (!stationName) {
      return NextResponse.json(
        { error: 'stationName 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    if (type !== 'hourly' && type !== 'daily') {
      return NextResponse.json(
        { error: 'type은 hourly 또는 daily여야 합니다.' },
        { status: 400 }
      );
    }

    // 측정소와 지역 정보 조회
    const stationInfo = await getStationAndRegionInfo(stationName);
    
    if (!stationInfo) {
      return NextResponse.json(
        { error: `측정소 '${stationName}'의 정보를 찾을 수 없습니다.` },
        { status: 404 }
      );
    }

    // 대기질 정보 조회
    const airQualityData = type === 'hourly'
      ? await getHourlyAirQualityByStation(stationName, date, numOfRows)
      : await getDailyAirQualityByStation(stationName, date, numOfRows);

    return NextResponse.json({
      success: true,
      data: {
        station: stationInfo.station,
        region: stationInfo.region,
        airQuality: airQualityData,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('측정소 기반 지역별 대기질 조회 오류:', error);
    
    return NextResponse.json(
      { 
        error: '측정소 기반 지역별 대기질 정보를 가져오는데 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
