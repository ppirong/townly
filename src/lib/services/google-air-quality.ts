/**
 * Google Air Quality API 서비스
 * Google Maps Platform Air Quality API를 사용하여 대기질 정보를 조회합니다.
 */

import { env } from '@/lib/env';
import { db } from '@/db';
import { 
  googleHourlyAirQualityData, 
  googleDailyAirQualityData,
  apiCallLogs,
  type NewGoogleHourlyAirQualityData,
  type NewGoogleDailyAirQualityData,
  type NewApiCallLog
} from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { convertGoogleDateTimeToKST } from '@/lib/utils/datetime';

// Google Air Quality API 타입 정의
export interface GoogleAirQualityRequest {
  latitude: number;
  longitude: number;
  clerkUserId?: string;
  includeLocalAqi?: boolean;
  includeDominantPollutant?: boolean;
  includeHealthSuggestion?: boolean;
  languageCode?: string;
}

export interface GoogleHourlyAirQualityRequest extends GoogleAirQualityRequest {
  hours?: number; // 1-90 시간 (Google API 제한)
}

export interface GoogleDailyAirQualityRequest extends GoogleAirQualityRequest {
  days?: number; // 1-2 일 (12시간 시간별 데이터로부터 생성, 오늘+내일)
}

// Google Air Quality API 응답 타입
export interface GoogleAirQualityIndex {
  aqi: number;
  aqiDisplay: string;
  color: {
    red: number;
    green: number;
    blue: number;
  };
  category: string;
  dominantPollutant: string;
}

export interface GooglePollutantConcentration {
  code: string;
  displayName: string;
  fullName: string;
  concentration: {
    value: number;
    units: string;
  };
  additionalInfo?: {
    sources: string;
    effects: string;
  };
}

export interface GoogleAirQualityData {
  dateTime: string;
  regionCode: string;
  indexes: GoogleAirQualityIndex[];
  pollutants: GooglePollutantConcentration[];
  healthRecommendations?: {
    generalPopulation: string;
    elderly: string;
    lungDiseasePopulation: string;
    heartDiseasePopulation: string;
    athletes: string;
    pregnantWomen: string;
    children: string;
  };
}

export interface GoogleHourlyAirQualityResponse {
  hourlyForecasts: GoogleAirQualityData[];
  regionCode?: string;
  nextPageToken?: string;
}

export interface GoogleDailyAirQualityResponse {
  dailyForecasts: GoogleAirQualityData[];
}

// 처리된 대기질 데이터 타입
export interface ProcessedAirQualityData {
  dateTime: string;
  pm10?: number;
  pm25?: number;
  caiKr?: number;
  breezoMeterAqi?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  co?: number;
  healthRecommendations?: {
    general: string;
    sensitive: string;
  };
  rawData: any;
}

class GoogleAirQualityService {
  private readonly baseUrl = 'https://airquality.googleapis.com/v1';
  private readonly apiKey = env.GOOGLE_MAPS_API_KEY;

