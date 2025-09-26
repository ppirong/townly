import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { weatherRateLimiter } from '@/lib/services/weather-rate-limiter';

/**
 * AccuWeather API 직접 테스트 API (인증 불필요)
 * GET /api/debug/accuweather-test?location=Seoul
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || 'Seoul';

    console.log('🧪 AccuWeather API 직접 테스트 시작:', location);

    if (!env.ACCUWEATHER_API_KEY) {
      return NextResponse.json({
        error: 'ACCUWEATHER_API_KEY가 설정되지 않았습니다.',
        configured: false
      }, { status: 500 });
    }

    // Rate Limiter 상태 확인
    const rateLimiterStats = weatherRateLimiter.getStats();
    
    if (!weatherRateLimiter.canMakeRequest()) {
      const waitTime = weatherRateLimiter.getWaitTime();
      return NextResponse.json({
        error: `API 호출 한도 초과: ${Math.round(waitTime / 1000)}초 후 다시 시도해주세요.`,
        rateLimiterStats,
        canMakeRequest: false
      }, { status: 429 });
    }

    // 1. 위치 검색 API 테스트
    console.log('🌍 위치 검색 API 호출 중...');
    weatherRateLimiter.recordRequest();
    
    const searchUrl = `https://dataservice.accuweather.com/locations/v1/cities/search`;
    const searchResponse = await fetch(
      `${searchUrl}?apikey=${env.ACCUWEATHER_API_KEY}&q=${encodeURIComponent(location)}&language=ko-kr`
    );
    
    if (!searchResponse.ok) {
      return NextResponse.json({
        error: `위치 검색 API 실패: ${searchResponse.status} ${searchResponse.statusText}`,
        stage: 'location_search',
        httpStatus: searchResponse.status,
        rateLimiterStats: weatherRateLimiter.getStats()
      }, { status: searchResponse.status });
    }
    
    const locations = await searchResponse.json();
    
    if (!locations || locations.length === 0) {
      return NextResponse.json({
        error: `위치를 찾을 수 없습니다: ${location}`,
        stage: 'location_search',
        locations,
        rateLimiterStats: weatherRateLimiter.getStats()
      }, { status: 404 });
    }
    
    const locationKey = locations[0].Key;
    const locationInfo = locations[0];
    console.log(`✅ 위치 검색 성공: ${locationInfo.LocalizedName} (Key: ${locationKey})`);

    // Rate Limiter 확인 (두 번째 요청)
    if (!weatherRateLimiter.canMakeRequest()) {
      const waitTime = weatherRateLimiter.getWaitTime();
      return NextResponse.json({
        success: false,
        stage: 'hourly_forecast_blocked',
        locationInfo,
        rateLimiterStats: weatherRateLimiter.getStats(),
        error: `두 번째 API 호출이 제한됨: ${Math.round(waitTime / 1000)}초 후 다시 시도해주세요.`
      }, { status: 429 });
    }

    // 2. 시간별 날씨 API 테스트
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
        locationInfo,
        rateLimiterStats: weatherRateLimiter.getStats()
      }, { status: forecastResponse.status });
    }
    
    const forecastData = await forecastResponse.json();
    
    console.log(`✅ 시간별 날씨 조회 성공: ${forecastData.length}개 시간 데이터`);

    return NextResponse.json({
      success: true,
      stage: 'completed',
      location: location,
      locationInfo: {
        key: locationKey,
        name: locationInfo.LocalizedName,
        country: locationInfo.Country?.LocalizedName,
        region: locationInfo.AdministrativeArea?.LocalizedName
      },
      forecast: {
        count: forecastData.length,
        firstHour: forecastData[0] ? {
          DateTime: forecastData[0].DateTime,
          Temperature: forecastData[0].Temperature,
          IconPhrase: forecastData[0].IconPhrase,
          PrecipitationProbability: forecastData[0].PrecipitationProbability
        } : null,
        sample: forecastData.slice(0, 3)
      },
      rateLimiterStats: weatherRateLimiter.getStats(),
      apiCallsUsed: 2,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AccuWeather API 테스트 실패:', error);
    
    return NextResponse.json({
      error: 'AccuWeather API 테스트 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      rateLimiterStats: weatherRateLimiter.getStats()
    }, { status: 500 });
  }
}
