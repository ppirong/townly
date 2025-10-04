import { NextRequest, NextResponse } from 'next/server';
import { googleAirQualityService } from '@/lib/services/google-air-quality';

/**
 * Google Air Quality API 테스트 엔드포인트 - 현재 대기질
 * GET /api/test/google-air-quality/current?latitude=37.5665&longitude=126.9780
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitudeStr = searchParams.get('latitude');
    const longitudeStr = searchParams.get('longitude');

    // 기본값: 서울 시청 좌표
    const latitude = latitudeStr ? parseFloat(latitudeStr) : 37.5665;
    const longitude = longitudeStr ? parseFloat(longitudeStr) : 126.9780;

    // 입력값 검증
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: '위도와 경도는 유효한 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: '위도는 -90과 90 사이의 값이어야 합니다.' },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: '경도는 -180과 180 사이의 값이어야 합니다.' },
        { status: 400 }
      );
    }

    console.log(`🧪 Google Air Quality API 테스트 - 현재 대기질: ${latitude}, ${longitude}`);

    // Google Air Quality API 직접 호출
    const currentData = await googleAirQualityService.getCurrentAirQuality({
      latitude,
      longitude,
      includeLocalAqi: true,
      includeDominantPollutant: true,
      includeHealthSuggestion: true,
      languageCode: 'ko',
    });

    // 데이터 처리
    const processedData = googleAirQualityService.processAirQualityData(currentData);

    console.log(`✅ Google Air Quality API 테스트 완료`);

    return NextResponse.json({
      success: true,
      message: 'Google Air Quality API 테스트 성공',
      location: {
        latitude,
        longitude,
        description: latitude === 37.5665 && longitude === 126.9780 ? '서울시청' : '사용자 지정 위치'
      },
      data: {
        raw: currentData,
        processed: processedData,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Google Air Quality API 테스트 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Google Air Quality API 테스트 실패',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST 요청으로도 테스트 가능
 * POST /api/test/google-air-quality/current
 * Body: { "latitude": 37.5665, "longitude": 126.9780 }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude = 37.5665, longitude = 126.9780 } = body;

    // 입력값 검증
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: '위도와 경도는 숫자여야 합니다.' },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: '위도는 -90과 90 사이의 값이어야 합니다.' },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: '경도는 -180과 180 사이의 값이어야 합니다.' },
        { status: 400 }
      );
    }

    console.log(`🧪 Google Air Quality API POST 테스트 - 현재 대기질: ${latitude}, ${longitude}`);

    // Google Air Quality API 직접 호출
    const currentData = await googleAirQualityService.getCurrentAirQuality({
      latitude,
      longitude,
      includeLocalAqi: true,
      includeDominantPollutant: true,
      includeHealthSuggestion: true,
      languageCode: 'ko',
    });

    // 데이터 처리
    const processedData = googleAirQualityService.processAirQualityData(currentData);

    console.log(`✅ Google Air Quality API POST 테스트 완료`);

    return NextResponse.json({
      success: true,
      message: 'Google Air Quality API POST 테스트 성공',
      location: {
        latitude,
        longitude,
        description: latitude === 37.5665 && longitude === 126.9780 ? '서울시청' : '사용자 지정 위치'
      },
      data: {
        raw: currentData,
        processed: processedData,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Google Air Quality API POST 테스트 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Google Air Quality API POST 테스트 실패',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
