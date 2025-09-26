import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userLocations } from '@/db/schema';
import { env } from '@/lib/env';
import { weatherRateLimiter } from '@/lib/services/weather-rate-limiter';
import { getHourlyWeather } from '@/lib/services/weather';

/**
 * 데이터베이스 저장된 위치로 날씨 API 테스트 (인증 불필요)
 * GET /api/debug/location-weather-test
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 데이터베이스 위치로 날씨 API 테스트 시작');

    // 1. 데이터베이스에서 모든 사용자 위치 조회
    const allLocations = await db
      .select()
      .from(userLocations)
      .limit(5); // 최대 5개만 조회

    if (allLocations.length === 0) {
      return NextResponse.json({
        error: '데이터베이스에 저장된 위치 정보가 없습니다.',
        locations: [],
        suggestion: '먼저 위치를 설정한 후 테스트해주세요.'
      }, { status: 404 });
    }

    console.log(`📍 데이터베이스에서 ${allLocations.length}개 위치 발견`);

    // 2. 첫 번째 위치로 테스트
    const testLocation = allLocations[0];
    console.log('🎯 테스트 위치:', testLocation);

    // Rate Limiter 상태 확인
    const rateLimiterStats = weatherRateLimiter.getStats();
    
    if (!weatherRateLimiter.canMakeRequest()) {
      const waitTime = weatherRateLimiter.getWaitTime();
      return NextResponse.json({
        error: `API 호출 한도 초과: ${Math.round(waitTime / 1000)}초 후 다시 시도해주세요.`,
        rateLimiterStats,
        testLocation: {
          address: testLocation.address,
          cityName: testLocation.cityName,
          coordinates: `${testLocation.latitude}, ${testLocation.longitude}`
        }
      }, { status: 429 });
    }

    // 3. 위도/경도로 직접 AccuWeather API 테스트
    console.log('🌍 좌표로 위치 키 조회 중...');
    weatherRateLimiter.recordRequest();
    
    const latitude = parseFloat(testLocation.latitude);
    const longitude = parseFloat(testLocation.longitude);
    
    const geopositionUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search`;
    const geoResponse = await fetch(
      `${geopositionUrl}?apikey=${env.ACCUWEATHER_API_KEY}&q=${latitude},${longitude}&language=ko-kr`
    );
    
    if (!geoResponse.ok) {
      return NextResponse.json({
        error: `좌표 검색 API 실패: ${geoResponse.status} ${geoResponse.statusText}`,
        stage: 'geoposition_search',
        httpStatus: geoResponse.status,
        testLocation: {
          address: testLocation.address,
          cityName: testLocation.cityName,
          coordinates: `${latitude}, ${longitude}`
        },
        rateLimiterStats: weatherRateLimiter.getStats()
      }, { status: geoResponse.status });
    }
    
    const geoLocation = await geoResponse.json();
    
    if (!geoLocation || !geoLocation.Key) {
      return NextResponse.json({
        error: `좌표에 해당하는 위치를 찾을 수 없습니다: ${latitude}, ${longitude}`,
        stage: 'geoposition_search',
        geoLocation,
        testLocation: {
          address: testLocation.address,
          cityName: testLocation.cityName,
          coordinates: `${latitude}, ${longitude}`
        },
        rateLimiterStats: weatherRateLimiter.getStats()
      }, { status: 404 });
    }
    
    const locationKey = geoLocation.Key;
    console.log(`✅ 위치 키 조회 성공: ${geoLocation.LocalizedName} (Key: ${locationKey})`);

    // Rate Limiter 확인 (두 번째 요청)
    if (!weatherRateLimiter.canMakeRequest()) {
      const waitTime = weatherRateLimiter.getWaitTime();
      return NextResponse.json({
        success: false,
        stage: 'hourly_forecast_blocked',
        geoLocation,
        rateLimiterStats: weatherRateLimiter.getStats(),
        testLocation: {
          address: testLocation.address,
          cityName: testLocation.cityName,
          coordinates: `${latitude}, ${longitude}`
        },
        error: `두 번째 API 호출이 제한됨: ${Math.round(waitTime / 1000)}초 후 다시 시도해주세요.`
      }, { status: 429 });
    }

    // 4. 시간별 날씨 API 테스트
    console.log('🌤️ 시간별 날씨 API 호출 중...');
    weatherRateLimiter.recordRequest();
    
    const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${locationKey}`;
    const forecastResponse = await fetch(
      `${forecastUrl}?apikey=${env.ACCUWEATHER_API_KEY}&metric=true&language=ko-kr`
    );
    
    if (!forecastResponse.ok) {
      return NextResponse.json({
        error: `시간별 날씨 API 실패: ${forecastResponse.status} ${forecastResponse.statusText}`,
        stage: 'hourly_forecast',
        httpStatus: forecastResponse.status,
        geoLocation,
        testLocation: {
          address: testLocation.address,
          cityName: testLocation.cityName,
          coordinates: `${latitude}, ${longitude}`
        },
        rateLimiterStats: weatherRateLimiter.getStats()
      }, { status: forecastResponse.status });
    }
    
    const forecastData = await forecastResponse.json();
    
    console.log(`✅ 시간별 날씨 조회 성공: ${forecastData.length}개 시간 데이터`);

    // 5. 내부 서비스 함수로도 테스트
    let internalServiceResult = null;
    let internalServiceError = null;
    
    try {
      console.log('🔧 내부 서비스 함수로 테스트 중...');
      internalServiceResult = await getHourlyWeather({
        latitude,
        longitude,
        units: 'metric'
      });
      console.log(`✅ 내부 서비스 함수 성공: ${internalServiceResult.length}개 데이터`);
    } catch (error) {
      console.error('❌ 내부 서비스 함수 실패:', error);
      internalServiceError = error instanceof Error ? error.message : '알 수 없는 오류';
    }

    return NextResponse.json({
      success: true,
      stage: 'completed',
      testLocation: {
        userId: testLocation.clerkUserId,
        address: testLocation.address,
        cityName: testLocation.cityName,
        coordinates: `${latitude}, ${longitude}`,
        source: testLocation.source,
        isDefault: testLocation.isDefault
      },
      geoLocation: {
        key: locationKey,
        name: geoLocation.LocalizedName,
        country: geoLocation.Country?.LocalizedName,
        region: geoLocation.AdministrativeArea?.LocalizedName
      },
      directApiTest: {
        success: true,
        forecast: {
          count: forecastData.length,
          firstHour: forecastData[0] ? {
            DateTime: forecastData[0].DateTime,
            Temperature: forecastData[0].Temperature,
            IconPhrase: forecastData[0].IconPhrase,
            PrecipitationProbability: forecastData[0].PrecipitationProbability
          } : null,
          sample: forecastData.slice(0, 3)
        }
      },
      internalServiceTest: {
        success: !internalServiceError,
        error: internalServiceError,
        data: internalServiceResult ? {
          count: internalServiceResult.length,
          firstHour: internalServiceResult[0] || null
        } : null
      },
      allLocationsInDb: allLocations.map(loc => ({
        address: loc.address,
        cityName: loc.cityName,
        coordinates: `${loc.latitude}, ${loc.longitude}`,
        source: loc.source
      })),
      rateLimiterStats: weatherRateLimiter.getStats(),
      apiCallsUsed: 2,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('데이터베이스 위치 날씨 테스트 실패:', error);
    
    return NextResponse.json({
      error: '데이터베이스 위치 날씨 테스트 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      rateLimiterStats: weatherRateLimiter.getStats()
    }, { status: 500 });
  }
}
