/**
 * MCP Weather Server 연동을 위한 날씨 서비스
 * AccuWeather API를 사용하여 날씨 정보를 제공합니다.
 */

import { env } from '@/lib/env';
import { weatherCache } from './weather-cache';
import { weatherRateLimiter } from './weather-rate-limiter';
import { apiTrackingService } from './api-tracking';
import { weatherDbService } from './weather-db';
import { utcToKst, getKoreanDayOfWeek } from '@/lib/utils/timezone';
import { convertAccuWeatherDateTimeToKST, formatKSTTime } from '@/lib/utils/datetime';

export interface WeatherLocation {
  location?: string | null;
  latitude?: number;
  longitude?: number;
  units?: 'metric' | 'imperial';
  clerkUserId?: string; // 사용자별 날씨 데이터 저장용
}

export interface HourlyWeatherRequest extends WeatherLocation {
  hours?: number; // 예보할 시간 수 (기본값: 24시간)
}

export interface DailyWeatherRequest extends WeatherLocation {
  days?: 1 | 5 | 10 | 15;
}

export interface WeatherData {
  location: string;
  timestamp: string;
  temperature: number;
  conditions: string;
  weatherIcon?: number | null; // AccuWeather 아이콘 번호
  humidity?: number;
  precipitation?: number; // 실제 강수량 (mm)
  precipitationProbability?: number; // 강수 확률 (%)
  rainProbability?: number; // 비 올 확률 (%)
  windSpeed?: number;
  units: 'metric' | 'imperial';
}

export interface HourlyWeatherData extends WeatherData {
  hour: string;
}

export interface DailyWeatherData extends WeatherData {
  date: string;
  dayOfWeek: string;
  highTemp: number;
  lowTemp: number;
  dayWeather?: {
    icon: number;
    conditions: string;
    precipitationProbability: number;
  };
  nightWeather?: {
    icon: number;
    conditions: string;
    precipitationProbability: number;
  };
}

export interface DailyWeatherResponse {
  headline?: {
    text: string;
    category: string;
    severity: number;
  };
  dailyForecasts: DailyWeatherData[];
}

/**
 * MCP Weather Server를 통한 시간별 날씨 예보 조회
 */
