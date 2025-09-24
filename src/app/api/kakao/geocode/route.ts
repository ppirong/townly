import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * Kakao Local API를 사용한 역지오코딩
 * 좌표를 주소로 변환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'lat, lng 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    if (!env.KAKAO_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Kakao API 키가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    // Kakao Local API 역지오코딩 호출
    const kakaoResponse = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      {
        headers: {
          'Authorization': `KakaoAK ${env.KAKAO_API_KEY}`,
        },
      }
    );

    if (!kakaoResponse.ok) {
      throw new Error(`Kakao API 오류: ${kakaoResponse.status}`);
    }

    const kakaoData = await kakaoResponse.json();

    if (!kakaoData.documents || kakaoData.documents.length === 0) {
      return NextResponse.json(
        { success: false, error: '해당 좌표의 주소를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const document = kakaoData.documents[0];
    let address = '';
    let city = '';

    // 도로명 주소 우선, 없으면 지번 주소 사용
    if (document.road_address) {
      address = document.road_address.address_name;
      city = document.road_address.region_1depth_name || document.road_address.region_2depth_name;
    } else if (document.address) {
      address = document.address.address_name;
      city = document.address.region_1depth_name || document.address.region_2depth_name;
    }

    return NextResponse.json({
      success: true,
      data: {
        address,
        city,
        roadAddress: document.road_address?.address_name,
        jibunAddress: document.address?.address_name,
        region1depth: document.address?.region_1depth_name,
        region2depth: document.address?.region_2depth_name,
        region3depth: document.address?.region_3depth_name,
      },
    });

  } catch (error) {
    console.error('역지오코딩 API 오류:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '역지오코딩 처리 중 오류가 발생했습니다' 
      },
      { status: 500 }
    );
  }
}
