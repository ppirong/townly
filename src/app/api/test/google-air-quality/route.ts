import { NextRequest, NextResponse } from 'next/server';
import { googleAirQualityService } from '@/lib/services/google-air-quality';

/**
 * Google Air Quality API 테스트 엔드포인트
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('lat') || '37.5665');
    const longitude = parseFloat(searchParams.get('lng') || '126.9780');

    console.log(`🧪 Google Air Quality API 테스트 시작: ${latitude}, ${longitude}`);

    // 현재 대기질 정보 조회 테스트
    const currentData = await googleAirQualityService.getCurrentAirQuality({
      latitude,
      longitude,
      includeLocalAqi: true,
      includeDominantPollutant: true,
      includeHealthSuggestion: true,
      languageCode: 'ko',
    });

    console.log('✅ 현재 대기질 조회 성공');

    // 시간별 예보 조회 테스트 (Google 공식 문서 기준)
    const hourlyData = await googleAirQualityService.getHourlyForecast({
      latitude,
      longitude,
      hours: 24, // 24시간 예보 테스트 (96시간 제한 내)
      includeLocalAqi: true,
      includeDominantPollutant: true,
      includeHealthSuggestion: true,
      languageCode: 'ko',
    });

    console.log('✅ 시간별 예보 조회 성공');

    return NextResponse.json({
      success: true,
      message: 'Google Air Quality API 테스트 성공',
      data: {
        current: currentData,
        hourly: hourlyData,
      },
    });

  } catch (error) {
    console.error('🚨 Google Air Quality API 테스트 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
