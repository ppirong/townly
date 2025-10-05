/**
 * 사용자별 날씨 데이터 수집 스케줄러
 * 매일 6시, 12시, 18시, 24시에 모든 사용자의 날씨 데이터를 수집합니다.
 */

import { db } from '@/db';
import { userLocations, hourlyWeatherData, dailyWeatherData } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { env } from '@/lib/env';
import { apiTrackingService } from './api-tracking';

interface WeatherCollectionResult {
  success: boolean;
  userId: string;
  location: { latitude: string; longitude: string };
  hourlyDataCount: number;
  dailyDataCount: number;
  error?: string;
}

interface SchedulerResult {
  totalUsers: number;
  successCount: number;
  failureCount: number;
  results: WeatherCollectionResult[];
  executedAt: string;
  scheduleHour: number;
}

/**
 * 모든 사용자의 날씨 데이터 수집
 */
export async function collectAllUsersWeatherData(): Promise<SchedulerResult> {
  const startTime = Date.now();
  const now = new Date();
  const scheduleHour = now.getHours();
  
  console.log(`🌤️ [${now.toISOString()}] 사용자별 날씨 데이터 수집 시작 (${scheduleHour}시)`);
  
  try {
    // 1. user_locations 테이블에서 모든 사용자 조회
    const allUserLocations = await db
      .select()
      .from(userLocations);
    
    console.log(`📍 총 ${allUserLocations.length}명의 사용자 위치 정보 발견`);
    
    if (allUserLocations.length === 0) {
      console.log('⚠️ 등록된 사용자 위치 정보가 없습니다.');
      return {
        totalUsers: 0,
        successCount: 0,
        failureCount: 0,
        results: [],
        executedAt: now.toISOString(),
        scheduleHour,
      };
    }
    
    // 2. 각 사용자에 대해 날씨 데이터 수집 (병렬 처리)
    const results: WeatherCollectionResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    
    // 사용자별로 순차 처리 (API 레이트 리밋 고려)
    for (const userLocation of allUserLocations) {
      try {
        console.log(`\n👤 사용자 ${userLocation.clerkUserId} 날씨 수집 시작...`);
        
        const result = await collectWeatherForUser(
          userLocation.clerkUserId,
          parseFloat(userLocation.latitude),
          parseFloat(userLocation.longitude)
        );
        
        results.push(result);
        
        if (result.success) {
          successCount++;
          console.log(`✅ 사용자 ${userLocation.clerkUserId} 날씨 수집 성공`);
        } else {
          failureCount++;
          console.error(`❌ 사용자 ${userLocation.clerkUserId} 날씨 수집 실패: ${result.error}`);
        }
        
        // API 레이트 리밋 방지를 위한 짧은 대기 (각 사용자당 2초)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        console.error(`❌ 사용자 ${userLocation.clerkUserId} 처리 중 오류:`, error);
        
        results.push({
          success: false,
          userId: userLocation.clerkUserId,
          location: { 
            latitude: userLocation.latitude, 
            longitude: userLocation.longitude 
          },
          hourlyDataCount: 0,
          dailyDataCount: 0,
          error: errorMessage,
        });
      }
    }
    
    // 3. 이전 데이터 정리 (수집 완료 후)
    await cleanupOldWeatherData(now);
    
    const executionTime = Date.now() - startTime;
    console.log(`\n✅ 날씨 수집 완료 - 성공: ${successCount}, 실패: ${failureCount}, 실행 시간: ${executionTime}ms`);
    
    return {
      totalUsers: allUserLocations.length,
      successCount,
      failureCount,
      results,
      executedAt: now.toISOString(),
      scheduleHour,
    };
    
  } catch (error) {
    console.error('❌ 날씨 수집 스케줄러 실행 실패:', error);
    throw error;
  }
}

/**
 * 특정 사용자의 날씨 데이터 수집
 */
