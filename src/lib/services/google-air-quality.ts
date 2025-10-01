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
import { eq, and, gte, lte } from 'drizzle-orm';

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
  hours?: number; // 1-96 시간
}

export interface GoogleDailyAirQualityRequest extends GoogleAirQualityRequest {
  days?: number; // 1-7 일
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
          ...(request.includeLocalAqi ? ['LOCAL_AQI'] : []),
          ...(request.includeDominantPollutant ? ['DOMINANT_POLLUTANT'] : []),
          ...(request.includeHealthSuggestion ? ['HEALTH_RECOMMENDATIONS'] : []),
        ],
        languageCode: request.languageCode || 'ko',
      };

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
        await this.logApiCall('/currentConditions:lookup', response.status, responseTime, false, request.clerkUserId, errorText);
        throw new Error(`Google Air Quality API 오류: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
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
   * 시간별 대기질 예보 조회
   */
  async getHourlyForecast(request: GoogleHourlyAirQualityRequest): Promise<GoogleHourlyAirQualityResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🌬️ Google Air Quality API 시간별 예보 조회 시작: ${request.latitude}, ${request.longitude}`);
      
      if (!this.apiKey) {
        throw new Error('Google Maps API 키가 설정되지 않았습니다.');
      }

      const requestBody = {
        location: {
          latitude: request.latitude,
          longitude: request.longitude,
        },
        period: {
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + (request.hours || 12) * 60 * 60 * 1000).toISOString(),
        },
        extraComputations: [
          ...(request.includeLocalAqi ? ['LOCAL_AQI'] : []),
          ...(request.includeDominantPollutant ? ['DOMINANT_POLLUTANT'] : []),
          ...(request.includeHealthSuggestion ? ['HEALTH_RECOMMENDATIONS'] : []),
        ],
        languageCode: request.languageCode || 'ko',
      };

      const response = await fetch(`${this.baseUrl}/forecast:lookup?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        await this.logApiCall('/forecast:lookup', response.status, responseTime, false, request.clerkUserId, errorText);
        throw new Error(`Google Air Quality API 오류: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      await this.logApiCall('/forecast:lookup', response.status, responseTime, true, request.clerkUserId);

      console.log(`✅ Google Air Quality API 시간별 예보 조회 완료 (${responseTime}ms)`);
      return data;
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
    data.pollutants?.forEach(pollutant => {
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

    // 대기질 지수 추출
    data.indexes?.forEach(index => {
      switch (index.aqiDisplay) {
        case 'KR':
          processed.caiKr = index.aqi;
          break;
        case 'BreezoMeter':
          processed.breezoMeterAqi = index.aqi;
          break;
      }
    });

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
        const forecastDateTime = new Date(data.dateTime);
        const cacheKey = `google_hourly_${request.latitude}_${request.longitude}_${forecastDateTime.toISOString()}`;

        const dbData: NewGoogleHourlyAirQualityData = {
          clerkUserId: request.clerkUserId,
          latitude: request.latitude.toString(),
          longitude: request.longitude.toString(),
          locationName: `${request.latitude}, ${request.longitude}`,
          forecastDate: forecastDateTime.toISOString().split('T')[0],
          forecastHour: forecastDateTime.getHours(),
          forecastDateTime,
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
      const processedData = apiResponse.hourlyForecasts.map(data => this.processAirQualityData(data));

      // 4. 새로운 데이터를 데이터베이스에 저장
      await this.saveHourlyAirQualityData(processedData, request);

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
   * 일별 대기질 예보를 위한 데이터 집계
   */
  async getDailyAirQualityWithTTL(request: GoogleDailyAirQualityRequest): Promise<ProcessedAirQualityData[]> {
    try {
      const days = request.days || 7;
      const dailyData: ProcessedAirQualityData[] = [];

      for (let i = 0; i < days; i++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + i);
        
        // 해당 날짜의 시간별 데이터를 가져와서 일 평균 계산
        const hourlyRequest: GoogleHourlyAirQualityRequest = {
          ...request,
          hours: 24,
        };

        const hourlyData = await this.getHourlyAirQualityWithTTL(hourlyRequest);
        
        // 해당 날짜의 데이터만 필터링
        const dayData = hourlyData.filter(data => {
          const dataDate = new Date(data.dateTime);
          return dataDate.toDateString() === targetDate.toDateString();
        });

        if (dayData.length > 0) {
          // 일 평균 계산
          const avgData: ProcessedAirQualityData = {
            dateTime: targetDate.toISOString(),
            pm10: this.calculateAverage(dayData.map(d => d.pm10).filter((val): val is number => typeof val === 'number')),
            pm25: this.calculateAverage(dayData.map(d => d.pm25).filter((val): val is number => typeof val === 'number')),
            caiKr: this.calculateAverage(dayData.map(d => d.caiKr).filter((val): val is number => typeof val === 'number')),
            breezoMeterAqi: this.calculateAverage(dayData.map(d => d.breezoMeterAqi).filter((val): val is number => typeof val === 'number')),
            no2: this.calculateAverage(dayData.map(d => d.no2).filter((val): val is number => typeof val === 'number')),
            o3: this.calculateAverage(dayData.map(d => d.o3).filter((val): val is number => typeof val === 'number')),
            so2: this.calculateAverage(dayData.map(d => d.so2).filter((val): val is number => typeof val === 'number')),
            co: this.calculateAverage(dayData.map(d => d.co).filter((val): val is number => typeof val === 'number')),
            rawData: { dailyAverage: true, hourlyDataCount: dayData.length },
          };

          dailyData.push(avgData);
        }
      }

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
            eq(apiCallLogs.apiProvider, 'google_air_quality'),
            eq(apiCallLogs.callDate, targetDate)
          )
        );

      const totalCalls = stats.length;
      const successfulCalls = stats.filter(s => s.isSuccessful).length;
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
}

export const googleAirQualityService = new GoogleAirQualityService();