  /**
   * API 호출 로그 기록
   */
  private async logApiCall(
    endpoint: string,
    httpStatus: number,
    responseTime: number,
    isSuccessful: boolean,
    userId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const callDate = new Date().toISOString().split('T')[0];
      
      const logData: NewApiCallLog = {
        apiProvider: 'google_air_quality',
        apiEndpoint: endpoint,
        httpMethod: 'POST',
        callDate,
        httpStatus,
        responseTime,
        isSuccessful,
        userId,
        errorMessage,
        requestParams: { endpoint },
      };

      await db.insert(apiCallLogs).values(logData);
    } catch (error) {
      console.error('API 호출 로그 기록 실패:', error);
    }
  }

  /**
   * 현재 대기질 정보 조회
   */
  async getCurrentAirQuality(request: GoogleAirQualityRequest): Promise<GoogleAirQualityData> {
    const startTime = Date.now();
    
    try {
      console.log(`🌬️ Google Air Quality API 현재 대기질 조회 시작: ${request.latitude}, ${request.longitude}`);
      
      if (!this.apiKey) {
        throw new Error('Google Maps API 키가 설정되지 않았습니다.');
      }

      const requestBody = {
        location: {
          latitude: request.latitude,
          longitude: request.longitude,
        },
        extraComputations: [
          'POLLUTANT_CONCENTRATION', // 모든 오염물질 농도 정보 포함 (PM10, PM2.5 등)
          'POLLUTANT_ADDITIONAL_INFO', // 오염물질 추가 정보
          ...(request.includeLocalAqi ? ['LOCAL_AQI'] : []),
          ...(request.includeDominantPollutant ? ['DOMINANT_POLLUTANT_CONCENTRATION'] : []),
          ...(request.includeHealthSuggestion ? ['HEALTH_RECOMMENDATIONS'] : []),
        ],
        languageCode: request.languageCode || 'ko',
        universalAqi: true,
      };

      console.log('🌬️ API 요청 본문:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/currentConditions:lookup?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🚨 Google Air Quality API 현재 대기질 오류:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          requestBody: requestBody
        });
        await this.logApiCall('/currentConditions:lookup', response.status, responseTime, false, request.clerkUserId, errorText);
        throw new Error(`Google Air Quality API 오류: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Google Air Quality API 현재 대기질 응답:', JSON.stringify(data, null, 2));
      await this.logApiCall('/currentConditions:lookup', response.status, responseTime, true, request.clerkUserId);

      console.log(`✅ Google Air Quality API 현재 대기질 조회 완료 (${responseTime}ms)`);
      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.logApiCall('/currentConditions:lookup', 500, responseTime, false, request.clerkUserId, String(error));
      console.error('Google Air Quality API 현재 대기질 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 시간별 대기질 예보 조회 (period 방식)
   */
  async getHourlyForecast(request: GoogleHourlyAirQualityRequest): Promise<GoogleHourlyAirQualityResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🌬️ Google Air Quality API 시간별 예보 조회 시작: ${request.latitude}, ${request.longitude}`);
      
      if (!this.apiKey) {
        throw new Error('Google Maps API 키가 설정되지 않았습니다.');
      }

      // Google Air Quality API는 최대 90시간까지 지원 (실제 테스트 결과)
      const maxHours = 90;
      const requestedHours = Math.min(request.hours || 12, maxHours);

      // period 방식 사용: 시작 시간부터 종료 시간까지
      const now = new Date();
      const startDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);
      const endDateTime = new Date(startDateTime.getTime() + requestedHours * 60 * 60 * 1000);

      const requestBody = {
        universalAqi: true,
        location: {
          latitude: request.latitude,
          longitude: request.longitude,
        },
        period: {
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        },
        extraComputations: [
          'POLLUTANT_CONCENTRATION', // 모든 오염물질 농도 정보 포함 (PM10, PM2.5 등)
          'POLLUTANT_ADDITIONAL_INFO', // 오염물질 추가 정보
          ...(request.includeLocalAqi ? ['LOCAL_AQI'] : []),
          ...(request.includeDominantPollutant ? ['DOMINANT_POLLUTANT_CONCENTRATION'] : []),
          ...(request.includeHealthSuggestion ? ['HEALTH_RECOMMENDATIONS'] : []),
        ],
        languageCode: request.languageCode || 'ko',
      };

      console.log('🌬️ 예보 API 요청 본문 (period 방식):', JSON.stringify(requestBody, null, 2));

      // 모든 페이지의 데이터를 수집
      let allForecasts: any[] = [];
      let pageToken: string | undefined = undefined;
      let pageCount = 0;
      const maxPages = 10; // 무한 루프 방지

      do {
        const bodyWithToken: typeof requestBody & { pageToken?: string } = pageToken 
          ? { ...requestBody, pageToken }
          : requestBody;

        console.log(`📄 페이지 ${pageCount + 1} 요청 중...`);

        const response = await fetch(`${this.baseUrl}/forecast:lookup?key=${this.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyWithToken),
        });

        const responseTime = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          console.error('🚨 Google Air Quality API 예보 오류:', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText,
            requestBody: bodyWithToken
          });
          await this.logApiCall('/forecast:lookup', response.status, responseTime, false, request.clerkUserId, errorText);
          throw new Error(`Google Air Quality API 오류: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (data.hourlyForecasts && data.hourlyForecasts.length > 0) {
          allForecasts = allForecasts.concat(data.hourlyForecasts);
          console.log(`✅ 페이지 ${pageCount + 1}: ${data.hourlyForecasts.length}개 예보 추가 (누적: ${allForecasts.length}개)`);
        }

        pageToken = data.nextPageToken;
        pageCount++;

        // 요청한 시간만큼 데이터를 모았거나 더 이상 페이지가 없으면 중단
        if (allForecasts.length >= requestedHours || !pageToken || pageCount >= maxPages) {
          break;
        }

      } while (pageToken);

      await this.logApiCall('/forecast:lookup', 200, Date.now() - startTime, true, request.clerkUserId);

      console.log(`✅ 총 ${pageCount}개 페이지에서 ${allForecasts.length}개 예보 수집 완료`);
      console.log('📊 첫 번째 예보:', allForecasts[0]?.dateTime);
      console.log('📊 마지막 예보:', allForecasts[allForecasts.length - 1]?.dateTime);

      return {
        hourlyForecasts: allForecasts.slice(0, requestedHours),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.logApiCall('/forecast:lookup', 500, responseTime, false, request.clerkUserId, String(error));
      console.error('Google Air Quality API 시간별 예보 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 대기질 데이터 처리 및 변환
   */
  processAirQualityData(data: GoogleAirQualityData): ProcessedAirQualityData {
    const processed: ProcessedAirQualityData = {
      dateTime: data.dateTime,
      rawData: data,
    };

    // 오염물질 농도 추출
    if (data.pollutants && Array.isArray(data.pollutants)) {
      data.pollutants.forEach(pollutant => {
        switch (pollutant.code) {
          case 'pm10':
            processed.pm10 = Math.round(pollutant.concentration.value);
            break;
          case 'pm25':
            processed.pm25 = Math.round(pollutant.concentration.value);
            break;
          case 'no2':
            processed.no2 = Math.round(pollutant.concentration.value);
            break;
          case 'o3':
            processed.o3 = Math.round(pollutant.concentration.value);
            break;
          case 'so2':
            processed.so2 = Math.round(pollutant.concentration.value);
            break;
          case 'co':
            processed.co = Math.round(pollutant.concentration.value * 1000); // mg/m³로 변환
            break;
        }
      });
    }

    // 대기질 지수 추출 - Google API 실제 구조에 맞게 수정
    if (data.indexes && Array.isArray(data.indexes)) {
      data.indexes.forEach((index: any) => {
        // Google API는 code 필드로 AQI 타입을 구분합니다
        if (index.code === 'krp' || index.aqiDisplay === 'KR' || index.code === 'kor_airkorea') {
          // 한국 대기질 지수 (Korea AirKorea)
          processed.caiKr = index.aqi;
        } else if (index.code === 'uaqi') {
          // Universal AQI - BreezoMeter AQI로 사용
          processed.breezoMeterAqi = index.aqi;
        }
      });
    }

    // 건강 권고사항 처리
    if (data.healthRecommendations) {
      processed.healthRecommendations = {
        general: data.healthRecommendations.generalPopulation || '',
        sensitive: data.healthRecommendations.elderly || data.healthRecommendations.children || '',
      };
    }

    return processed;
  }

  /**
   * 시간별 대기질 데이터를 데이터베이스에 저장
   */
  async saveHourlyAirQualityData(
    processedData: ProcessedAirQualityData[],
    request: GoogleHourlyAirQualityRequest
  ): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1시간 후 만료

      for (const data of processedData) {
        // Google API의 UTC 시간을 KST로 변환
        const { kstDateTime, forecastDate, forecastHour } = convertGoogleDateTimeToKST(data.dateTime);
        const cacheKey = `google_hourly_${request.latitude}_${request.longitude}_${kstDateTime.toISOString()}`;

        const dbData: NewGoogleHourlyAirQualityData = {
          clerkUserId: request.clerkUserId,
          latitude: request.latitude.toString(),
          longitude: request.longitude.toString(),
          locationName: `${request.latitude}, ${request.longitude}`,
          forecastDate, // KST 기준 날짜
          forecastHour, // KST 기준 시간
          forecastDateTime: kstDateTime, // KST 기준 DateTime
          pm10: data.pm10,
          pm25: data.pm25,
          caiKr: data.caiKr,
          breezoMeterAqi: data.breezoMeterAqi,
          no2: data.no2,
          o3: data.o3,
          so2: data.so2,
          co: data.co,
          rawData: data.rawData,
          cacheKey,
          expiresAt,
        };

        // 기존 데이터 확인 후 업데이트 또는 삽입
        const existing = await db
          .select()
          .from(googleHourlyAirQualityData)
          .where(eq(googleHourlyAirQualityData.cacheKey, cacheKey))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(googleHourlyAirQualityData)
            .set({ ...dbData, updatedAt: now })
            .where(eq(googleHourlyAirQualityData.cacheKey, cacheKey));
        } else {
          await db.insert(googleHourlyAirQualityData).values(dbData);
        }
      }

      console.log(`✅ 시간별 대기질 데이터 ${processedData.length}개 저장 완료`);
    } catch (error) {
      console.error('시간별 대기질 데이터 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 캐시된 시간별 대기질 데이터 조회
   */
  async getCachedHourlyData(
    latitude: number,
    longitude: number,
    clerkUserId?: string
  ): Promise<ProcessedAirQualityData[]> {
    try {
      const now = new Date();
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const endTime = new Date(startOfHour.getTime() + 12 * 60 * 60 * 1000); // 12시간 후

      const whereConditions = [
        eq(googleHourlyAirQualityData.latitude, latitude.toString()),
        eq(googleHourlyAirQualityData.longitude, longitude.toString()),
        gte(googleHourlyAirQualityData.forecastDateTime, startOfHour),
        lte(googleHourlyAirQualityData.forecastDateTime, endTime),
        gte(googleHourlyAirQualityData.expiresAt, now),
      ];

      if (clerkUserId) {
        whereConditions.push(eq(googleHourlyAirQualityData.clerkUserId, clerkUserId));
      }

      const cachedData = await db
        .select()
        .from(googleHourlyAirQualityData)
        .where(and(...whereConditions))
        .orderBy(googleHourlyAirQualityData.forecastDateTime);

      return cachedData.map(data => ({
        dateTime: data.forecastDateTime.toISOString(),
        pm10: data.pm10 || undefined,
        pm25: data.pm25 || undefined,
        caiKr: data.caiKr || undefined,
        breezoMeterAqi: data.breezoMeterAqi || undefined,
        no2: data.no2 || undefined,
        o3: data.o3 || undefined,
        so2: data.so2 || undefined,
        co: data.co || undefined,
        rawData: data.rawData,
      }));
    } catch (error) {
      console.error('캐시된 시간별 대기질 데이터 조회 실패:', error);
      return [];
    }
  }

  /**
   * 스마트 TTL을 사용한 시간별 대기질 데이터 조회
   */
  async getHourlyAirQualityWithTTL(request: GoogleHourlyAirQualityRequest): Promise<ProcessedAirQualityData[]> {
    try {
      // 1. 캐시된 데이터 확인
      const cachedData = await this.getCachedHourlyData(
        request.latitude,
        request.longitude,
        request.clerkUserId
      );

      // 2. 캐시된 데이터가 충분하면 반환
      const requiredHours = request.hours || 12;
      if (cachedData.length >= requiredHours) {
        console.log(`✅ 캐시된 시간별 대기질 데이터 사용: ${cachedData.length}개 항목`);
        return cachedData.slice(0, requiredHours);
      }

      // 3. 캐시된 데이터가 부족하면 API 호출
      console.log(`🔄 시간별 대기질 데이터 API 호출 필요 (캐시: ${cachedData.length}/${requiredHours})`);
      
      const apiResponse = await this.getHourlyForecast(request);
      console.log(`📥 API 응답 처리: ${apiResponse.hourlyForecasts?.length || 0}개 예보 데이터`);
      
      const processedData = apiResponse.hourlyForecasts.map(data => this.processAirQualityData(data));
      console.log(`✅ 처리된 데이터: ${processedData.length}개 항목`);

      // 4. 새로운 데이터를 데이터베이스에 저장
      await this.saveHourlyAirQualityData(processedData, request);

      console.log(`🎯 최종 반환: ${Math.min(processedData.length, requiredHours)}개 항목 (요청: ${requiredHours}개)`);
      return processedData.slice(0, requiredHours);
    } catch (error) {
      console.error('스마트 TTL 시간별 대기질 데이터 조회 실패:', error);
      
      // 5. API 호출 실패 시 캐시된 데이터라도 반환
      const cachedData = await this.getCachedHourlyData(
        request.latitude,
        request.longitude,
        request.clerkUserId
      );
      
      if (cachedData.length > 0) {
        console.log(`⚠️ API 실패로 캐시된 데이터 사용: ${cachedData.length}개 항목`);
        return cachedData;
      }
      
      throw error;
    }
  }

  /**
   * 일별 대기질 예보 조회 (12시간 시간별 데이터로부터 생성)
   * 참고: Google API의 period 방식은 12시간 정도만 안정적으로 지원
   */
  async getDailyAirQualityWithTTL(request: GoogleDailyAirQualityRequest): Promise<ProcessedAirQualityData[]> {
    try {
      console.log(`📊 일별 대기질 데이터 집계 시작`);
      console.log(`🔄 전략: 12시간 시간별 예보를 가져와서 날짜별로 그룹핑 (오늘/내일)`);

      // 시간별 예보 API로 12시간 데이터 요청 (안정적인 기간)
      const hourlyRequest: GoogleHourlyAirQualityRequest = {
        latitude: request.latitude,
        longitude: request.longitude,
        clerkUserId: request.clerkUserId,
        hours: 12, // 안정적으로 작동하는 12시간
        includeLocalAqi: request.includeLocalAqi,
        includeDominantPollutant: request.includeDominantPollutant,
        includeHealthSuggestion: request.includeHealthSuggestion,
        languageCode: request.languageCode,
      };

      console.log(`🌬️ 12시간 시간별 예보 요청 중...`);
      const hourlyResponse = await this.getHourlyForecast(hourlyRequest);

      if (!hourlyResponse.hourlyForecasts || hourlyResponse.hourlyForecasts.length === 0) {
        console.warn('⚠️ 시간별 예보 데이터가 없습니다');
        return [];
      }

      console.log(`✅ ${hourlyResponse.hourlyForecasts.length}개 시간별 데이터 수신`);

      // 시간별 데이터를 처리하고 날짜별로 그룹핑
      const dailyDataMap = new Map<string, ProcessedAirQualityData[]>();

      for (const hourlyForecast of hourlyResponse.hourlyForecasts) {
        const processedData = this.processAirQualityData(hourlyForecast);
        const forecastDate = new Date(processedData.dateTime);
        const dateKey = forecastDate.toISOString().split('T')[0]; // YYYY-MM-DD

        if (!dailyDataMap.has(dateKey)) {
          dailyDataMap.set(dateKey, []);
        }
        dailyDataMap.get(dateKey)!.push(processedData);
      }

      // 날짜별 평균 계산 (최대 2일: 오늘 + 내일)
      const dailyData: ProcessedAirQualityData[] = [];
      const sortedDates = Array.from(dailyDataMap.keys()).sort();

      console.log(`📅 날짜별 그룹핑 완료: ${sortedDates.length}일치 데이터`);

      // 12시간 데이터로는 최대 2일치 정도 생성 가능
      for (const dateKey of sortedDates.slice(0, 2)) {
        const dayData = dailyDataMap.get(dateKey)!;
        
        const avgData: ProcessedAirQualityData = {
          dateTime: new Date(dateKey + 'T00:00:00Z').toISOString(),
          pm10: this.calculateAverage(dayData.map(d => d.pm10).filter((val): val is number => typeof val === 'number')),
          pm25: this.calculateAverage(dayData.map(d => d.pm25).filter((val): val is number => typeof val === 'number')),
          caiKr: this.calculateAverage(dayData.map(d => d.caiKr).filter((val): val is number => typeof val === 'number')),
          breezoMeterAqi: this.calculateAverage(dayData.map(d => d.breezoMeterAqi).filter((val): val is number => typeof val === 'number')),
          no2: this.calculateAverage(dayData.map(d => d.no2).filter((val): val is number => typeof val === 'number')),
          o3: this.calculateAverage(dayData.map(d => d.o3).filter((val): val is number => typeof val === 'number')),
          so2: this.calculateAverage(dayData.map(d => d.so2).filter((val): val is number => typeof val === 'number')),
          co: this.calculateAverage(dayData.map(d => d.co).filter((val): val is number => typeof val === 'number')),
          rawData: { 
            dailyAverage: true, 
            hourlyDataCount: dayData.length,
            date: dateKey 
          },
        };

        dailyData.push(avgData);
        console.log(`📊 ${dateKey}: ${dayData.length}개 시간 데이터로 일 평균 계산 완료`);
      }

      console.log(`✅ 총 ${dailyData.length}일치 일별 대기질 데이터 생성 완료`);
      return dailyData;

    } catch (error) {
      console.error('일별 대기질 데이터 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 평균값 계산 헬퍼 함수
   */
  private calculateAverage(values: number[]): number | undefined {
    if (values.length === 0) return undefined;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / values.length);
  }

  /**
   * API 사용량 통계 조회
   */
  async getApiUsageStats(date?: string): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    avgResponseTime: number;
  }> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const stats = await db
        .select()
        .from(apiCallLogs)
        .where(
          and(
            eq(apiCallLogs.service, 'google_air_quality'),
            sql`DATE(${apiCallLogs.createdAt}) = ${targetDate}`
          )
        );

      const totalCalls = stats.length;
      const successfulCalls = stats.filter(s => s.statusCode && s.statusCode >= 200 && s.statusCode < 300).length;
      const failedCalls = totalCalls - successfulCalls;
      const avgResponseTime = totalCalls > 0 
        ? Math.round(stats.reduce((acc, s) => acc + (s.responseTime || 0), 0) / totalCalls)
        : 0;

      return {
        totalCalls,
        successfulCalls,
        failedCalls,
        avgResponseTime,
      };
    } catch (error) {
      console.error('API 사용량 통계 조회 실패:', error);
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        avgResponseTime: 0,
      };
    }
  }

  /**
   * 사용자별 90시간 대기질 데이터 수집 및 저장
   * 스케줄러에서 사용 (6시, 12시, 18시, 24시)
   */
  async collectAndStore90HourDataForUser(
    clerkUserId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    try {
      console.log(`🌬️ 사용자 ${clerkUserId} 90시간 대기질 데이터 수집 시작`);
      
      // 1. 90시간 예보 데이터 조회
      const request: GoogleHourlyAirQualityRequest = {
        latitude,
        longitude,
        clerkUserId,
        hours: 90,
        includeLocalAqi: true,
        includeDominantPollutant: true,
        includeHealthSuggestion: true,
        languageCode: 'ko',
      };

      const apiResponse = await this.getHourlyForecast(request);
      const processedData = apiResponse.hourlyForecasts.map(data => this.processAirQualityData(data));
      
      console.log(`✅ 90시간 데이터 수집 완료: ${processedData.length}개 항목`);

      // 2. 현재 시간 기준 이전 데이터 삭제 (같은 사용자)
      const now = new Date();
      await db
        .delete(googleHourlyAirQualityData)
        .where(
          and(
            eq(googleHourlyAirQualityData.clerkUserId, clerkUserId),
            eq(googleHourlyAirQualityData.latitude, latitude.toString()),
            eq(googleHourlyAirQualityData.longitude, longitude.toString()),
            lte(googleHourlyAirQualityData.forecastDateTime, now)
          )
        );
      
      console.log(`🗑️ 이전 시각 데이터 삭제 완료`);

      // 3. 새로운 90시간 데이터 저장
      const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6시간 후 만료

      for (const data of processedData) {
        // Google API의 UTC 시간을 KST로 변환
        const { kstDateTime, forecastDate, forecastHour } = convertGoogleDateTimeToKST(data.dateTime);
        const cacheKey = `google_hourly_${latitude}_${longitude}_${clerkUserId}_${kstDateTime.toISOString()}`;

        const dbData: NewGoogleHourlyAirQualityData = {
          clerkUserId,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          locationName: `${latitude}, ${longitude}`,
          forecastDate, // KST 기준 날짜
          forecastHour, // KST 기준 시간
          forecastDateTime: kstDateTime, // KST 기준 DateTime
          pm10: data.pm10,
          pm25: data.pm25,
          caiKr: data.caiKr,
          breezoMeterAqi: data.breezoMeterAqi,
          no2: data.no2,
          o3: data.o3,
          so2: data.so2,
          co: data.co,
          rawData: data.rawData,
          cacheKey,
          expiresAt,
        };

        // Upsert: 기존 데이터 업데이트 또는 신규 삽입
        const existing = await db
          .select()
          .from(googleHourlyAirQualityData)
          .where(eq(googleHourlyAirQualityData.cacheKey, cacheKey))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(googleHourlyAirQualityData)
            .set({ ...dbData, updatedAt: now })
            .where(eq(googleHourlyAirQualityData.cacheKey, cacheKey));
        } else {
          await db.insert(googleHourlyAirQualityData).values(dbData);
        }
      }

      console.log(`✅ 사용자 ${clerkUserId} 90시간 데이터 저장 완료: ${processedData.length}개 항목`);
    } catch (error) {
      console.error(`❌ 사용자 ${clerkUserId} 90시간 데이터 수집 실패:`, error);
      throw error;
    }
  }

  /**
   * 사용자별 저장된 90시간 대기질 데이터 조회 (데이터베이스에서)
   */
  async getStored90HourData(
    clerkUserId: string,
    latitude: number,
    longitude: number
  ): Promise<ProcessedAirQualityData[]> {
    try {
      const now = new Date();
      
      const storedData = await db
        .select()
        .from(googleHourlyAirQualityData)
        .where(
          and(
            eq(googleHourlyAirQualityData.clerkUserId, clerkUserId),
            eq(googleHourlyAirQualityData.latitude, latitude.toString()),
            eq(googleHourlyAirQualityData.longitude, longitude.toString()),
            gte(googleHourlyAirQualityData.forecastDateTime, now)
          )
        )
        .orderBy(googleHourlyAirQualityData.forecastDateTime)
        .limit(90);

      return storedData.map(data => ({
        dateTime: data.forecastDateTime.toISOString(),
        pm10: data.pm10 || undefined,
        pm25: data.pm25 || undefined,
        caiKr: data.caiKr || undefined,
        breezoMeterAqi: data.breezoMeterAqi || undefined,
        no2: data.no2 || undefined,
        o3: data.o3 || undefined,
        so2: data.so2 || undefined,
        co: data.co || undefined,
        rawData: data.rawData,
      }));
    } catch (error) {
      console.error('저장된 90시간 데이터 조회 실패:', error);
      return [];
    }
  }
}

export const googleAirQualityService = new GoogleAirQualityService();