async function collectWeatherForUser(
  clerkUserId: string,
  latitude: number,
  longitude: number
): Promise<WeatherCollectionResult> {
  try {
    // 1. AccuWeather 위치 키 조회
    const locationKey = await getLocationKeyByCoordinates(latitude, longitude);
    
    // 2. 12시간 시간별 날씨 데이터 조회
    const hourlyData = await fetchHourlyWeather(locationKey, latitude, longitude);
    
    // 3. 5일 일별 날씨 데이터 조회
    const dailyData = await fetchDailyWeather(locationKey, latitude, longitude);
    
    // 4. 데이터베이스에 저장 (기존 데이터는 자동으로 업데이트됨)
    await saveHourlyWeatherToDatabase(clerkUserId, locationKey, latitude, longitude, hourlyData);
    await saveDailyWeatherToDatabase(clerkUserId, locationKey, latitude, longitude, dailyData);
    
    return {
      success: true,
      userId: clerkUserId,
      location: { latitude: latitude.toString(), longitude: longitude.toString() },
      hourlyDataCount: hourlyData.length,
      dailyDataCount: dailyData.length,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return {
      success: false,
      userId: clerkUserId,
      location: { latitude: latitude.toString(), longitude: longitude.toString() },
      hourlyDataCount: 0,
      dailyDataCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * AccuWeather 위치 키 조회
 */
async function getLocationKeyByCoordinates(latitude: number, longitude: number): Promise<string> {
  const geopositionUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search`;
  const requestStartTime = Date.now();
  
  const response = await fetch(
    `${geopositionUrl}?apikey=${env.ACCUWEATHER_API_KEY}&q=${latitude},${longitude}&language=ko-kr`
  );
  
  const responseTime = Date.now() - requestStartTime;
  
  // API 호출 기록
  await apiTrackingService.recordApiCall({
    provider: 'accuweather',
    endpoint: '/locations/v1/cities/geoposition/search',
    method: 'GET',
    httpStatus: response.status,
    responseTime,
    isSuccessful: response.ok,
    requestParams: {
      q: `${latitude},${longitude}`,
      language: 'ko-kr',
    },
    errorMessage: response.ok ? undefined : `${response.status} ${response.statusText}`,
  });
  
  if (!response.ok) {
    throw new Error(`위치 키 조회 실패: ${response.status} ${response.statusText}`);
  }
  
  const location = await response.json();
  return location.Key;
}

/**
 * 12시간 시간별 날씨 조회
 */
async function fetchHourlyWeather(locationKey: string, latitude: number, longitude: number): Promise<any[]> {
  const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${locationKey}`;
  const requestStartTime = Date.now();
  
  const response = await fetch(
    `${forecastUrl}?apikey=${env.ACCUWEATHER_API_KEY}&metric=true&details=true`
  );
  
  const responseTime = Date.now() - requestStartTime;
  
  // API 호출 기록
  await apiTrackingService.recordApiCall({
    provider: 'accuweather',
    endpoint: '/forecasts/v1/hourly/12hour',
    method: 'GET',
    httpStatus: response.status,
    responseTime,
    isSuccessful: response.ok,
    requestParams: {
      locationKey,
      metric: true,
      details: true,
    },
    errorMessage: response.ok ? undefined : `${response.status} ${response.statusText}`,
  });
  
  if (!response.ok) {
    throw new Error(`시간별 날씨 조회 실패: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * 5일 일별 날씨 조회
 */
async function fetchDailyWeather(locationKey: string, latitude: number, longitude: number): Promise<any> {
  const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationKey}`;
  const requestStartTime = Date.now();
  
  const response = await fetch(
    `${forecastUrl}?apikey=${env.ACCUWEATHER_API_KEY}&language=ko-kr&details=true&metric=true`
  );
  
  const responseTime = Date.now() - requestStartTime;
  
  // API 호출 기록
  await apiTrackingService.recordApiCall({
    provider: 'accuweather',
    endpoint: '/forecasts/v1/daily/5day',
    method: 'GET',
    httpStatus: response.status,
    responseTime,
    isSuccessful: response.ok,
    requestParams: {
      locationKey,
      language: 'ko-kr',
      details: true,
      metric: true,
    },
    errorMessage: response.ok ? undefined : `${response.status} ${response.statusText}`,
  });
  
  if (!response.ok) {
    throw new Error(`일별 날씨 조회 실패: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * 시간별 날씨 데이터를 데이터베이스에 저장
 */
async function saveHourlyWeatherToDatabase(
  clerkUserId: string,
  locationKey: string,
  latitude: number,
  longitude: number,
  apiData: any[]
): Promise<void> {
  const now = new Date();
  
  // 스마트 TTL: 다음 배치 시간까지 유효
  const { getNextBatchTime } = await import('./smart-ttl-manager');
  const expiresAt = getNextBatchTime(now);
  
  // AccuWeather DateTime을 KST로 변환하는 유틸 함수 import
  const { convertAccuWeatherDateTimeToKST } = await import('@/lib/utils/datetime');
  
  const dbRecords = apiData.map(forecast => {
    // AccuWeather DateTime을 올바르게 KST로 변환
    const { kstDateTime, forecastDate, forecastHour } = convertAccuWeatherDateTimeToKST(forecast.DateTime);
    
    // 강수량 처리
    let precipitation = 0;
    if (forecast.Rain?.Value !== undefined && forecast.Rain.Value !== null) {
      precipitation = forecast.Rain.Value;
    } else if (forecast.Snow?.Value !== undefined && forecast.Snow.Value !== null) {
      precipitation = forecast.Snow.Value;
    } else if (forecast.Ice?.Value !== undefined && forecast.Ice.Value !== null) {
      precipitation = forecast.Ice.Value;
    } else if (forecast.TotalLiquid?.Value !== undefined && forecast.TotalLiquid.Value !== null) {
      precipitation = forecast.TotalLiquid.Value;
    }
    
    return {
      clerkUserId,
      locationKey,
      locationName: `${latitude},${longitude}`,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      forecastDate,
      forecastHour,
      forecastDateTime: kstDateTime, // KST로 변환된 시간 사용
      temperature: Math.round(forecast.Temperature.Value),
      conditions: forecast.IconPhrase || '알 수 없음',
      weatherIcon: forecast.WeatherIcon || null,
      humidity: forecast.RelativeHumidity || null,
      precipitation: precipitation.toString(),
      precipitationProbability: forecast.PrecipitationProbability || null,
      rainProbability: forecast.RainProbability || null,
      windSpeed: forecast.Wind?.Speed?.Value ? Math.round(forecast.Wind.Speed.Value) : null,
      units: 'metric',
      rawData: forecast,
      cacheKey: `scheduled-${clerkUserId}-${locationKey}-hourly`,
      expiresAt,
    };
  });
  
  // 해당 사용자의 기존 시간별 데이터 삭제
  await db.delete(hourlyWeatherData)
    .where(eq(hourlyWeatherData.clerkUserId, clerkUserId));
  
  // 새 데이터 삽입
  if (dbRecords.length > 0) {
    await db.insert(hourlyWeatherData).values(dbRecords);
  }
  
  console.log(`  ✓ 시간별 날씨 ${dbRecords.length}개 저장 완료`);
}

/**
 * 일별 날씨 데이터를 데이터베이스에 저장
 */
async function saveDailyWeatherToDatabase(
  clerkUserId: string,
  locationKey: string,
  latitude: number,
  longitude: number,
  apiData: any
): Promise<void> {
  const now = new Date();
  
  // 스마트 TTL: 다음 배치 시간까지 유효
  const { getNextBatchTime } = await import('./smart-ttl-manager');
  const expiresAt = getNextBatchTime(now);
  
  const dailyForecasts = apiData.DailyForecasts || [];
  
  const dbRecords = dailyForecasts.map((forecast: any) => {
    // AccuWeather Date를 KST로 변환
    const utcDate = new Date(forecast.Date);
    const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const forecastDateString = kstDate.toISOString().split('T')[0];
    
    // 요일 계산 (한국어, KST 기준)
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[kstDate.getUTCDay()]; // KST Date 객체에서 UTC day 사용
    
    return {
      clerkUserId,
      locationKey,
      locationName: `${latitude},${longitude}`,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      forecastDate: forecastDateString,
      dayOfWeek,
      temperature: Math.round((forecast.Temperature.Maximum.Value + forecast.Temperature.Minimum.Value) / 2),
      highTemp: Math.round(forecast.Temperature.Maximum.Value),
      lowTemp: Math.round(forecast.Temperature.Minimum.Value),
      conditions: forecast.Day?.IconPhrase || '알 수 없음',
      weatherIcon: forecast.Day?.Icon || null,
      precipitationProbability: forecast.Day?.PrecipitationProbability || null,
      rainProbability: forecast.Day?.RainProbability || null,
      dayWeather: forecast.Day ? {
        icon: forecast.Day.Icon,
        conditions: forecast.Day.IconPhrase || '알 수 없음',
        precipitationProbability: forecast.Day.PrecipitationProbability || 0,
      } : null,
      nightWeather: forecast.Night ? {
        icon: forecast.Night.Icon,
        conditions: forecast.Night.IconPhrase || '알 수 없음',
        precipitationProbability: forecast.Night.PrecipitationProbability || 0,
      } : null,
      headline: apiData.Headline ? {
        text: apiData.Headline.Text || '',
        category: apiData.Headline.Category || '',
        severity: apiData.Headline.Severity || 0,
      } : null,
      units: 'metric',
      forecastDays: 5,
      rawData: forecast,
      cacheKey: `scheduled-${clerkUserId}-${locationKey}-daily`,
      expiresAt,
    };
  });
  
  // 해당 사용자의 기존 일별 데이터 삭제
  await db.delete(dailyWeatherData)
    .where(eq(dailyWeatherData.clerkUserId, clerkUserId));
  
  // 새 데이터 삽입
  if (dbRecords.length > 0) {
    await db.insert(dailyWeatherData).values(dbRecords);
  }
  
  console.log(`  ✓ 일별 날씨 ${dbRecords.length}개 저장 완료`);
}

/**
 * 이전 시각/날짜의 날씨 데이터 정리
 * API 호출 시간 기준으로 과거 데이터 삭제
 */
async function cleanupOldWeatherData(currentTime: Date): Promise<void> {
  try {
    console.log('\n🧹 이전 날씨 데이터 정리 시작...');
    
    // 1. 현재 시각보다 이전 시각의 시간별 데이터 삭제
    const deletedHourly = await db
      .delete(hourlyWeatherData)
      .where(lt(hourlyWeatherData.forecastDateTime, currentTime));
    
    // 2. 오늘보다 이전 날짜의 일별 데이터 삭제
    const today = currentTime.toISOString().split('T')[0];
    const deletedDaily = await db
      .delete(dailyWeatherData)
      .where(lt(dailyWeatherData.forecastDate, today));
    
    console.log(`✅ 데이터 정리 완료 - 시간별: ${deletedHourly.rowCount || 0}개, 일별: ${deletedDaily.rowCount || 0}개 삭제`);
    
  } catch (error) {
    console.error('❌ 데이터 정리 실패:', error);
    // 정리 실패해도 메인 로직은 계속 진행
  }
}

/**
 * 특정 시간에 스케줄러를 실행해야 하는지 확인
 * 6시, 12시, 18시, 24시(0시)만 실행
 */
export function shouldRunScheduler(hour: number): boolean {
  return [0, 6, 12, 18].includes(hour);
}

