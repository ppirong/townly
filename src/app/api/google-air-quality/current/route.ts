import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentAirQuality } from '@/actions/google-air-quality';

/**
 * Google Air Quality API - 현재 대기질 상태 조회
 * POST /api/google-air-quality/current
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { latitude, longitude } = body;

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

    console.log(`🌬️ 사용자 ${userId} 현재 대기질 API 요청: ${latitude}, ${longitude}`);

    // Server Action을 통해 현재 대기질 조회
    const currentAirQuality = await getCurrentAirQuality(latitude, longitude);

    console.log(`✅ 사용자 ${userId} 현재 대기질 API 응답 완료`);

    return NextResponse.json({
      success: true,
      data: currentAirQuality,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('현재 대기질 API 오류:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '현재 대기질 정보를 가져오는데 실패했습니다.',
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * GET 요청 처리 (쿼리 파라미터 방식)
 * GET /api/google-air-quality/current?latitude=37.5665&longitude=126.9780
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const latitudeStr = searchParams.get('latitude');
    const longitudeStr = searchParams.get('longitude');

    if (!latitudeStr || !longitudeStr) {
      return NextResponse.json(
        { error: '위도(latitude)와 경도(longitude) 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(latitudeStr);
    const longitude = parseFloat(longitudeStr);

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

    console.log(`🌬️ 사용자 ${userId} 현재 대기질 GET API 요청: ${latitude}, ${longitude}`);

    // Server Action을 통해 현재 대기질 조회
    const currentAirQuality = await getCurrentAirQuality(latitude, longitude);

    console.log(`✅ 사용자 ${userId} 현재 대기질 GET API 응답 완료`);

    return NextResponse.json({
      success: true,
      data: currentAirQuality,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('현재 대기질 GET API 오류:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '현재 대기질 정보를 가져오는데 실패했습니다.',
        success: false 
      },
      { status: 500 }
    );
  }
}
