import { z } from 'zod';

/**
 * 지역별 시간별/일별 대기질 정보 스키마
 */

// 지역별 대기질 기본 정보
export const regionalAirQualityBaseSchema = z.object({
  regionCode: z.string(), // 지역 코드 (seoul, gyeonggi_north, incheon 등)
  regionName: z.string(), // 지역명 (서울, 경기 북부, 인천 등)
  sidoName: z.string(), // API 호출용 시도명
  dataTime: z.string(), // 측정 시간
  
  // 대기질 지수
  khaiValue: z.string().optional(), // 통합대기환경지수
  khaiGrade: z.string().optional(), // 통합대기환경등급
  
  // 미세먼지
  pm10Value: z.string().optional(), // 미세먼지 농도
  pm10Grade: z.string().optional(), // 미세먼지 등급
  
  // 초미세먼지
  pm25Value: z.string().optional(), // 초미세먼지 농도
  pm25Grade: z.string().optional(), // 초미세먼지 등급
  
  // 오존
  o3Value: z.string().optional(), // 오존 농도
  o3Grade: z.string().optional(), // 오존 등급
  
  // 이산화질소
  no2Value: z.string().optional(), // 이산화질소 농도
  no2Grade: z.string().optional(), // 이산화질소 등급
  
  // 일산화탄소
  coValue: z.string().optional(), // 일산화탄소 농도
  coGrade: z.string().optional(), // 일산화탄소 등급
  
  // 아황산가스
  so2Value: z.string().optional(), // 아황산가스 농도
  so2Grade: z.string().optional(), // 아황산가스 등급
});

// 시간별 지역 대기질 정보
export const hourlyRegionalAirQualitySchema = regionalAirQualityBaseSchema.extend({
  type: z.literal('hourly'),
  hour: z.number().min(0).max(23), // 시간 (0-23)
  date: z.string(), // 날짜 (YYYY-MM-DD)
});

// 일별 지역 대기질 정보
export const dailyRegionalAirQualitySchema = regionalAirQualityBaseSchema.extend({
  type: z.literal('daily'),
  date: z.string(), // 날짜 (YYYY-MM-DD)
  
  // 일별 통계 (평균, 최대, 최소)
  pm10Avg: z.string().optional(), // 미세먼지 평균
  pm10Max: z.string().optional(), // 미세먼지 최대
  pm10Min: z.string().optional(), // 미세먼지 최소
  
  pm25Avg: z.string().optional(), // 초미세먼지 평균
  pm25Max: z.string().optional(), // 초미세먼지 최대
  pm25Min: z.string().optional(), // 초미세먼지 최소
  
  o3Avg: z.string().optional(), // 오존 평균
  o3Max: z.string().optional(), // 오존 최대
  o3Min: z.string().optional(), // 오존 최소
});

// 지역별 대기질 요청 파라미터
export const regionalAirQualityRequestSchema = z.object({
  regionCode: z.string(),
  type: z.enum(['hourly', 'daily']),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string().optional(), // YYYY-MM-DD (기본값: startDate)
  numOfRows: z.number().optional().default(24), // 결과 수
});

// 지역별 대기질 응답
export const regionalAirQualityResponseSchema = z.object({
  regionCode: z.string(),
  regionName: z.string(),
  type: z.enum(['hourly', 'daily']),
  data: z.array(z.union([hourlyRegionalAirQualitySchema, dailyRegionalAirQualitySchema])),
  metadata: z.object({
    totalCount: z.number(),
    requestedAt: z.string(),
    dataSource: z.string().default('airkorea'),
  }),
});

// 지역별 대기질 캐시 키 생성
export const generateRegionalCacheKey = (
  regionCode: string, 
  type: 'hourly' | 'daily', 
  date: string
): string => {
  return `regional_air_${regionCode}_${type}_${date}`;
};

// TypeScript 타입 추출
export type RegionalAirQualityBase = z.infer<typeof regionalAirQualityBaseSchema>;
export type HourlyRegionalAirQuality = z.infer<typeof hourlyRegionalAirQualitySchema>;
export type DailyRegionalAirQuality = z.infer<typeof dailyRegionalAirQualitySchema>;
export type RegionalAirQualityRequest = z.infer<typeof regionalAirQualityRequestSchema>;
export type RegionalAirQualityResponse = z.infer<typeof regionalAirQualityResponseSchema>;

// 대기질 등급 매핑
export const AIR_QUALITY_GRADES = {
  '1': { label: '좋음', color: '#1f77b4', bgColor: '#e3f2fd' },
  '2': { label: '보통', color: '#ff7f0e', bgColor: '#fff3e0' },
  '3': { label: '나쁨', color: '#d62728', bgColor: '#ffebee' },
  '4': { label: '매우나쁨', color: '#8b0000', bgColor: '#f3e5f5' },
} as const;

// 지역별 대기질 등급 해석
export function getAirQualityGradeInfo(grade: string | undefined) {
  if (!grade || !AIR_QUALITY_GRADES[grade as keyof typeof AIR_QUALITY_GRADES]) {
    return { label: '정보없음', color: '#666666', bgColor: '#f5f5f5' };
  }
  return AIR_QUALITY_GRADES[grade as keyof typeof AIR_QUALITY_GRADES];
}

// 지역별 주요 대기질 지표 추출
export function extractMainAirQualityIndicators(data: RegionalAirQualityBase) {
  return {
    khai: data.khaiValue ? {
      value: data.khaiValue,
      grade: data.khaiGrade,
      gradeInfo: getAirQualityGradeInfo(data.khaiGrade)
    } : null,
    
    pm10: data.pm10Value ? {
      value: data.pm10Value,
      grade: data.pm10Grade,
      gradeInfo: getAirQualityGradeInfo(data.pm10Grade)
    } : null,
    
    pm25: data.pm25Value ? {
      value: data.pm25Value,
      grade: data.pm25Grade,
      gradeInfo: getAirQualityGradeInfo(data.pm25Grade)
    } : null,
    
    o3: data.o3Value ? {
      value: data.o3Value,
      grade: data.o3Grade,
      gradeInfo: getAirQualityGradeInfo(data.o3Grade)
    } : null,
  };
}
