import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { weatherCache } from '@/lib/services/weather-cache';
import { weatherDbService } from '@/lib/services/weather-db';
import { weatherVectorDBService } from '@/lib/services/weather-vector-db';
import { getHourlyWeather, getDailyWeather } from '@/lib/services/weather';
import { z } from 'zod';

const cacheCleanupSchema = z.object({
  location: z.string().nullable().optional(),
  latitude: z.string().nullable().optional().transform(val => val ? parseFloat(val) : undefined),
  longitude: z.string().nullable().optional().transform(val => val ? parseFloat(val) : undefined),
  units: z.enum(['metric', 'imperial']).optional().default('metric'),
  days: z.union([z.literal(1), z.literal(5), z.literal(10), z.literal(15)]).optional().default(5),
}).refine(data => (data.location && data.location.trim() !== '') || (data.latitude !== undefined && data.longitude !== undefined), {
  message: '위치명 또는 위도/경도가 필요합니다',
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedParams = cacheCleanupSchema.parse(body);

    console.log('🧹 캐시 삭제 및 새로운 데이터 조회 시작...');

    // 1. 메모리 캐시 모든 날씨 데이터 삭제
    weatherCache.clearAll();
    console.log('✅ 메모리 캐시 삭제 완료');

    // 2. 데이터베이스 캐시 강제 삭제 (만료된 데이터뿐만 아니라 해당 위치의 모든 캐시 삭제)
    await weatherDbService.cleanupExpiredData();
    
    // 특정 위치의 캐시 키를 기반으로 관련 캐시 데이터 강제 삭제
    if (validatedParams.location || (validatedParams.latitude && validatedParams.longitude)) {
      try {
        // 위치 기반 캐시 키 생성 및 삭제
        let locationCacheKey;
        if (validatedParams.location) {
          locationCacheKey = `locationKey:${validatedParams.location}`;
        } else if (validatedParams.latitude && validatedParams.longitude) {
          locationCacheKey = `locationKey:${validatedParams.latitude},${validatedParams.longitude}`;
        }
        
        if (locationCacheKey) {
          await weatherDbService.forceDeleteLocationCaches(locationCacheKey);
          console.log('✅ 특정 위치 데이터베이스 캐시 강제 삭제 완료');
        }
      } catch (forceClearError) {
        console.error('⚠️ 특정 위치 캐시 강제 삭제 실패:', forceClearError);
      }
    }
    
    console.log('✅ 데이터베이스 캐시 삭제 완료');

    // 3. 날씨 임베딩 데이터 삭제 (사용자별 또는 전체)
    try {
      if (userId) {
        // 특정 사용자의 임베딩 데이터만 삭제
        const deletedEmbeddings = await weatherVectorDBService.deleteEmbeddingsByUserId(userId);
        console.log(`✅ 사용자 ${userId}의 날씨 임베딩 ${deletedEmbeddings}개 삭제 완료`);
      } else {
        // 오래된 임베딩 데이터 정리 (30일 이상)
        const deletedCount = await weatherVectorDBService.cleanupOldEmbeddings(30);
        console.log(`✅ 오래된 날씨 임베딩 ${deletedCount}개 삭제 완료`);
      }
    } catch (embeddingError) {
      console.error('⚠️ 날씨 임베딩 삭제 실패 (캐시 삭제는 성공):', embeddingError);
    }

    // 4. 캐시 삭제 후 새로운 데이터 조회 및 저장
    console.log('🔄 새로운 날씨 데이터 조회 및 저장 시작...');

    const [hourlyData, dailyData] = await Promise.all([
      // 시간별 날씨 강제 조회 (캐시 무시)
      getHourlyWeather({
        ...validatedParams,
        location: validatedParams.location || undefined,
        clerkUserId: userId, // 사용자 ID 포함하여 저장
      }),
      // 일별 날씨 강제 조회 (캐시 무시)
      getDailyWeather({
        ...validatedParams,
        location: validatedParams.location || undefined,
        clerkUserId: userId, // 사용자 ID 포함하여 저장
      }),
    ]);

    console.log('✅ 새로운 날씨 데이터 조회 및 저장 완료');

    // 5. 캐시 통계 조회
    const cacheStats = await weatherDbService.getCacheStats();

    return NextResponse.json({
      success: true,
      message: '캐시가 삭제되고 새로운 날씨 데이터가 저장되었습니다.',
      data: {
        hourlyData,
        dailyData: dailyData.dailyForecasts,
        headline: dailyData.headline,
        cacheStats,
      },
    });
  } catch (error) {
    console.error('캐시 삭제 및 데이터 갱신 실패:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '잘못된 요청 파라미터', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '캐시 삭제 및 데이터 갱신에 실패했습니다' },
      { status: 500 }
    );
  }
}

// GET 방식으로도 캐시 정리 가능 (파라미터 없이 전체 캐시만 삭제)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧹 전체 캐시 삭제 시작...');

    // 1. 메모리 캐시 전체 삭제
    weatherCache.clearAll();
    console.log('✅ 메모리 캐시 삭제 완료');

    // 2. 데이터베이스 만료된 캐시 삭제
    await weatherDbService.cleanupExpiredData();
    console.log('✅ 데이터베이스 만료된 캐시 삭제 완료');

    // 3. 캐시 통계 조회
    const cacheStats = await weatherDbService.getCacheStats();

    return NextResponse.json({
      success: true,
      message: '모든 캐시가 삭제되었습니다.',
      data: {
        cacheStats,
      },
    });
  } catch (error) {
    console.error('캐시 삭제 실패:', error);
    
    return NextResponse.json(
      { error: '캐시 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
}
