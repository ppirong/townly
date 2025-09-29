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
 * AI 날씨 요약 응답 스키마
 */
export const weatherSummaryResponseSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  recommendations: z.array(z.string()),
  alertLevel: z.enum(['low', 'medium', 'high']),
  forecastPeriod: z.string(),
  generatedAt: z.date(),
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

