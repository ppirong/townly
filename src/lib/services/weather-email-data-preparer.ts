/**
 * 날씨 안내 이메일을 위한 데이터 준비 서비스
 * 
 * 데이터베이스에서 날씨 데이터와 사용자 정보를 조회하여
 * 에이전트에 전달할 형식으로 변환합니다.
 */

import { db } from '@/db';
import { hourlyWeatherData, dailyWeatherData, userLocations } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import type { WeatherData } from './weather-email-writer';
import { getHourlyWeather } from './weather';

export interface PreparedWeatherData extends WeatherData {
  userId: string;
  userEmail: string;
}

export class WeatherEmailDataPreparer {
  /**
   * 특정 사용자의 날씨 안내 이메일 데이터를 준비합니다.
   * @param userId - Clerk 사용자 ID
   * @param sendTime - 발송 시간 (6 또는 18)
   */
  async prepareUserWeatherData(
    userId: string,
    sendTime: 6 | 18
  ): Promise<PreparedWeatherData | null> {
    try {
      // 1. 사용자 위치 정보 조회
      const userLocation = await db
        .select()
        .from(userLocations)
        .where(eq(userLocations.clerkUserId, userId))
        .limit(1);

      if (userLocation.length === 0) {
        console.error(`사용자 위치 정보를 찾을 수 없습니다: ${userId}`);
        return null;
      }

      const location = userLocation[0];
      const locationKey = location.cityName || ''; // AccuWeather location key

      // 2. 현재 날짜 및 시간 정보 생성 (KST 기준)
      const now = new Date();
      const kstOffset = 9 * 60; // KST는 UTC+9
      const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
      
      const year = kstNow.getUTCFullYear();
      const month = kstNow.getUTCMonth() + 1;
      const day = kstNow.getUTCDate();
      const sendDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // 3. 날씨 안내 범위 시간 계산
      let startHour: number;
      let endHour: number;
      let startDate: string;
      let endDate: string;

      if (sendTime === 6) {
        // 6시 발송: 6시부터 18시까지 (당일)
        startHour = 6;
        endHour = 18;
        startDate = sendDate;
        endDate = sendDate;
      } else {
        // 18시 발송: 18시부터 다음 날 6시까지
        startHour = 18;
        endHour = 6;
        startDate = sendDate;
        // 다음 날 날짜 계산
        const nextDay = new Date(kstNow);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        const nextYear = nextDay.getUTCFullYear();
        const nextMonth = nextDay.getUTCMonth() + 1;
        const nextDayNum = nextDay.getUTCDate();
        endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDayNum).padStart(2, '0')}`;
      }

      // 4. 시간별 날씨 데이터 조회
      let hourlyData;
      
      if (sendTime === 6) {
        // 당일 6시~18시
        hourlyData = await db
          .select()
          .from(hourlyWeatherData)
          .where(
            and(
              eq(hourlyWeatherData.clerkUserId, userId),
              eq(hourlyWeatherData.forecastDate, startDate),
              gte(hourlyWeatherData.forecastHour, startHour),
              lte(hourlyWeatherData.forecastHour, endHour)
            )
          )
          .orderBy(hourlyWeatherData.forecastHour);
      } else {
        // 당일 18시~23시 + 다음 날 0시~6시
        const todayData = await db
          .select()
          .from(hourlyWeatherData)
          .where(
            and(
              eq(hourlyWeatherData.clerkUserId, userId),
              eq(hourlyWeatherData.forecastDate, startDate),
              gte(hourlyWeatherData.forecastHour, 18)
            )
          )
          .orderBy(hourlyWeatherData.forecastHour);

        const tomorrowData = await db
          .select()
          .from(hourlyWeatherData)
          .where(
            and(
              eq(hourlyWeatherData.clerkUserId, userId),
              eq(hourlyWeatherData.forecastDate, endDate),
              lte(hourlyWeatherData.forecastHour, 6)
            )
          )
          .orderBy(hourlyWeatherData.forecastHour);

        hourlyData = [...todayData, ...tomorrowData];
      }

      if (hourlyData.length === 0) {
        console.log(`📡 DB에 시간별 날씨 데이터가 없음. 실시간 API 호출: ${userId}, ${sendDate}`);
        
        // 데이터베이스에 데이터가 없으면 실시간 API 호출
        try {
          const apiHourlyData = await getHourlyWeather({
            latitude: parseFloat(location.latitude || '37.5665'),
            longitude: parseFloat(location.longitude || '126.9780'),
            clerkUserId: userId,
            units: 'metric'
          });
          
          if (apiHourlyData.length === 0) {
            console.error(`API에서도 시간별 날씨 데이터를 가져올 수 없습니다: ${userId}, ${sendDate}`);
            return null;
          }
          
          // API 데이터를 시간 범위에 맞게 필터링
          const filteredApiData = apiHourlyData.filter(data => {
            const hour = new Date(data.timestamp).getHours();
            if (sendTime === 6) {
              return hour >= 6 && hour <= 18;
            } else {
              return hour >= 18 || hour <= 6;
            }
          });
          
          if (filteredApiData.length === 0) {
            console.error(`필터링된 API 데이터가 없습니다: ${userId}, ${sendDate}`);
            return null;
          }
          
          // API 데이터를 hourlyData 형식으로 변환
          hourlyData = filteredApiData.map(data => ({
            clerkUserId: userId,
            locationKey: location.cityName || '',
            locationName: location.cityName || '',
            latitude: location.latitude || '37.5665',
            longitude: location.longitude || '126.9780',
            forecastDate: sendDate,
            forecastHour: new Date(data.timestamp).getHours(),
            forecastDatetime: new Date(data.timestamp),
            temperature: data.temperature,
            conditions: data.conditions,
            weatherIcon: data.weatherIcon || null,
            humidity: data.humidity || null,
            precipitation: data.precipitation?.toString() || '0',
            precipitationProbability: data.precipitationProbability || null,
            rainProbability: data.rainProbability || 0,
            windSpeed: data.windSpeed || null,
            units: data.units,
            rawData: data,
            cacheKey: `hourly_${userId}_${sendDate}`,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1시간 후 만료
            id: `api_${Date.now()}_${Math.random()}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }));
          
          console.log(`✅ API에서 ${hourlyData.length}개의 시간별 날씨 데이터 조회 성공`);
          
        } catch (apiError) {
          console.error(`실시간 API 호출 실패: ${userId}, ${sendDate}`, apiError);
          return null;
        }
      }

      // 5. 일별 날씨 데이터에서 헤드라인 조회
      const dailyData = await db
        .select()
        .from(dailyWeatherData)
        .where(
          and(
            eq(dailyWeatherData.clerkUserId, userId),
            eq(dailyWeatherData.forecastDate, startDate)
          )
        )
        .limit(1);

      const headline =
        dailyData.length > 0 && dailyData[0].headline
          ? (dailyData[0].headline as any)?.text || ''
          : '';

      // 6. 최저/최고 온도 계산
      const temperatures = hourlyData.map((h) => h.temperature);
      const minTemp = Math.min(...temperatures);
      const maxTemp = Math.max(...temperatures);

      // 7. WeatherData 형식으로 변환
      const preparedData: PreparedWeatherData = {
        userId,
        userEmail: '', // 호출자가 별도로 설정해야 함
        locationName: location.cityName || locationKey,
        userAddress: location.address || '',
        headline,
        hourlyData: hourlyData.map((h) => ({
          dateTime: h.forecastDatetime,
          hour: h.forecastHour,
          temperature: h.temperature,
          conditions: h.conditions,
          rainProbability: h.rainProbability || 0,
          precipitation: parseFloat(h.precipitation || '0'),
          snowProbability: 0, // AccuWeather API가 제공하지 않으면 0
          snowfall: 0,
        })),
        minTemp,
        maxTemp,
        sendTime,
        sendDate,
        currentMonth: month,
      };

      return preparedData;
    } catch (error) {
      console.error('날씨 데이터 준비 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 모든 구독 중인 사용자의 날씨 데이터를 준비합니다.
   */
  async prepareAllUsersWeatherData(
    sendTime: 6 | 18
  ): Promise<PreparedWeatherData[]> {
    try {
      // 구독 중인 사용자 목록 조회는 별도 함수에서 처리
      // 여기서는 위치 정보가 있는 모든 사용자를 대상으로 함
      const allUsers = await db.select().from(userLocations);

      const results: PreparedWeatherData[] = [];

      for (const user of allUsers) {
        try {
          const weatherData = await this.prepareUserWeatherData(
            user.clerkUserId,
            sendTime
          );

          if (weatherData) {
            results.push(weatherData);
          }
        } catch (error) {
          console.error(
            `사용자 ${user.clerkUserId}의 날씨 데이터 준비 실패:`,
            error
          );
          // 개별 사용자 오류는 무시하고 계속 진행
        }
      }

      return results;
    } catch (error) {
      console.error('전체 사용자 날씨 데이터 준비 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜와 시간의 날씨 데이터를 준비합니다 (테스트용).
   */
  async prepareTestWeatherData(
    userId: string,
    targetDate: string,
    sendTime: 6 | 18
  ): Promise<PreparedWeatherData | null> {
    try {
      const userLocation = await db
        .select()
        .from(userLocations)
        .where(eq(userLocations.clerkUserId, userId))
        .limit(1);

      if (userLocation.length === 0) {
        return null;
      }

      const location = userLocation[0];

      // 간단한 테스트 데이터 생성
      const currentDate = new Date(targetDate);
      const month = currentDate.getMonth() + 1;

      const testData: PreparedWeatherData = {
        userId,
        userEmail: '',
        locationName: location.cityName || '서울',
        userAddress: location.address || '서울시 강남구',
        headline: '오늘은 맑고 화창한 날씨가 예상됩니다.',
        hourlyData: [],
        minTemp: 10,
        maxTemp: 25,
        sendTime,
        sendDate: targetDate,
        currentMonth: month,
      };

      // 시간별 테스트 데이터 생성
      const startHour = sendTime === 6 ? 6 : 18;
      const hours = sendTime === 6 ? 12 : 12;

      for (let i = 0; i < hours; i++) {
        const hour = (startHour + i) % 24;
        testData.hourlyData.push({
          dateTime: new Date(currentDate.getTime() + i * 3600000),
          hour,
          temperature: 15 + Math.random() * 10,
          conditions: '맑음',
          rainProbability: Math.random() * 100,
          precipitation: Math.random() * 20,
          snowProbability: 0,
          snowfall: 0,
        });
      }

      return testData;
    } catch (error) {
      console.error('테스트 날씨 데이터 준비 중 오류 발생:', error);
      throw error;
    }
  }
}
