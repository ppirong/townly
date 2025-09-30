import { z } from 'zod';

/**
 * 날씨 요약 요청 스키마
 */
export const weatherSummaryRequestSchema = z.object({
  location: z.string().min(1, '위치는 필수입니다'),
  startDateTime: z.date(),
  endDateTime: z.date(),
  includeHourlyForecast: z.boolean().default(true),
  includeDailyForecast: z.boolean().default(true),
  timeOfDay: z.enum(['morning', 'evening']).default('morning'),
  currentMonth: z.number().min(1).max(12), // 1-12월
});

export type WeatherSummaryRequest = z.infer<typeof weatherSummaryRequestSchema>;

/**
 * AI 날씨 요약 응답 스키마 (새로운 간소화 형식)
 */
export const weatherSummaryResponseSchema = z.object({
  summary: z.string(), // 기온과 날씨상태만 포함 (1문장)
  temperatureRange: z.string(), // "15°C ~ 24°C"
  precipitationInfo: z.string(), // 강수 시간별 정보 또는 계절에 따라 "비가 오지 않습니다." 또는 "눈이 오지 않습니다."
  warnings: z.array(z.string()), // 구체적인 주의사항들
  alertLevel: z.enum(['low', 'medium', 'high']),
  forecastPeriod: z.string(),
  generatedAt: z.date(),
  
  // 이전 버전과의 호환성을 위해 유지
  keyPoints: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
});

export type WeatherSummaryResponse = z.infer<typeof weatherSummaryResponseSchema>;

/**
 * 날씨 데이터 입력 스키마
 */
export const weatherDataInputSchema = z.object({
  hourlyForecasts: z.array(z.object({
    dateTime: z.date(),
    temperature: z.number(),
    conditions: z.string(),
    precipitationProbability: z.number().min(0).max(100),
    rainProbability: z.number().min(0).max(100).optional(),
    windSpeed: z.number().min(0),
    humidity: z.number().min(0).max(100),
  })).optional(),
  
  dailyForecasts: z.array(z.object({
    date: z.string(), // YYYY-MM-DD 형식
    dayOfWeek: z.string(),
    highTemp: z.number(),
    lowTemp: z.number(),
    conditions: z.string(),
    precipitationProbability: z.number().min(0).max(100),
    rainProbability: z.number().min(0).max(100).optional(),
  })).optional(),
});

export type WeatherDataInput = z.infer<typeof weatherDataInputSchema>;

