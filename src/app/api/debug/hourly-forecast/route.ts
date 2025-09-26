import { NextRequest, NextResponse } from 'next/server';
import { 
  getLatestHourlyForecast,
  getHourlyForecast,
  getRegionalHourlyForecast,
  getHourlyForecastByPollutant
} from '@/actions/hourly-forecast';

/**
 * 시간별 대기예보 디버그 API
 * GET /api/debug/hourly-forecast?test=latest
 * GET /api/debug/hourly-forecast?test=date&searchDate=2024-12-15
 * GET /api/debug/hourly-forecast?test=region&region=수도권
 * GET /api/debug/hourly-forecast?test=pollutant&pollutant=PM10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const test = searchParams.get('test');

    if (!test) {
      return NextResponse.json({
        message: '시간별 대기예보 디버그 API',
        availableTests: [
          'latest - 최신 시간별 대기예보',
          'date - 특정 날짜 시간별 대기예보 (searchDate 필요)',
          'region - 지역별 시간별 대기예보 (region 필요)',
          'pollutant - 오염물질별 시간별 대기예보 (pollutant 필요: PM10 또는 PM25)'
        ]
      });
    }

    switch (test) {
      case 'latest': {
        const forecasts = await getLatestHourlyForecast();
        return NextResponse.json({
          success: true,
          test: 'latest',
          data: forecasts,
          count: forecasts.length,
          summary: {
            pm10Count: forecasts.filter(f => f.informCode === 'PM10').length,
            pm25Count: forecasts.filter(f => f.informCode === 'PM25').length,
            gradeDistribution: forecasts.reduce((acc, f) => {
              acc[f.informGrade] = (acc[f.informGrade] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          }
        });
      }

      case 'date': {
        const searchDate = searchParams.get('searchDate') || new Date().toISOString().split('T')[0];
        const forecasts = await getHourlyForecast(searchDate);
        
        return NextResponse.json({
          success: true,
          test: 'date',
          searchDate,
          data: forecasts,
          count: forecasts.length
        });
      }

      case 'region': {
        const region = searchParams.get('region') || '수도권';
        const searchDate = searchParams.get('searchDate') || new Date().toISOString().split('T')[0];
        const forecasts = await getRegionalHourlyForecast(region, searchDate);
        
        return NextResponse.json({
          success: true,
          test: 'region',
          region,
          searchDate,
          data: forecasts,
          count: forecasts.length
        });
      }

      case 'pollutant': {
        const pollutant = searchParams.get('pollutant') as 'PM10' | 'PM25' || 'PM10';
        const searchDate = searchParams.get('searchDate') || new Date().toISOString().split('T')[0];
        const forecasts = await getHourlyForecastByPollutant(pollutant, searchDate);
        
        return NextResponse.json({
          success: true,
          test: 'pollutant',
          pollutant,
          searchDate,
          data: forecasts,
          count: forecasts.length
        });
      }

      default:
        return NextResponse.json(
          { error: `알 수 없는 테스트: ${test}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('시간별 대기예보 디버그 오류:', error);
    
    return NextResponse.json(
      { 
        error: '시간별 대기예보 테스트 실패',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
