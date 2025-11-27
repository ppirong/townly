/**
 * 대기질 서비스 전용 설정
 */

import { getConfig } from './index';

export interface AirQualityServiceConfig {
  // API 설정
  api: {
    timeout: number;
    maxRetries: number;
    retryDelay: number;
    batchSize: number;
  };
  
  // 캐싱 설정
  cache: {
    currentAirQuality: number; // 현재 대기질 캐시 시간 (초)
    hourlyForecast: number;    // 시간별 예보 캐시 시간 (초)
    dailyForecast: number;     // 일별 예보 캐시 시간 (초)
    weeklyForecast: number;    // 주간 예보 캐시 시간 (초)
  };
  
  // 데이터 수집 설정
  collection: {
    maxHours: number;          // 최대 수집 시간 (시간)
    maxDays: number;           // 최대 수집 일수
    batchInterval: number;     // 배치 수집 간격 (밀리초)
  };
  
  // 로깅 설정
  logging: {
    enableApiLogs: boolean;
    enablePerformanceLogs: boolean;
    enableErrorLogs: boolean;
  };
}

/**
 * 대기질 서비스 설정 가져오기
 */
export function getAirQualityConfig(): AirQualityServiceConfig {
  const baseConfig = getConfig();
  
  return {
    api: {
      timeout: baseConfig.externalApis.google.timeout,
      maxRetries: baseConfig.airQuality.maxRetries,
      retryDelay: baseConfig.airQuality.retryDelay,
      batchSize: baseConfig.airQuality.batchSize,
    },
    cache: {
      currentAirQuality: Math.min(baseConfig.airQuality.cacheTimeout, 300), // 최대 5분
      hourlyForecast: baseConfig.airQuality.cacheTimeout,
      dailyForecast: baseConfig.airQuality.cacheTimeout * 2, // 2배 더 오래 캐시
      weeklyForecast: baseConfig.airQuality.cacheTimeout * 4, // 4배 더 오래 캐시
    },
    collection: {
      maxHours: 90, // Google API 제한
      maxDays: 7,   // 일주일
      batchInterval: 1000, // 1초 간격
    },
    logging: {
      enableApiLogs: baseConfig.logging.level === 'debug',
      enablePerformanceLogs: baseConfig.logging.level === 'debug' || baseConfig.logging.level === 'info',
      enableErrorLogs: true, // 항상 에러 로그는 활성화
    },
  };
}

/**
 * API 사용량 제한 확인
 */
export function checkApiRateLimit(apiProvider: 'google' | 'accuWeather', requestCount: number): boolean {
  const config = getConfig();
  const limits = config.externalApis[apiProvider].rateLimit;
  
  // 실제 구현에서는 Redis나 메모리 캐시를 사용하여 요청 수를 추적해야 함
  // 여기서는 기본적인 검증만 수행
  return requestCount < limits.requestsPerMinute;
}

/**
 * 캐시 키 생성
 */
export function generateCacheKey(
  type: 'current' | 'hourly' | 'daily' | 'weekly',
  latitude: number,
  longitude: number,
  additionalParams?: Record<string, any>
): string {
  const baseKey = `airquality:${type}:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
  
  if (additionalParams) {
    const paramString = Object.entries(additionalParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join(':');
    return `${baseKey}:${paramString}`;
  }
  
  return baseKey;
}

/**
 * TTL 계산 (Time To Live)
 */
export function calculateTtl(dataType: 'current' | 'hourly' | 'daily' | 'weekly'): number {
  const config = getAirQualityConfig();
  
  switch (dataType) {
    case 'current':
      return config.cache.currentAirQuality;
    case 'hourly':
      return config.cache.hourlyForecast;
    case 'daily':
      return config.cache.dailyForecast;
    case 'weekly':
      return config.cache.weeklyForecast;
    default:
      return config.cache.currentAirQuality;
  }
}

/**
 * 재시도 로직 설정
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export function getRetryConfig(): RetryConfig {
  const config = getAirQualityConfig();
  
  return {
    maxRetries: config.api.maxRetries,
    baseDelay: config.api.retryDelay,
    maxDelay: config.api.retryDelay * 10, // 최대 10배
    backoffFactor: 2, // 지수 백오프
  };
}

/**
 * 배치 처리 설정
 */
export interface BatchConfig {
  size: number;
  interval: number;
  maxConcurrent: number;
}

export function getBatchConfig(): BatchConfig {
  const config = getAirQualityConfig();
  
  return {
    size: config.api.batchSize,
    interval: config.collection.batchInterval,
    maxConcurrent: Math.max(1, Math.floor(config.api.batchSize / 2)),
  };
}
