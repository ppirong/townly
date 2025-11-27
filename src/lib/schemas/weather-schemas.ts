/**
 * 날씨 데이터 Zod 검증 스키마
 * 마스터 규칙: 모든 입력 데이터는 Zod로 검증
 */

import { z } from 'zod';

// ===== 기본 검증 스키마 =====

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const locationSchema = z.object({
  locationName: z.string().min(1).max(255),
  latitude: z.string().regex(/^-?\d+(\.\d+)?$/), // 더 정확한 패턴
  longitude: z.string().regex(/^-?\d+(\.\d+)?$/), // 더 정확한 패턴
  locationKey: z.string().min(1).max(50),
});

// 좌표 전용 스키마 (더 유연함)
export const coordinateLocationSchema = z.object({
  locationName: z.string().min(1).max(255),
  latitude: z.union([
    z.string().regex(/^-?\d+(\.\d+)?$/),
    z.number().transform(n => n.toString())
  ]),
  longitude: z.union([
    z.string().regex(/^-?\d+(\.\d+)?$/),
    z.number().transform(n => n.toString())
  ]),
  locationKey: z.string().min(1).max(50),
});

// ===== 날씨 데이터 입력 스키마 =====

export const hourlyWeatherInputSchema = z.object({
  clerkUserId: z.string().optional().nullable(),
  locationKey: z.string().min(1),
  locationName: z.string().optional().nullable(),
  latitude: z.string(),
  longitude: z.string(),
  forecastDateTime: z.date(),
  forecastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  forecastHour: z.number().min(0).max(23),
  temperature: z.number(),
  conditions: z.string(),
  weatherIcon: z.number().min(1).max(44),
  humidity: z.number().min(0).max(100).optional().default(0),
  precipitation: z.number().min(0).optional().default(0),
  precipitationProbability: z.number().min(0).max(100).optional().default(0),
  rainProbability: z.number().min(0).max(100).optional().default(0),
  windSpeed: z.number().min(0).optional().default(0),
  units: z.enum(['metric', 'imperial']).default('metric'),
  cacheKey: z.string().optional().nullable(),
  expiresAt: z.date(),
});

export const dailyWeatherInputSchema = z.object({
  clerkUserId: z.string().optional().nullable(),
  locationKey: z.string().min(1),
  locationName: z.string().optional().nullable(),
  latitude: z.string(),
  longitude: z.string(),
  forecastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.string().optional().nullable(),
  temperature: z.number(),
  highTemp: z.number(),
  lowTemp: z.number(),
  conditions: z.string(),
  weatherIcon: z.number().min(1).max(44),
  precipitationProbability: z.number().min(0).max(100).optional().default(0),
  rainProbability: z.number().min(0).max(100).optional().default(0),
  units: z.enum(['metric', 'imperial']).default('metric'),
  dayWeather: z.record(z.any()).optional().nullable(),
  nightWeather: z.record(z.any()).optional().nullable(),
  headline: z.string().optional().nullable(),
  forecastDays: z.number().min(1).max(15).default(5),
  rawData: z.record(z.any()).optional().nullable(),
  cacheKey: z.string(),
  expiresAt: z.date(),
});

// ===== API 요청 스키마 =====

export const weatherApiRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  includeUserId: z.boolean().optional().default(false),
  units: z.enum(['metric', 'imperial']).optional().default('metric'),
});

// 내부 함수 호출용 스키마 (좌표 선택적)
export const internalWeatherRequestSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  includeUserId: z.boolean().optional().default(false),
  units: z.enum(['metric', 'imperial']).optional().default('metric'),
});

export const hourlyWeatherApiRequestSchema = weatherApiRequestSchema.extend({
  hours: z.number().min(1).max(168).optional().default(12), // 최대 7일
});

export const dailyWeatherApiRequestSchema = weatherApiRequestSchema.extend({
  days: z.number().min(1).max(15).optional().default(5),
});

// 내부 함수 호출용 스키마
export const internalHourlyWeatherRequestSchema = internalWeatherRequestSchema.extend({
  hours: z.number().min(1).max(168).optional().default(12),
});

export const internalDailyWeatherRequestSchema = internalWeatherRequestSchema.extend({
  days: z.number().min(1).max(15).optional().default(5),
});

// ===== 캐시 관리 스키마 =====

export const cacheKeySchema = z.string().min(1).max(255);

export const cacheClearRequestSchema = z.object({
  type: z.enum(['hourly', 'daily', 'location', 'all']).optional().default('all'),
  olderThan: z.number().min(0).optional(), // 분 단위
  mode: z.enum(['cleanup_only', 'refresh_location']).optional().default('cleanup_only'),
  location: z.string().optional(),
  latitude: z.string().regex(/^-?\d+\.?\d*$/).optional(), // 문자열 형태의 숫자
  longitude: z.string().regex(/^-?\d+\.?\d*$/).optional(), // 문자열 형태의 숫자
}).refine(
  (data) => {
    // refresh_location 모드일 때는 위치 정보가 필수
    if (data.mode === 'refresh_location') {
      return (data.location && data.location.trim()) || 
             (data.latitude !== undefined && data.longitude !== undefined);
    }
    return true;
  },
  {
    message: "refresh_location 모드에서는 location 또는 latitude/longitude가 필요합니다.",
    path: ["location"]
  }
);

// ===== 사용자 데이터 수집 스키마 =====

export const userWeatherCollectionSchema = z.object({
  clerkUserId: z.string().min(1),
  location: z.string().min(1),
  hours: z.number().min(1).max(168).optional().default(12),
  days: z.number().min(1).max(15).optional().default(5),
});

// ===== 응답 스키마 =====

export const weatherStatsResponseSchema = z.object({
  hourlyRecords: z.number().min(0),
  dailyRecords: z.number().min(0),
  locationKeys: z.number().min(0),
});

// ===== 타입 추출 =====

export type CoordinatesInput = z.infer<typeof coordinatesSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type HourlyWeatherInput = z.infer<typeof hourlyWeatherInputSchema>;
export type DailyWeatherInput = z.infer<typeof dailyWeatherInputSchema>;
export type WeatherApiRequest = z.infer<typeof weatherApiRequestSchema>;
export type HourlyWeatherApiRequest = z.infer<typeof hourlyWeatherApiRequestSchema>;
export type DailyWeatherApiRequest = z.infer<typeof dailyWeatherApiRequestSchema>;
export type InternalWeatherRequest = z.infer<typeof internalWeatherRequestSchema>;
export type InternalHourlyWeatherRequest = z.infer<typeof internalHourlyWeatherRequestSchema>;
export type InternalDailyWeatherRequest = z.infer<typeof internalDailyWeatherRequestSchema>;
export type CacheClearRequest = z.infer<typeof cacheClearRequestSchema>;
export type UserWeatherCollection = z.infer<typeof userWeatherCollectionSchema>;
export type WeatherStatsResponse = z.infer<typeof weatherStatsResponseSchema>;
