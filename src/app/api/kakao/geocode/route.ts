import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * Kakao Local API를 사용한 역지오코딩
 * 좌표를 주소로 변환
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n🗺️ ===== Kakao 역지오코딩 API 요청 시작 =====');
  
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    
    console.log('📍 요청 파라미터:', { lat, lng });

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'lat, lng 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    // 좌표 유효성 검증
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 좌표 형식입니다' },
        { status: 400 }
      );
    }
    
    // 한국 영역 좌표 범위 검증 (대략적)
    if (latitude < 33 || latitude > 43 || longitude < 124 || longitude > 132) {
      console.warn('한국 영역 외부 좌표:', { latitude, longitude });
    }

    // REST API 키 확인 (공식 문서 기준 - REST API 키 필수)
    const apiKey = env.KAKAO_REST_API_KEY;
    
    if (!apiKey) {
      console.error('Kakao REST API 키 환경변수 확인:', {
        KAKAO_REST_API_KEY: !!env.KAKAO_REST_API_KEY,
        message: 'Local API는 REST API 키가 필요합니다'
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Kakao REST API 키가 설정되지 않았습니다. Local API는 REST API 키가 필요합니다.',
          hint: 'KAKAO_REST_API_KEY 환경변수를 설정해주세요'
        },
        { status: 500 }
      );
    }
    
    console.log('🔑 Kakao REST API 키 확인됨:', `${apiKey.substring(0, 8)}...`);
    console.log('📊 좌표 정보:', { 
      latitude: latitude.toFixed(6), 
      longitude: longitude.toFixed(6),
      isKoreaRegion: latitude >= 33 && latitude <= 43 && longitude >= 124 && longitude <= 132
    });

    // Kakao Local API 역지오코딩 호출 (공식 문서 기준)
    const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}&input_coord=WGS84`;
    console.log('🌐 Kakao API 요청 URL:', url);
    console.log('📤 요청 헤더:', {
      'Authorization': `KakaoAK ${apiKey.substring(0, 8)}...`,
      'Content-Type': 'application/json'
    });
    
    const requestStartTime = Date.now();
    const kakaoResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `KakaoAK ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    const requestDuration = Date.now() - requestStartTime;
    console.log(`⏱️ Kakao API 응답 시간: ${requestDuration}ms`);
    console.log('📥 응답 상태:', {
      status: kakaoResponse.status,
      statusText: kakaoResponse.statusText,
      ok: kakaoResponse.ok
    });

    if (!kakaoResponse.ok) {
      const errorText = await kakaoResponse.text();
      console.error('Kakao API 상세 오류:', {
        status: kakaoResponse.status,
        statusText: kakaoResponse.statusText,
        url: `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
        apiKeyUsed: apiKey ? `${apiKey.substring(0, 8)}...` : 'undefined',
        headers: Object.fromEntries(kakaoResponse.headers.entries()),
        errorBody: errorText
      });
      
      // 특정 오류 케이스별 처리
      if (errorText.includes('disabled OPEN_MAP_AND_LOCAL service')) {
        console.warn('Kakao 지도/로컬 서비스가 비활성화됨. 기본 주소 정보 반환.');
        return NextResponse.json({
          success: true,
          data: {
            address: `위도: ${latitude.toFixed(4)}, 경도: ${longitude.toFixed(4)}`,
            city: '위치 정보',
            roadAddress: null,
            jibunAddress: null,
            region1depth: null,
            region2depth: null,
            region3depth: null,
          },
          warning: 'Kakao 지도/로컬 서비스 활성화 필요',
          solution: 'https://developers.kakao.com에서 앱 설정 > 제품 설정 > 지도/로컬 활성화'
        });
      }
      
      // API 키 관련 오류
      if (kakaoResponse.status === 401 || errorText.includes('Unauthorized')) {
        return NextResponse.json({
          success: false,
          error: 'Kakao API 키 인증 실패',
          hint: 'REST API 키를 확인하고 올바른 형식으로 설정했는지 확인해주세요'
        }, { status: 401 });
      }
      
      // 할당량 초과 오류
      if (kakaoResponse.status === 429 || errorText.includes('quota')) {
        return NextResponse.json({
          success: false,
          error: 'API 호출 할당량 초과',
          hint: '잠시 후 다시 시도하거나 Kakao Developers에서 할당량을 확인해주세요'
        }, { status: 429 });
      }
      
      throw new Error(`Kakao API 오류: ${kakaoResponse.status} - ${errorText}`);
    }

    const kakaoData = await kakaoResponse.json();
    console.log('📋 Kakao API 응답 데이터:', JSON.stringify(kakaoData, null, 2));

    if (!kakaoData.documents || kakaoData.documents.length === 0) {
      console.log('❌ 주소 변환 실패: 문서가 없음');
      return NextResponse.json(
        { success: false, error: '해당 좌표의 주소를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const document = kakaoData.documents[0];
    console.log('📍 첫 번째 문서 정보:', JSON.stringify(document, null, 2));
    
    let address = '';
    let city = '';

    // 도로명 주소 우선, 없으면 지번 주소 사용
    if (document.road_address) {
      address = document.road_address.address_name;
      city = document.road_address.region_2depth_name || document.road_address.region_1depth_name;
      console.log('🛣️ 도로명 주소 사용:', address);
    } else if (document.address) {
      address = document.address.address_name;
      city = document.address.region_2depth_name || document.address.region_1depth_name;
      console.log('🏠 지번 주소 사용:', address);
    }

    const responseData = {
      address,
      city,
      roadAddress: document.road_address?.address_name,
      jibunAddress: document.address?.address_name,
      region1depth: document.address?.region_1depth_name,
      region2depth: document.address?.region_2depth_name,
      region3depth: document.address?.region_3depth_name,
    };
    
    console.log('✅ 최종 응답 데이터:', JSON.stringify(responseData, null, 2));
    console.log(`🎯 총 처리 시간: ${Date.now() - startTime}ms`);
    console.log('🗺️ ===== Kakao 역지오코딩 API 요청 완료 =====\n');

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ 역지오코딩 API 오류:', error);
    console.error(`⏱️ 오류 발생까지 시간: ${totalTime}ms`);
    console.log('🗺️ ===== Kakao 역지오코딩 API 요청 실패 =====\n');
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '역지오코딩 처리 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}