export async function getHourlyWeather(params: HourlyWeatherRequest): Promise<HourlyWeatherData[]> {
  if (!env.ACCUWEATHER_API_KEY) {
    throw new Error('ACCUWEATHER_API_KEY가 설정되지 않았습니다.');
  }

  try {
    console.log('🌤️ 시간별 날씨 조회 시작');
    
    // 1. 위치 키 조회 (캐싱 적용)
    let locationKey: string;
    let locationName: string;
    
    if (params.latitude !== undefined && params.longitude !== undefined) {
      locationKey = await getLocationKeyByCoordinatesWithCache(params.latitude, params.longitude);
      locationName = `${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`;
    } else if (params.location && params.location.trim() !== '') {
      locationKey = await getLocationKeyWithCache(params.location);
      locationName = params.location;
    } else {
      throw new Error('위치 정보(location 또는 latitude/longitude)가 필요합니다.');
    }
    
    // 2. 캐시에서 시간별 날씨 데이터 확인 (메모리 -> DB 순서)
    const units = params.units || 'metric';
    const cacheKey = weatherCache.getHourlyWeatherCacheKey(locationKey, units);
    
    // 2.1. 메모리 캐시 확인
    const cachedData = weatherCache.get<HourlyWeatherData[]>(cacheKey);
    if (cachedData) {
      console.log('🎯 시간별 날씨 메모리 캐시 적중');
      return cachedData;
    }
    
    // 2.2. 데이터베이스 캐시 확인
    const dbCachedData = await weatherDbService.getHourlyWeatherData(cacheKey);
    if (dbCachedData) {
      console.log('🎯 시간별 날씨 DB 캐시 적중');
      
      // 사용자별 데이터인 경우 임베딩이 없으면 생성
      if (params.clerkUserId) {
        try {
          await weatherDbService.generateEmbeddingsForExistingHourlyData(
            dbCachedData,
            locationName,
            params.clerkUserId
          );
        } catch (embeddingError) {
          console.error('⚠️ 캐시된 시간별 날씨 데이터 임베딩 생성 실패:', embeddingError);
        }
      }
      
      // DB에서 가져온 데이터를 메모리 캐시에도 저장
      weatherCache.set(cacheKey, dbCachedData, 10);
      return dbCachedData;
    }
    
    // 3. 레이트 리미터 확인
    if (!weatherRateLimiter.canMakeRequest()) {
      const waitTime = weatherRateLimiter.getWaitTime();
      throw new Error(`API 호출 한도 초과: ${Math.round(waitTime / 1000)}초 후 다시 시도해주세요.`);
    }

    // 4. API 호출 및 응답 처리
    console.log('🌐 AccuWeather API 호출 - 시간별 날씨');
    weatherRateLimiter.recordRequest();
    
    const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${locationKey}`;
    const requestStartTime = Date.now();
    const response = await fetch(`${forecastUrl}?apikey=${env.ACCUWEATHER_API_KEY}&metric=${units === 'metric'}&details=true`);
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
        metric: units === 'metric',
        details: true,
      },
      errorMessage: response.ok ? undefined : `${response.status} ${response.statusText}`,
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`API 호출 한도 초과: 잠시 후 다시 시도해주세요. (${response.status})`);
      }
      throw new Error(`AccuWeather API 오류: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 현재 시간 정보 로깅
    const now = new Date();
    console.log(`🕐 현재 시간 정보:`);
    console.log(`  - 서버 시간: ${now.toISOString()}`);
    console.log(`  - KST 시간: ${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    console.log(`  - AccuWeather 응답 개수: ${data.length}`);
    
    // 3. AccuWeather 응답을 내부 형식으로 변환 (통일된 시간 처리)
    const hourlyData: HourlyWeatherData[] = data.map((forecast: any, index: number) => {
      // AccuWeather DateTime을 KST로 변환 (단일 변환 지점)
      const { kstDateTime } = convertAccuWeatherDateTimeToKST(forecast.DateTime);
      const { hour } = formatKSTTime(kstDateTime);
      
      // 강수량 처리 로직 수정
      let precipitation = 0;
      
      // AccuWeather API에서 오는 강수량 데이터 디버깅 (첫 3개만)
      if (index < 3) {
        console.log(`🕐 시간별 예보 ${index}: ${forecast.DateTime} -> ${kstDateTime.toISOString()}`);
        console.log(`💧 전체 예보 데이터 ${index}:`, JSON.stringify(forecast, null, 2));
      }
      
      // 강수량 처리: Rain, Snow, Ice, TotalLiquid 순서로 확인
      if (forecast.Rain?.Value !== undefined && forecast.Rain.Value !== null) {
        precipitation = forecast.Rain.Value;
      } else if (forecast.Snow?.Value !== undefined && forecast.Snow.Value !== null) {
        precipitation = forecast.Snow.Value;
      } else if (forecast.Ice?.Value !== undefined && forecast.Ice.Value !== null) {
        precipitation = forecast.Ice.Value;
      } else if (forecast.TotalLiquid?.Value !== undefined && forecast.TotalLiquid.Value !== null) {
        precipitation = forecast.TotalLiquid.Value;
      }
      
      // 디버깅: 최종 강수량 값 로깅 (첫 3개만)
      if (index < 3) {
        console.log(`💧 최종 강수량 ${index}: ${precipitation}mm`);
      }
      
      return {
        location: locationName,
        timestamp: kstDateTime.toISOString(), // KST 시간 저장
        hour,
        temperature: Math.round(forecast.Temperature.Value),
        conditions: forecast.IconPhrase || '알 수 없음',
        weatherIcon: forecast.WeatherIcon || null,
        humidity: forecast.RelativeHumidity || 0,
        precipitation: precipitation,
        precipitationProbability: forecast.PrecipitationProbability || 0,
        rainProbability: forecast.RainProbability || 0,
        windSpeed: forecast.Wind?.Speed?.Value ? Math.round(forecast.Wind.Speed.Value) : 0,
        units: params.units || 'metric'
      };
    });

    // 5. 캐시에 저장 (메모리 + DB)
    weatherCache.set(cacheKey, hourlyData, 10);
    console.log('💾 시간별 날씨 메모리 캐시 저장');
    
    // 사용자 ID가 없으면 저장하지 않음
    if (params.clerkUserId && params.latitude !== undefined && params.longitude !== undefined) {
      // DB에도 저장 (더 긴 TTL)
      await weatherDbService.saveHourlyWeatherData(
        locationKey, 
        locationName, 
        hourlyData, 
        cacheKey, 
        60, // 1시간
        params.latitude, 
        params.longitude,
        params.clerkUserId
      );
    } else {
      console.log('⚠️ 사용자 ID 또는 좌표 정보가 없어 DB 저장을 건너뜁니다.');
    }

    return hourlyData;
  } catch (error) {
    console.error('시간별 날씨 조회 실패:', error);
    throw new Error('날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * MCP Weather Server를 통한 일별 날씨 예보 조회
 */
export async function getDailyWeather(params: DailyWeatherRequest): Promise<DailyWeatherResponse> {
  if (!env.ACCUWEATHER_API_KEY) {
    throw new Error('ACCUWEATHER_API_KEY가 설정되지 않았습니다.');
  }

  try {
    const days = params.days || 5;
    console.log(`🌤️ ${days}일 날씨 조회 시작`);
    
    // 1. 위치 키 조회 (캐싱 적용)
    let locationKey: string;
    let locationName: string;
    
    if (params.latitude !== undefined && params.longitude !== undefined) {
      locationKey = await getLocationKeyByCoordinatesWithCache(params.latitude, params.longitude);
      locationName = `${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`;
    } else if (params.location && params.location.trim() !== '') {
      locationKey = await getLocationKeyWithCache(params.location);
      locationName = params.location;
    } else {
      throw new Error('위치 정보(location 또는 latitude/longitude)가 필요합니다.');
    }
    
    // 2. 캐시에서 일별 날씨 데이터 확인 (메모리 -> DB 순서)
    const units = params.units || 'metric';
    const cacheKey = weatherCache.getDailyWeatherCacheKey(locationKey, days, units);
    
    // 2.1. 메모리 캐시 확인
    const cachedData = weatherCache.get<DailyWeatherResponse>(cacheKey);
    if (cachedData) {
      console.log('🎯 일별 날씨 메모리 캐시 적중');
      return cachedData;
    }
    
    // 2.2. 데이터베이스 캐시 확인
    const dbCachedData = await weatherDbService.getDailyWeatherData(cacheKey);
    if (dbCachedData) {
      console.log('🎯 일별 날씨 DB 캐시 적중');
      
      // 사용자별 데이터인 경우 임베딩이 없으면 생성
      if (params.clerkUserId) {
        try {
          await weatherDbService.generateEmbeddingsForExistingDailyData(
            dbCachedData,
            locationName,
            params.clerkUserId
          );
        } catch (embeddingError) {
          console.error('⚠️ 캐시된 일별 날씨 데이터 임베딩 생성 실패:', embeddingError);
        }
      }
      
      // DB에서 가져온 데이터를 메모리 캐시에도 저장
      weatherCache.set(cacheKey, dbCachedData, 30);
      return dbCachedData;
    }
    
    // 3. 레이트 리미터 확인
    if (!weatherRateLimiter.canMakeRequest()) {
      const waitTime = weatherRateLimiter.getWaitTime();
      throw new Error(`API 호출 한도 초과: ${Math.round(waitTime / 1000)}초 후 다시 시도해주세요.`);
    }
    
    // 4. API 호출 및 응답 처리
    console.log('🌐 AccuWeather API 호출 - 일별 날씨');
    weatherRateLimiter.recordRequest();
    
    const forecastType = days === 1 ? '1day' : days === 5 ? '5day' : days === 10 ? '10day' : '15day';
    const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/${forecastType}/${locationKey}`;
    
    // AccuWeather API 문서에 따른 권장 파라미터 설정
    const apiParams = new URLSearchParams({
      apikey: env.ACCUWEATHER_API_KEY,
      language: 'ko-kr', // 한국어 응답
      details: 'true',   // 상세 정보 포함
      metric: (units === 'metric').toString() // 미터법 여부
    });
    
    const requestStartTime = Date.now();
    const response = await fetch(`${forecastUrl}?${apiParams.toString()}`);
    const responseTime = Date.now() - requestStartTime;
    
    // API 호출 기록
    await apiTrackingService.recordApiCall({
      provider: 'accuweather',
      endpoint: `/forecasts/v1/daily/${forecastType}`,
      method: 'GET',
      httpStatus: response.status,
      responseTime,
      isSuccessful: response.ok,
      requestParams: {
        locationKey,
        days,
        language: 'ko-kr',
        details: true,
        metric: units === 'metric',
      },
      errorMessage: response.ok ? undefined : `${response.status} ${response.statusText}`,
    });
    
    if (!response.ok) {
      if (response.status === 403) {
        // 15일/10일 예보가 제한된 경우 5일 예보로 대체 시도
        if (days > 5) {
          console.warn(`${days}일 예보가 제한되어 5일 예보로 대체합니다.`);
          return await getDailyWeather({
            ...params,
            days: 5
          });
        }
        throw new Error(`AccuWeather API 권한 제한: ${days}일 예보는 현재 API 플랜에서 지원되지 않습니다. 5일 예보만 가능할 수 있습니다. (${response.status})`);
      } else if (response.status === 401) {
        throw new Error(`AccuWeather API 키 인증 실패: API 키를 확인해주세요. (${response.status})`);
      } else if (response.status === 400) {
        throw new Error(`잘못된 요청: 위치 정보나 매개변수를 확인해주세요. (${response.status})`);
      } else if (response.status === 429) {
        throw new Error(`API 호출 한도 초과: 잠시 후 다시 시도해주세요. (${response.status})`);
      } else if (response.status >= 500) {
        throw new Error(`AccuWeather 서버 오류: 잠시 후 다시 시도해주세요. (${response.status})`);
      } else {
        throw new Error(`AccuWeather API 오류: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    
    // 3. AccuWeather 응답을 내부 형식으로 변환
    const dailyData: DailyWeatherData[] = data.DailyForecasts.slice(0, days).map((forecast: any) => {
      // AccuWeather Date는 UTC 기준이므로 한국 시간으로 변환
      const kstDate = utcToKst(forecast.Date);
      const dayOfWeek = getKoreanDayOfWeek(forecast.Date, true);
      
      return {
        location: locationName,
        timestamp: forecast.Date, // 원본 UTC 시간 유지
        date: `${kstDate.getMonth() + 1}월 ${kstDate.getDate()}일`,
        dayOfWeek: dayOfWeek,
        temperature: Math.round((forecast.Temperature.Maximum.Value + forecast.Temperature.Minimum.Value) / 2),
        highTemp: Math.round(forecast.Temperature.Maximum.Value),
        lowTemp: Math.round(forecast.Temperature.Minimum.Value),
        conditions: forecast.Day?.IconPhrase || '알 수 없음',
        weatherIcon: forecast.Day?.Icon || null,
        humidity: 0, // AccuWeather 일별 예보에는 습도 정보가 제한적
        precipitation: 0, // 일별 예보에는 실제 강수량 정보가 제한적
        precipitationProbability: forecast.Day?.PrecipitationProbability || 0, // 강수 확률
        rainProbability: forecast.Day?.RainProbability || 0, // 비 올 확률
        windSpeed: 0, // 일별 예보에는 바람 속도 정보가 제한적
        units: params.units || 'metric',
        // Day/Night 세부 정보
        dayWeather: forecast.Day ? {
          icon: forecast.Day.Icon,
          conditions: forecast.Day.IconPhrase || forecast.Day.ShortPhrase || '알 수 없음',
          precipitationProbability: Math.max(
            forecast.Day.PrecipitationProbability || 0,
            forecast.Day.RainProbability || 0,
            forecast.Day.ThunderstormProbability || 0,
            forecast.Day.SnowProbability || 0,
            forecast.Day.IceProbability || 0
          )
        } : undefined,
        nightWeather: forecast.Night ? {
          icon: forecast.Night.Icon,
          conditions: forecast.Night.IconPhrase || forecast.Night.ShortPhrase || '알 수 없음',
          precipitationProbability: Math.max(
            forecast.Night.PrecipitationProbability || 0,
            forecast.Night.RainProbability || 0,
            forecast.Night.ThunderstormProbability || 0,
            forecast.Night.SnowProbability || 0,
            forecast.Night.IceProbability || 0
          )
        } : undefined
      };
    });

    // 헤드라인 정보 추출
    const headline = data.Headline ? {
      text: data.Headline.Text || '',
      category: data.Headline.Category || '',
      severity: data.Headline.Severity || 0
    } : undefined;

    const result: DailyWeatherResponse = {
      headline,
      dailyForecasts: dailyData
    };

    // 5. 캐시에 저장 (메모리 + DB)
    weatherCache.set(cacheKey, result, 30);
    console.log('💾 일별 날씨 메모리 캐시 저장');
    
    // 사용자 ID가 없으면 저장하지 않음
    if (params.clerkUserId && params.latitude !== undefined && params.longitude !== undefined) {
      // DB에도 저장 (더 긴 TTL)
      await weatherDbService.saveDailyWeatherData(
        locationKey, 
        locationName, 
        result, 
        days, 
        units, 
        cacheKey, 
        120, // 2시간
        params.latitude, 
        params.longitude,
        params.clerkUserId
      );
    } else {
      console.log('⚠️ 사용자 ID 또는 좌표 정보가 없어 DB 저장을 건너뜁니다.');
    }

    return result;
  } catch (error) {
    console.error('일별 날씨 조회 실패:', error);
    throw new Error('날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 위치명으로 AccuWeather 위치 키 조회
 */
async function getLocationKey(location: string): Promise<string> {
  if (!env.ACCUWEATHER_API_KEY) {
    throw new Error('ACCUWEATHER_API_KEY가 설정되지 않았습니다.');
  }

  try {
    const searchUrl = `https://dataservice.accuweather.com/locations/v1/cities/search`;
    const requestStartTime = Date.now();
    const response = await fetch(`${searchUrl}?apikey=${env.ACCUWEATHER_API_KEY}&q=${encodeURIComponent(location)}&language=ko-kr`);
    const responseTime = Date.now() - requestStartTime;
    
    // API 호출 기록
    await apiTrackingService.recordApiCall({
      provider: 'accuweather',
      endpoint: '/locations/v1/cities/search',
      method: 'GET',
      httpStatus: response.status,
      responseTime,
      isSuccessful: response.ok,
      requestParams: {
        q: location,
        language: 'ko-kr',
      },
      errorMessage: response.ok ? undefined : `${response.status} ${response.statusText}`,
    });
    
    if (!response.ok) {
      throw new Error(`위치 검색 API 오류: ${response.status} ${response.statusText}`);
    }
    
    const locations = await response.json();
    
    if (!locations || locations.length === 0) {
      throw new Error(`위치를 찾을 수 없습니다: ${location}`);
    }
    
    // 첫 번째 검색 결과의 키 반환
    return locations[0].Key;
  } catch (error) {
    console.error('위치 키 조회 실패:', error);
    throw new Error(`위치 검색에 실패했습니다: ${location}`);
  }
}

/**
 * 위도/경도로 AccuWeather 위치 키 조회
 */
export async function getLocationKeyByCoordinates(latitude: number, longitude: number): Promise<string> {
  if (!env.ACCUWEATHER_API_KEY) {
    throw new Error('ACCUWEATHER_API_KEY가 설정되지 않았습니다.');
  }

  try {
    const geopositionUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search`;
    const requestStartTime = Date.now();
    const response = await fetch(`${geopositionUrl}?apikey=${env.ACCUWEATHER_API_KEY}&q=${latitude},${longitude}&language=ko-kr`);
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
      throw new Error(`좌표 검색 API 오류: ${response.status} ${response.statusText}`);
    }
    
    const location = await response.json();
    
    if (!location || !location.Key) {
      throw new Error(`좌표에 해당하는 위치를 찾을 수 없습니다: ${latitude}, ${longitude}`);
    }
    
    return location.Key;
  } catch (error) {
    console.error('좌표로 위치 키 조회 실패:', error);
    throw new Error(`좌표 검색에 실패했습니다: ${latitude}, ${longitude}`);
  }
}

/**
 * MCP Weather Server 상태 확인
 */
export async function checkWeatherServiceHealth(): Promise<boolean> {
  try {
    if (!env.ACCUWEATHER_API_KEY) {
      return false;
    }

    // AccuWeather API 키 유효성을 간단한 요청으로 확인
    const response = await fetch(`https://dataservice.accuweather.com/locations/v1/cities/search?apikey=${env.ACCUWEATHER_API_KEY}&q=Seoul`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 캐시가 적용된 위치 키 조회 (위치명)
 */
async function getLocationKeyWithCache(location: string): Promise<string> {
  const cacheKey = weatherCache.getLocationKeyCacheKey(location);
  
  // 메모리 캐시 확인
  const cachedKey = weatherCache.get<string>(cacheKey);
  if (cachedKey) {
    console.log('🎯 위치 키 메모리 캐시 적중:', location);
    return cachedKey;
  }
  
  // DB 캐시 확인
  const dbCachedKey = await weatherDbService.getLocationKey(cacheKey);
  if (dbCachedKey) {
    console.log('🎯 위치 키 DB 캐시 적중:', location);
    // DB에서 가져온 데이터를 메모리 캐시에도 저장
    weatherCache.set(cacheKey, dbCachedKey, 60 * 24);
    return dbCachedKey;
  }
  
  console.log('🌐 AccuWeather API 호출 - 위치 키 조회:', location);
  
  // 레이트 리미터 확인
  if (!weatherRateLimiter.canMakeRequest()) {
    const waitTime = weatherRateLimiter.getWaitTime();
    throw new Error(`API 호출 한도 초과: ${Math.round(waitTime / 1000)}초 후 다시 시도해주세요.`);
  }
  
  weatherRateLimiter.recordRequest();
  const locationKey = await getLocationKey(location);
  
  // 메모리 캐시에 저장 (24시간)
  weatherCache.set(cacheKey, locationKey, 60 * 24);
  
  // DB에도 저장 (더 긴 TTL)
  await weatherDbService.saveLocationKey(
    locationKey, 
    cacheKey, 
    'name', 
    60 * 24 * 7, // 7일
    location, 
    undefined, 
    undefined
  );
  
  return locationKey;
}

/**
 * 캐시가 적용된 위치 키 조회 (좌표)
 */
async function getLocationKeyByCoordinatesWithCache(latitude: number, longitude: number): Promise<string> {
  const cacheKey = weatherCache.getLocationKeyCacheKey(undefined, latitude, longitude);
  
  // 메모리 캐시 확인
  const cachedKey = weatherCache.get<string>(cacheKey);
  if (cachedKey) {
    console.log('🎯 좌표 위치 키 메모리 캐시 적중:', `${latitude}, ${longitude}`);
    return cachedKey;
  }
  
  // DB 캐시 확인
  const dbCachedKey = await weatherDbService.getLocationKey(cacheKey);
  if (dbCachedKey) {
    console.log('🎯 좌표 위치 키 DB 캐시 적중:', `${latitude}, ${longitude}`);
    // DB에서 가져온 데이터를 메모리 캐시에도 저장
    weatherCache.set(cacheKey, dbCachedKey, 60 * 24);
    return dbCachedKey;
  }
  
  console.log('🌐 AccuWeather API 호출 - 좌표 위치 키 조회:', `${latitude}, ${longitude}`);
  
  // 레이트 리미터 확인
  if (!weatherRateLimiter.canMakeRequest()) {
    const waitTime = weatherRateLimiter.getWaitTime();
    throw new Error(`API 호출 한도 초과: ${Math.round(waitTime / 1000)}초 후 다시 시도해주세요.`);
  }
  
  weatherRateLimiter.recordRequest();
  const locationKey = await getLocationKeyByCoordinates(latitude, longitude);
  
  // 메모리 캐시에 저장 (24시간)
  weatherCache.set(cacheKey, locationKey, 60 * 24);
  
  // DB에도 저장 (더 긴 TTL)
  await weatherDbService.saveLocationKey(
    locationKey, 
    cacheKey, 
    'coordinates', 
    60 * 24 * 7, // 7일
    undefined, 
    latitude, 
    longitude
  );
  
  return locationKey;
}
