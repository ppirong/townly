/**
 * 날씨 데이터 DTO 매퍼
 * 마스터 규칙: DB 타입을 클라이언트로 직접 전달 금지, 반드시 DTO 매퍼 사용
 */

import type { 
  HourlyWeatherData as DBHourlyWeatherData,
  DailyWeatherData as DBDailyWeatherData,
  WeatherLocationKey as DBWeatherLocationKey
} from '@/db/schema';

// ===== 안전 변환 유틸리티 =====

/**
 * 날짜를 안전하게 ISO 문자열로 변환
 */
export function toISOString(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return new Date(date).toISOString();
  return date.toISOString();
}

/**
 * 날짜를 안전하게 ISO 문자열로 변환 (null 허용)
 */
export function toISOStringOrNull(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return new Date(date).toISOString();
  return date.toISOString();
}

/**
 * 숫자를 안전하게 변환
 */
export function toSafeNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * 배열을 안전하게 변환
 */
export function toSafeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  return [];
}

/**
 * 객체를 안전하게 변환
 */
export function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

// ===== 클라이언트 DTO 타입 정의 =====

export interface ClientHourlyWeatherData {
  id: string;
  clerkUserId: string | null;
  locationKey: string;
  locationName: string | null;
  latitude: string;
  longitude: string;
  forecastDatetime: string;
  forecastDate: string;
  forecastHour: number;
  temperature: number;
  conditions: string;
  weatherIcon: number;
  humidity: number;
  precipitation: number;
  precipitationProbability: number;
  rainProbability: number;
  windSpeed: number;
  units: string;
  cacheKey: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface ClientDailyWeatherData {
  id: string;
  clerkUserId: string | null;
  locationKey: string;
  locationName: string | null;
  latitude: string;
  longitude: string;
  forecastDate: string;
  dayOfWeek: string;
  temperature: number;
  highTemp: number;
  lowTemp: number;
  conditions: string;
  weatherIcon: number;
  precipitationProbability: number;
  rainProbability: number;
  units: string;
  dayWeather: Record<string, unknown> | null;
  nightWeather: Record<string, unknown> | null;
  headline: Record<string, unknown> | null;
  forecastDays: number;
  rawData: Record<string, unknown> | null;
  cacheKey: string;
  expiresAt: string;
  createdAt: string;
}

export interface ClientWeatherLocationKey {
  id: string;
  locationName: string | null;
  latitude: string | null;
  longitude: string | null;
  locationKey: string;
  localizedName: string | null;
  countryCode: string | null;
  administrativeArea: string | null;
  searchType: string;
  rawLocationData: Record<string, unknown> | null;
  cacheKey: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// ===== DTO 매퍼 함수들 =====

/**
 * DB 시간별 날씨 데이터를 클라이언트 DTO로 변환
 */
export function mapHourlyWeatherForClient(db: DBHourlyWeatherData): ClientHourlyWeatherData {
  return {
    id: db.id,
    clerkUserId: db.clerkUserId,
    locationKey: db.locationKey,
    locationName: db.locationName,
    latitude: db.latitude || '',
    longitude: db.longitude || '',
    forecastDatetime: toISOString(db.forecastDatetime),
    forecastDate: db.forecastDate,
    forecastHour: toSafeNumber(db.forecastHour),
    temperature: toSafeNumber(db.temperature),
    conditions: db.conditions || '',
    weatherIcon: toSafeNumber(db.weatherIcon),
    humidity: toSafeNumber(db.humidity),
    precipitation: toSafeNumber(db.precipitation),
    precipitationProbability: toSafeNumber(db.precipitationProbability),
    rainProbability: toSafeNumber(db.rainProbability),
    windSpeed: toSafeNumber(db.windSpeed),
    units: db.units || 'metric',
    cacheKey: db.cacheKey,
    expiresAt: toISOString(db.expiresAt),
    createdAt: toISOString(db.createdAt),
  };
}

/**
 * DB 일별 날씨 데이터를 클라이언트 DTO로 변환
 */
export function mapDailyWeatherForClient(db: DBDailyWeatherData): ClientDailyWeatherData {
  return {
    id: db.id,
    clerkUserId: db.clerkUserId,
    locationKey: db.locationKey,
    locationName: db.locationName,
    latitude: db.latitude || '',
    longitude: db.longitude || '',
    forecastDate: db.forecastDate,
    dayOfWeek: db.dayOfWeek || '',
    temperature: toSafeNumber(db.temperature),
    highTemp: toSafeNumber(db.highTemp),
    lowTemp: toSafeNumber(db.lowTemp),
    conditions: db.conditions || '',
    weatherIcon: toSafeNumber(db.weatherIcon),
    precipitationProbability: toSafeNumber(db.precipitationProbability),
    rainProbability: toSafeNumber(db.rainProbability),
    units: db.units || 'metric',
    dayWeather: toRecord(db.dayWeather),
    nightWeather: toRecord(db.nightWeather),
    headline: toRecord(db.headline),
    forecastDays: toSafeNumber(db.forecastDays),
    rawData: toRecord(db.rawData),
    cacheKey: db.cacheKey || '',
    expiresAt: toISOString(db.expiresAt),
    createdAt: toISOString(db.createdAt),
  };
}

/**
 * DB 위치 키를 클라이언트 DTO로 변환
 */
export function mapLocationKeyForClient(db: DBWeatherLocationKey): ClientWeatherLocationKey {
  return {
    id: db.id,
    locationName: db.locationName,
    latitude: db.latitude || '',
    longitude: db.longitude || '',
    locationKey: db.locationKey,
    localizedName: db.localizedName,
    countryCode: db.countryCode,
    administrativeArea: db.administrativeArea,
    searchType: db.searchType,
    rawLocationData: toRecord(db.rawLocationData),
    cacheKey: db.cacheKey,
    expiresAt: toISOString(db.expiresAt),
    createdAt: toISOString(db.createdAt),
    updatedAt: toISOString(db.updatedAt),
  };
}

/**
 * 배열을 안전하게 매핑
 */
export function mapArraySafely<T, U>(
  array: T[] | null | undefined, 
  mapFn: (item: T) => U
): U[] {
  if (!Array.isArray(array)) return [];
  return array.map(mapFn);
}

// ===== 캐시 통계 DTO =====

export interface ClientCacheStats {
  hourlyRecords: number;
  dailyRecords: number;
  locationKeys: number;
}

export function mapCacheStatsForClient(stats: {
  hourlyRecords: number;
  dailyRecords: number;
  locationKeys: number;
}): ClientCacheStats {
  return {
    hourlyRecords: toSafeNumber(stats.hourlyRecords),
    dailyRecords: toSafeNumber(stats.dailyRecords),
    locationKeys: toSafeNumber(stats.locationKeys),
  };
}
