import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { weatherCache } from '@/lib/services/weather-cache';
import { weatherDbService } from '@/lib/services/weather-db';
import { getHourlyWeather, getDailyWeather } from '@/lib/services/weather';
import { cacheClearRequestSchema } from '@/lib/schemas/weather-schemas';
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/api-response';

// 마스터 규칙에 따라 기존 스키마를 사용

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const validatedParams = cacheClearRequestSchema.parse(body);

    const isRefreshMode = validatedParams.mode === 'refresh_location';
    
    console.log(`🧹 캐시 ${isRefreshMode ? '삭제 및 새로운 데이터 조회' : '정리'} 시작...`);

    // 1. 메모리 캐시 모든 날씨 데이터 삭제
    weatherCache.clearAll();
    console.log('✅ 메모리 캐시 삭제 완료');

    // 2. 데이터베이스 캐시 정리
    await weatherDbService.cleanupExpiredData();
    
    // 특정 위치 캐시 강제 삭제 (refresh_location 모드에서만)
    if (isRefreshMode) {
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

    // 3. 새로운 데이터 조회 (refresh_location 모드에서만)
    let hourlyData = null;
    let dailyData = null;

    if (isRefreshMode) {
      console.log('🔄 새로운 날씨 데이터 조회 및 저장 시작...');
      
      const [hourlyResult, dailyResult] = await Promise.all([
        // 시간별 날씨 강제 조회 (캐시 무시)
        getHourlyWeather({
          location: validatedParams.location,
          latitude: validatedParams.latitude ? parseFloat(validatedParams.latitude) : undefined,
          longitude: validatedParams.longitude ? parseFloat(validatedParams.longitude) : undefined,
          clerkUserId: userId, // 사용자 ID 포함하여 저장
        }),
        // 일별 날씨 강제 조회 (캐시 무시)
        getDailyWeather({
          location: validatedParams.location,
          latitude: validatedParams.latitude ? parseFloat(validatedParams.latitude) : undefined,
          longitude: validatedParams.longitude ? parseFloat(validatedParams.longitude) : undefined,
          clerkUserId: userId, // 사용자 ID 포함하여 저장
        }),
      ]);
      
      hourlyData = hourlyResult;
      dailyData = dailyResult;
      
      console.log('✅ 새로운 날씨 데이터 조회 및 저장 완료');
    }

    console.log('✅ 새로운 날씨 데이터 조회 및 저장 완료');

    // 5. 캐시 통계 조회
    const cacheStats = await weatherDbService.getCacheStats();

    return createSuccessResponse({
      hourlyData,
      dailyData: dailyData?.dailyForecasts || null,
      headline: dailyData?.headline || null,
      cacheStats,
    }, isRefreshMode 
      ? '캐시가 삭제되고 새로운 날씨 데이터가 저장되었습니다.' 
      : '캐시가 정리되었습니다.');
  } catch (error) {
    console.error('캐시 삭제 및 데이터 갱신 실패:', error);
    
    if (error instanceof Error && 'issues' in error) {
      return createErrorResponse('잘못된 요청 파라미터', 400, (error as any).issues);
    }

    return createErrorResponse('캐시 삭제 및 데이터 갱신에 실패했습니다', 500);
  }
}

// GET 방식으로도 캐시 정리 가능 (파라미터 없이 전체 캐시만 삭제)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return createErrorResponse('Unauthorized', 401);
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

    return createSuccessResponse({ cacheStats }, '모든 캐시가 삭제되었습니다.');
  } catch (error) {
    console.error('캐시 삭제 실패:', error);
    
    return createErrorResponse('캐시 삭제에 실패했습니다', 500);
  }
}
