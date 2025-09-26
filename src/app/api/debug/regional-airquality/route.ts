import { NextRequest, NextResponse } from 'next/server';
import { 
  getHourlyAirQualityByStation, 
  getDailyAirQualityByStation,
  getStationAndRegionInfo,
  getNearestStationAndRegion,
  getSupportedRegions
} from '@/actions/regional-airquality';

/**
 * 지역별 대기질 정보 디버그 API
 * GET /api/debug/regional-airquality?test=supported-regions
 * GET /api/debug/regional-airquality?test=station-region&stationName=중구
 * GET /api/debug/regional-airquality?test=hourly&stationName=중구
 * GET /api/debug/regional-airquality?test=daily&stationName=중구
 * GET /api/debug/regional-airquality?test=nearest&lat=37.5635&lng=126.9975
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const test = searchParams.get('test');

    if (!test) {
      return NextResponse.json({
        message: '지역별 대기질 정보 디버그 API',
        availableTests: [
          'supported-regions - 지원되는 지역 목록',
          'station-region - 측정소와 지역 정보 (stationName 필요)',
          'hourly - 시간별 대기질 (stationName 필요)',
          'daily - 일별 대기질 (stationName 필요)',
          'nearest - 가장 가까운 측정소 (lat, lng 필요)'
        ]
      });
    }

    switch (test) {
      case 'supported-regions': {
        const regions = await getSupportedRegions();
        return NextResponse.json({
          success: true,
          test: 'supported-regions',
          data: regions,
          count: regions.length
        });
      }

      case 'station-region': {
        const stationName = searchParams.get('stationName') || '중구';
        const stationInfo = await getStationAndRegionInfo(stationName);
        
        return NextResponse.json({
          success: true,
          test: 'station-region',
          stationName,
          data: stationInfo
        });
      }

      case 'hourly': {
        const stationName = searchParams.get('stationName') || '중구';
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        
        const result = await getHourlyAirQualityByStation(stationName, date, 12);
        
        return NextResponse.json({
          success: true,
          test: 'hourly',
          stationName,
          date,
          data: result,
          dataCount: result.data.length
        });
      }

      case 'daily': {
        const stationName = searchParams.get('stationName') || '중구';
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        
        const result = await getDailyAirQualityByStation(stationName, date, 7);
        
        return NextResponse.json({
          success: true,
          test: 'daily',
          stationName,
          date,
          data: result,
          dataCount: result.data.length
        });
      }

      case 'nearest': {
        const lat = parseFloat(searchParams.get('lat') || '37.5635');
        const lng = parseFloat(searchParams.get('lng') || '126.9975');
        
        const nearest = await getNearestStationAndRegion(lat, lng);
        
        return NextResponse.json({
          success: true,
          test: 'nearest',
          coordinates: { lat, lng },
          data: nearest
        });
      }

      default:
        return NextResponse.json(
          { error: `알 수 없는 테스트: ${test}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('지역별 대기질 디버그 오류:', error);
    
    return NextResponse.json(
      { 
        error: '지역별 대기질 정보 테스트 실패',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
