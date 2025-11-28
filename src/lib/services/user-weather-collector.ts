import { db } from '@/db';
import { hourlyWeatherData, dailyWeatherData, userLocations } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { weatherDataCollectorService } from './weather-data-collector';

// 사용자 날씨 데이터 타입 정의
export interface UserHourlyWeatherData {
  dateTime: Date;
  temperature: number;
  conditions: string;
  precipitationProbability: number;
  rainProbability: number;
  windSpeed: number;
  humidity: number;
  weatherIcon?: number | null;
  source: 'user_database' | 'real_time_api';
}

export interface UserDailyWeatherData {
  date: string;
  dayOfWeek: string;
  highTemp: number;
  lowTemp: number;
  conditions: string;
  precipitationProbability: number;
  rainProbability: number;
  weatherIcon?: number | null;
  source: 'user_database' | 'real_time_api';
}

/**
 * 사용자별 시간별 날씨 데이터 조회
 */
export async function getUserHourlyWeather(
  clerkUserId: string,
  location: string,
  hours: number = 12
): Promise<UserHourlyWeatherData[]> {
  'use server';
  
  try {
    console.log(`🌤️ 사용자 ${clerkUserId} 시간별 날씨 조회 시작`);
    
    // 1. 데이터베이스에서 사용자별 시간별 날씨 데이터 조회
    const now = new Date();
    const twelveHoursFromNow = new Date(now.getTime() + (hours * 60 * 60 * 1000));
    
    const userHourlyData = await db
      .select()
      .from(hourlyWeatherData)
      .where(and(
        eq(hourlyWeatherData.clerkUserId, clerkUserId),
        eq(hourlyWeatherData.locationName, location),
        gte(hourlyWeatherData.expiresAt, now), // 만료되지 않은 데이터
        gte(hourlyWeatherData.forecastDatetime, now), // 현재 시간 이후
        lte(hourlyWeatherData.forecastDatetime, twelveHoursFromNow) // 12시간 이내
      ))
      .orderBy(hourlyWeatherData.forecastDatetime)
      .limit(hours);

    // 2. 사용자별 데이터가 충분하면 반환
    if (userHourlyData.length >= Math.min(hours, 6)) {
      console.log(`✅ 사용자 ${clerkUserId} DB 시간별 날씨 데이터 사용: ${userHourlyData.length}개`);
      return userHourlyData.map(transformDBToUserWeatherData);
    }

    // 3. 사용자별 데이터가 부족하면 실시간 API에서 조회
    console.log(`🌐 사용자 ${clerkUserId} 실시간 API 시간별 날씨 조회`);
    const apiData = await weatherDataCollectorService.getHourlyForecast(location, hours);
    
    // 4. API 데이터를 사용자별로 저장 (백그라운드에서)
    saveUserHourlyDataInBackground(clerkUserId, location, apiData);
    
    return apiData.map(transformAPIToUserWeatherData);
    
  } catch (error) {
    console.error(`❌ 사용자 ${clerkUserId} 시간별 날씨 조회 실패:`, error);
    throw new Error('사용자별 시간별 날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자별 일별 날씨 데이터 조회
 */
export async function getUserDailyWeather(
  clerkUserId: string,
  location: string,
  days: number = 5
): Promise<UserDailyWeatherData[]> {
  'use server';
  
  try {
    console.log(`🌤️ 사용자 ${clerkUserId} 일별 날씨 조회 시작`);
    
    // 1. 데이터베이스에서 사용자별 일별 날씨 데이터 조회
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const userDailyData = await db
      .select()
      .from(dailyWeatherData)
      .where(and(
        eq(dailyWeatherData.clerkUserId, clerkUserId),
        eq(dailyWeatherData.locationName, location),
        gte(dailyWeatherData.expiresAt, now), // 만료되지 않은 데이터
        gte(dailyWeatherData.forecastDate, today) // 오늘 이후
      ))
      .orderBy(dailyWeatherData.forecastDate)
      .limit(days);

    // 2. 사용자별 데이터가 충분하면 반환
    if (userDailyData.length >= Math.min(days, 3)) {
      console.log(`✅ 사용자 ${clerkUserId} DB 일별 날씨 데이터 사용: ${userDailyData.length}개`);
      return userDailyData.map(transformDBToDailyWeatherData);
    }

    // 3. 사용자별 데이터가 부족하면 실시간 API에서 조회
    console.log(`🌐 사용자 ${clerkUserId} 실시간 API 일별 날씨 조회`);
    const apiData = await weatherDataCollectorService.getDailyForecast(location, days);
    
    // 4. API 데이터를 사용자별로 저장 (백그라운드에서)
    saveUserDailyDataInBackground(clerkUserId, location, apiData);
    
    return apiData.map(transformAPIToDailyWeatherData);
    
  } catch (error) {
    console.error(`❌ 사용자 ${clerkUserId} 일별 날씨 조회 실패:`, error);
    throw new Error('사용자별 일별 날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자의 저장된 위치 기반 날씨 조회
 */
export async function getUserLocationBasedWeather(clerkUserId: string): Promise<{
  hourlyWeather: UserHourlyWeatherData[];
  dailyWeather: UserDailyWeatherData[];
  location: string;
} | null> {
  'use server';
  
  try {
    // 사용자 위치 정보 조회
    const userLocation = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.clerkUserId, clerkUserId))
      .orderBy(desc(userLocations.createdAt))
      .limit(1);

    if (userLocation.length === 0) {
      console.log(`사용자 ${clerkUserId}의 저장된 위치 정보가 없습니다.`);
      return null;
    }

    const location = userLocation[0];
    const locationName = location.address || `${location.latitude},${location.longitude}`;

    console.log(`🌤️ 사용자 ${clerkUserId} 저장된 위치 기반 날씨 조회: ${locationName}`);

    // 시간별과 일별 날씨를 병렬로 조회
    const [hourlyWeather, dailyWeather] = await Promise.all([
      getUserHourlyWeather(clerkUserId, locationName, 12),
      getUserDailyWeather(clerkUserId, locationName, 5)
    ]);

    return {
      hourlyWeather,
      dailyWeather,
      location: locationName
    };
    
  } catch (error) {
    console.error(`❌ 사용자 ${clerkUserId} 위치 기반 날씨 조회 실패:`, error);
    throw new Error('사용자 위치 기반 날씨 정보를 가져오는데 실패했습니다.');
  }
}

/**
 * 사용자별 시간별 날씨 데이터 백그라운드 저장
 */
async function saveUserHourlyDataInBackground(
  clerkUserId: string,
  location: string,
  apiData: any[]
): Promise<void> {
  try {
    // 백그라운드에서 실행 (에러가 발생해도 메인 로직에 영향 없음)
    setTimeout(async () => {
      try {
        // API 데이터를 DB 형식으로 변환하여 저장
        const dbRecords = apiData.map(data => ({
          clerkUserId,
          locationKey: 'user-specific',
          locationName: location,
          latitude: null,
          longitude: null,
          forecastDate: new Date(data.forecastDatetime).toISOString().split('T')[0],
          forecastHour: new Date(data.forecastDatetime).getHours(),
          forecastDatetime: new Date(data.forecastDatetime),
          temperature: data.temperature,
          conditions: data.conditions,
          weatherIcon: data.weatherIcon || null,
          humidity: data.humidity || null,
          precipitation: data.precipitation?.toString() || null,
          precipitationProbability: data.precipitationProbability || null,
          rainProbability: data.rainProbability || null,
          windSpeed: data.windSpeed || null,
          units: 'metric',
          rawData: data,
          cacheKey: `user-${clerkUserId}-${location}-hourly`,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10분 후 만료
        }));

        await db.insert(hourlyWeatherData).values(dbRecords);
        console.log(`✅ 사용자 ${clerkUserId} 시간별 날씨 데이터 저장 완료`);
      } catch (saveError) {
        console.error(`⚠️ 사용자 ${clerkUserId} 시간별 날씨 데이터 저장 실패:`, saveError);
      }
    }, 100);
  } catch (error) {
    // 백그라운드 저장 실패는 무시
    console.warn(`⚠️ 사용자 ${clerkUserId} 시간별 데이터 백그라운드 저장 스케줄링 실패:`, error);
  }
}

/**
 * 사용자별 일별 날씨 데이터 백그라운드 저장
 */
async function saveUserDailyDataInBackground(
  clerkUserId: string,
  location: string,
  apiData: any[]
): Promise<void> {
  try {
    // 백그라운드에서 실행
    setTimeout(async () => {
      try {
        const dbRecords = apiData.map(data => ({
          clerkUserId,
          locationKey: 'user-specific',
          locationName: location,
          latitude: null,
          longitude: null,
          forecastDate: data.forecastDate,
          dayOfWeek: data.dayOfWeek,
          temperature: Math.round((data.highTemp + data.lowTemp) / 2),
          highTemp: data.highTemp,
          lowTemp: data.lowTemp,
          conditions: data.conditions,
          weatherIcon: data.weatherIcon || null,
          precipitationProbability: data.precipitationProbability || null,
          rainProbability: data.rainProbability || null,
          dayWeather: null,
          nightWeather: null,
          headline: null,
          units: 'metric',
          forecastDays: 5,
          rawData: data,
          cacheKey: `user-${clerkUserId}-${location}-daily`,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1시간 후 만료
        }));

        await db.insert(dailyWeatherData).values(dbRecords);
        console.log(`✅ 사용자 ${clerkUserId} 일별 날씨 데이터 저장 완료`);
      } catch (saveError) {
        console.error(`⚠️ 사용자 ${clerkUserId} 일별 날씨 데이터 저장 실패:`, saveError);
      }
    }, 200);
  } catch (error) {
    console.warn(`⚠️ 사용자 ${clerkUserId} 일별 데이터 백그라운드 저장 스케줄링 실패:`, error);
  }
}

/**
 * DB 데이터를 사용자 날씨 데이터 형식으로 변환
 */
function transformDBToUserWeatherData(dbData: any): UserHourlyWeatherData {
  return {
    dateTime: dbData.forecastDatetime,
    temperature: dbData.temperature,
    conditions: dbData.conditions,
    precipitationProbability: dbData.precipitationProbability || 0,
    rainProbability: dbData.rainProbability || 0,
    windSpeed: dbData.windSpeed || 0,
    humidity: dbData.humidity || 0,
    weatherIcon: dbData.weatherIcon,
    source: 'user_database'
  };
}

/**
 * API 데이터를 사용자 날씨 데이터 형식으로 변환
 */
function transformAPIToUserWeatherData(apiData: any): UserHourlyWeatherData {
  return {
    dateTime: new Date(apiData.forecastDatetime),
    temperature: apiData.temperature,
    conditions: apiData.conditions,
    precipitationProbability: apiData.precipitationProbability || 0,
    rainProbability: apiData.rainProbability || 0,
    windSpeed: apiData.windSpeed || 0,
    humidity: apiData.humidity || 0,
    weatherIcon: apiData.weatherIcon,
    source: 'real_time_api'
  };
}

/**
 * DB 일별 데이터 변환
 */
function transformDBToDailyWeatherData(dbData: any): UserDailyWeatherData {
  return {
    date: dbData.forecastDate,
    dayOfWeek: dbData.dayOfWeek,
    highTemp: dbData.highTemp,
    lowTemp: dbData.lowTemp,
    conditions: dbData.conditions,
    precipitationProbability: dbData.precipitationProbability || 0,
    rainProbability: dbData.rainProbability || 0,
    weatherIcon: dbData.weatherIcon,
    source: 'user_database'
  };
}

/**
 * API 일별 데이터 변환
 */
function transformAPIToDailyWeatherData(apiData: any): UserDailyWeatherData {
  return {
    date: apiData.forecastDate,
    dayOfWeek: apiData.dayOfWeek,
    highTemp: apiData.highTemp,
    lowTemp: apiData.lowTemp,
    conditions: apiData.conditions,
    precipitationProbability: apiData.precipitationProbability || 0,
    rainProbability: apiData.rainProbability || 0,
    weatherIcon: apiData.weatherIcon,
    source: 'real_time_api'
  };
}