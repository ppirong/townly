import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { findNearestStation, findNearbyStations } from '@/lib/data/stations';

const nearestStationSchema = z.object({
  latitude: z.string().transform(val => parseFloat(val)),
  longitude: z.string().transform(val => parseFloat(val)),
  maxDistance: z.string().optional().transform(val => val ? parseInt(val) : 50000),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const maxDistance = searchParams.get('maxDistance');
    const limit = searchParams.get('limit');

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: '위도(latitude)와 경도(longitude) 파라미터가 필요합니다' },
        { status: 400 }
      );
    }

    const validatedParams = nearestStationSchema.parse({
      latitude,
      longitude,
      maxDistance,
      limit,
    });

    console.log(`🔍 디버그: 가장 가까운 측정소 찾기`);
    console.log(`📍 사용자 위치: (${validatedParams.latitude}, ${validatedParams.longitude})`);

    // 가장 가까운 측정소 찾기
    const nearestStation = findNearestStation(
      validatedParams.latitude,
      validatedParams.longitude,
      validatedParams.maxDistance
    );

    // 근접 측정소 목록 조회
    const nearbyStations = findNearbyStations(
      validatedParams.latitude,
      validatedParams.longitude,
      validatedParams.maxDistance,
      validatedParams.limit
    );

    // 운정 지역 테스트 (운정신도시 중심부)
    const unjeongCenter = { lat: 37.7390, lng: 126.7670 };
    const distanceToUnjeong = nearbyStations.find(station => station.name === '운정');

    return NextResponse.json({
      success: true,
      data: {
        userLocation: {
          latitude: validatedParams.latitude,
          longitude: validatedParams.longitude,
        },
        nearestStation: nearestStation ? {
          name: nearestStation.name,
          sido: nearestStation.sido,
          latitude: nearestStation.latitude,
          longitude: nearestStation.longitude,
          address: nearestStation.address,
          distance: nearbyStations.find(s => s.name === nearestStation.name)?.distance || 0,
        } : null,
        nearbyStations: nearbyStations.map((station, index) => ({
          rank: index + 1,
          name: station.name,
          sido: station.sido,
          latitude: station.latitude,
          longitude: station.longitude,
          address: station.address,
          distance: station.distance,
          distanceKm: (station.distance / 1000).toFixed(2),
        })),
        unjeongInfo: distanceToUnjeong ? {
          found: true,
          distance: distanceToUnjeong.distance,
          distanceKm: (distanceToUnjeong.distance / 1000).toFixed(2),
          rank: nearbyStations.findIndex(s => s.name === '운정') + 1,
        } : {
          found: false,
          reason: '50km 반경 내에 운정 측정소가 없습니다.',
        },
        testLocations: {
          unjeongCenter: {
            description: '운정신도시 중심부',
            coordinates: unjeongCenter,
            testUrl: `${request.url.split('?')[0]}?latitude=${unjeongCenter.lat}&longitude=${unjeongCenter.lng}`,
          },
        },
      },
    });
  } catch (error) {
    console.error('가장 가까운 측정소 조회 실패:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '잘못된 요청 파라미터', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '측정소 정보를 가져오는데 실패했습니다' },
      { status: 500 }
    );
  }
}
