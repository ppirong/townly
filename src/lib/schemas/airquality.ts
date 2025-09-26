import { z } from 'zod';

/**
 * 에어코리아 API 관련 스키마 정의
 */

// 측정소별 실시간 측정 정보 조회
export const realtimeAirQualitySchema = z.object({
  serviceKey: z.string().describe('공공데이터포털에서 받은 인증키'),
  returnType: z.enum(['json', 'xml']).default('json').describe('xml 또는 json'),
  numOfRows: z.number().min(1).max(100).default(10).describe('한 페이지 결과 수'),
  pageNo: z.number().min(1).default(1).describe('페이지번호'),
  stationName: z.string().describe('측정소 이름'),
  dataTerm: z.enum(['DAILY', 'MONTH', '3MONTH']).describe('요청 데이터기간 (일주일: DAILY, 한달: MONTH, 3달: 3MONTH)'),
  ver: z.enum(['1.0', '1.1', '1.2', '1.3']).default('1.3').describe('버전별 상세 결과 참고'),
});

// 시도별 실시간 측정 정보 조회
export const sidoRealtimeAirQualitySchema = z.object({
  serviceKey: z.string().describe('공공데이터포털에서 받은 인증키'),
  returnType: z.enum(['json', 'xml']).default('json').describe('xml 또는 json'),
  numOfRows: z.number().min(1).max(100).default(10).describe('한 페이지 결과 수'),
  pageNo: z.number().min(1).default(1).describe('페이지번호'),
  sidoName: z.string().describe('시도 이름(전국, 서울, 부산, 대구, 인천, 광주, 대전, 울산, 경기, 강원, 충북, 충남, 전북, 전남, 경북, 경남, 제주, 세종)'),
  ver: z.enum(['1.0', '1.1', '1.2', '1.3']).default('1.3').describe('버전별 상세 결과 참고'),
});

// 근접측정소 목록 조회
export const nearbyStationSchema = z.object({
  serviceKey: z.string().describe('공공데이터포털에서 받은 인증키'),
  returnType: z.enum(['json', 'xml']).default('json').describe('xml 또는 json'),
  tmX: z.number().describe('TM X 좌표'),
  tmY: z.number().describe('TM Y 좌표'),
  ver: z.enum(['1.0', '1.1', '1.2', '1.3']).default('1.3').describe('버전별 상세 결과 참고'),
});

// 에어코리아 API 응답 타입
export const airQualityResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z.object({
      totalCount: z.number(),
      items: z.array(z.object({
        stationName: z.string().nullable().optional(), // 측정소명
        dataTime: z.string().nullable().optional(), // 측정일
        so2Grade: z.string().nullable().optional(), // 아황산가스 지수
        coGrade: z.string().nullable().optional(), // 일산화탄소 지수  
        o3Grade: z.string().nullable().optional(), // 오존 지수
        no2Grade: z.string().nullable().optional(), // 이산화질소 지수
        pm10Grade: z.string().nullable().optional(), // 미세먼지(PM10) 지수
        pm25Grade: z.string().nullable().optional(), // 초미세먼지(PM2.5) 지수
        pm10Value: z.string().nullable().optional(), // 미세먼지(PM10) 농도
        pm25Value: z.string().nullable().optional(), // 초미세먼지(PM2.5) 농도
        khaiGrade: z.string().nullable().optional(), // 통합대기환경지수
        khaiValue: z.string().nullable().optional(), // 통합대기환경수치
        so2Value: z.string().nullable().optional(), // 아황산가스 농도
        coValue: z.string().nullable().optional(), // 일산화탄소 농도
        o3Value: z.string().nullable().optional(), // 오존 농도
        no2Value: z.string().nullable().optional(), // 이산화질소 농도
        sidoName: z.string().nullable().optional(), // 시도명
        mangName: z.string().nullable().optional(), // 측정망 정보
      })),
      pageNo: z.number(),
      numOfRows: z.number(),
    }),
  }),
});

// 근접측정소 목록 조회 응답 스키마
export const nearbyStationResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z.object({
      totalCount: z.number(),
      items: z.array(z.object({
        stationName: z.string().nullable().optional(), // 측정소명
        addr: z.string().nullable().optional(), // 주소
        tm: z.number().nullable().optional(), // 거리(TM)
      })),
      pageNo: z.number(),
      numOfRows: z.number(),
    }),
  }),
});

// TypeScript 타입 추출
export type RealtimeAirQualityRequest = z.infer<typeof realtimeAirQualitySchema>;
export type SidoRealtimeAirQualityRequest = z.infer<typeof sidoRealtimeAirQualitySchema>;
export type NearbyStationRequest = z.infer<typeof nearbyStationSchema>;
export type AirQualityResponse = z.infer<typeof airQualityResponseSchema>;
export type NearbyStationResponse = z.infer<typeof nearbyStationResponseSchema>;
export type AirQualityItem = AirQualityResponse['response']['body']['items'][0];
export type NearbyStationItem = NearbyStationResponse['response']['body']['items'][0];

// 미세먼지 등급 정의
export const airQualityGrade = {
  '1': { label: '좋음', color: 'text-blue-600 bg-blue-50', description: '대기오염 관련 질환자군에서도 영향이 거의 없는 수준' },
  '2': { label: '보통', color: 'text-green-600 bg-green-50', description: '환자군에게 약한 증상이 나타날 수 있는 수준' },
  '3': { label: '나쁨', color: 'text-orange-600 bg-orange-50', description: '환자군에게 증상 악화가 우려되는 수준' },
  '4': { label: '매우나쁨', color: 'text-red-600 bg-red-50', description: '환자군에게 급성 노출시 심각한 영향 우려' },
} as const;

// 미세먼지 농도별 등급 계산 함수
export function getPM10Grade(value: number): keyof typeof airQualityGrade {
  if (value <= 30) return '1';
  if (value <= 80) return '2';  
  if (value <= 150) return '3';
  return '4';
}

export function getPM25Grade(value: number): keyof typeof airQualityGrade {
  if (value <= 15) return '1';
  if (value <= 35) return '2';
  if (value <= 75) return '3';
  return '4';
}

// 미세먼지 주간예보통보 조회 스키마
export const weeklyForecastSchema = z.object({
  serviceKey: z.string().describe('공공데이터포털에서 받은 인증키'),
  returnType: z.enum(['json', 'xml']).default('json').describe('xml 또는 json'),
  searchDate: z.string().describe('조회하고자 하는 날짜 (YYYY-MM-DD)'),
});

// 미세먼지 주간예보 응답 항목 스키마
export const weeklyForecastItemSchema = z.object({
  dataTime: z.string().nullable().optional(), // 통보일시
  informCode: z.string().nullable().optional(), // 통보코드
  informData: z.string().nullable().optional(), // 통보시간
  informOverall: z.string().nullable().optional(), // 대기질 전망
  informCause: z.string().nullable().optional(), // 대기질 전망 원인
  informGrade: z.string().nullable().optional(), // 예보등급
  actionKnack: z.string().nullable().optional(), // 행동요령
  imageUrl1: z.string().nullable().optional(), // 예보이미지1
  imageUrl2: z.string().nullable().optional(), // 예보이미지2
  imageUrl3: z.string().nullable().optional(), // 예보이미지3
  imageUrl4: z.string().nullable().optional(), // 예보이미지4
  imageUrl5: z.string().nullable().optional(), // 예보이미지5
  imageUrl6: z.string().nullable().optional(), // 예보이미지6
  informData1: z.string().nullable().optional(), // 1일후예보
  informData2: z.string().nullable().optional(), // 2일후예보
  informData3: z.string().nullable().optional(), // 3일후예보
  informData4: z.string().nullable().optional(), // 4일후예보
  informData5: z.string().nullable().optional(), // 5일후예보
  informData6: z.string().nullable().optional(), // 6일후예보
  informGrade1: z.string().nullable().optional(), // 1일후등급
  informGrade2: z.string().nullable().optional(), // 2일후등급
  informGrade3: z.string().nullable().optional(), // 3일후등급
  informGrade4: z.string().nullable().optional(), // 4일후등급
  informGrade5: z.string().nullable().optional(), // 5일후등급
  informGrade6: z.string().nullable().optional(), // 6일후등급
});

// 미세먼지 주간예보 응답 스키마
export const weeklyForecastResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z.object({
      totalCount: z.number(),
      items: z.array(weeklyForecastItemSchema),
      pageNo: z.number(),
      numOfRows: z.number(),
    }),
  }),
});

// 처리된 주간예보 데이터 스키마
export const processedWeeklyForecastSchema = z.object({
  dataTime: z.string(), // 통보일시
  informCode: z.string(), // 통보코드 (PM10, PM25 등)
  informData: z.string(), // 통보시간
  informOverall: z.string(), // 대기질 전망
  informCause: z.string().optional(), // 대기질 전망 원인
  actionKnack: z.string().optional(), // 행동요령
  dailyForecasts: z.array(z.object({
    date: z.string(), // 예보 날짜
    grade: z.string(), // 예보 등급
    description: z.string().optional(), // 예보 설명
  })),
  imageUrls: z.array(z.string()).optional(), // 예보 이미지들
});

// 시간별 대기예보 스키마 (좋음/나쁨 등급 정보)
export const hourlyForecastSchema = z.object({
  serviceKey: z.string().describe('공공데이터포털에서 받은 인증키'),
  returnType: z.enum(['json', 'xml']).default('json').describe('xml 또는 json'),
  searchDate: z.string().describe('조회하고자 하는 날짜 (YYYY-MM-DD)'),
});

// 시간별 대기예보 응답 항목 스키마
export const hourlyForecastItemSchema = z.object({
  dataTime: z.string().nullable().optional(), // 통보일시
  informCode: z.string().nullable().optional(), // 통보코드 (PM10, PM25)
  informData: z.string().nullable().optional(), // 예보 날짜 정보
  informGrade: z.string().nullable().optional(), // 지역별 예보등급 (좋음, 보통, 나쁨, 매우나쁨)
  informOverall: z.string().nullable().optional(), // 대기질 전망
  informCause: z.string().nullable().optional(), // 대기질 전망 원인
});

// 시간별 대기예보 응답 스키마
export const hourlyForecastResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z.object({
      totalCount: z.number(),
      items: z.array(hourlyForecastItemSchema),
      pageNo: z.number(),
      numOfRows: z.number(),
    }),
  }),
});

// 처리된 시간별 예보 데이터 스키마
export const processedHourlyForecastSchema = z.object({
  dataTime: z.string(), // 통보일시
  informCode: z.string(), // 통보코드 (PM10, PM25)
  informData: z.string(), // 예보 날짜
  informGrade: z.string(), // 예보등급
  informOverall: z.string().optional(), // 대기질 전망
  informCause: z.string().optional(), // 대기질 전망 원인
  forecastDate: z.string(), // 예보 대상 날짜
  gradeInfo: z.object({
    label: z.string(),
    color: z.string(),
    description: z.string(),
  }),
});

// 미세먼지 일별예보 조회 스키마 (getMinuDustFrcstDspth)
export const dailyForecastSchema = z.object({
  serviceKey: z.string().describe('공공데이터포털에서 받은 인증키'),
  returnType: z.enum(['json', 'xml']).default('json').describe('xml 또는 json'),
  searchDate: z.string().describe('조회하고자 하는 날짜 (YYYY-MM-DD)'),
});

// 미세먼지 일별예보 응답 항목 스키마
export const dailyForecastItemSchema = z.object({
  dataTime: z.string().nullable().optional(), // 통보일시
  informCode: z.string().nullable().optional(), // 통보코드 (PM10, PM25)
  informData: z.string().nullable().optional(), // 예보날짜 및 정보
  informGrade: z.string().nullable().optional(), // 지역별 예보등급 (서울: 나쁨, 제주: 나쁨 형태)
  informOverall: z.string().nullable().optional(), // 대기질 전망
  informCause: z.string().nullable().optional(), // 대기질 전망 원인
  actionKnack: z.string().nullable().optional(), // 행동요령
});

// 미세먼지 일별예보 응답 스키마
export const dailyForecastResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z.object({
      totalCount: z.number(),
      items: z.array(dailyForecastItemSchema),
      pageNo: z.number(),
      numOfRows: z.number(),
    }),
  }),
});

// 처리된 일별예보 데이터 스키마
export const processedDailyForecastSchema = z.object({
  dataTime: z.string(), // 통보일시
  informCode: z.string(), // 통보코드 (PM10, PM25)
  informData: z.string(), // 예보날짜
  informGrade: z.string(), // 예보등급
  informOverall: z.string().optional(), // 대기질 전망
  informCause: z.string().optional(), // 대기질 전망 원인
  actionKnack: z.string().optional(), // 행동요령
  forecastDate: z.string(), // 예보 대상 날짜
  gradeInfo: z.object({
    label: z.string(),
    color: z.string(),
    description: z.string(),
  }),
});

// 미세먌지 주간예보 확장 스키마 (getMinuDustWeekFrcstDspth)
export const extendedWeeklyForecastItemSchema = z.object({
  dataTime: z.string().nullable().optional(), // 통보일시
  informCode: z.string().nullable().optional(), // 통보코드
  informData: z.string().nullable().optional(), // 통보시간
  informOverall: z.string().nullable().optional(), // 대기질 전망
  informCause: z.string().nullable().optional(), // 대기질 전망 원인
  informGrade: z.string().nullable().optional(), // 예보등급
  actionKnack: z.string().nullable().optional(), // 행동요령
  
  // 주간예보 고유 필드들
  frcstOneDt: z.string().nullable().optional(), // 오늘+3일 날짜
  frcstTwoDt: z.string().nullable().optional(), // 오늘+4일 날짜
  frcstThreeDt: z.string().nullable().optional(), // 오늘+5일 날짜
  frcstFourDt: z.string().nullable().optional(), // 오늘+6일 날짜
  
  frcstOneCn: z.string().nullable().optional(), // 오늘+3일 대기질 정보
  frcstTwoCn: z.string().nullable().optional(), // 오늘+4일 대기질 정보
  frcstThreeCn: z.string().nullable().optional(), // 오늘+5일 대기질 정보
  frcstFourCn: z.string().nullable().optional(), // 오늘+6일 대기질 정보
  
  // 이미지 URL들
  imageUrl1: z.string().nullable().optional(),
  imageUrl2: z.string().nullable().optional(),
  imageUrl3: z.string().nullable().optional(),
  imageUrl4: z.string().nullable().optional(),
  imageUrl5: z.string().nullable().optional(),
  imageUrl6: z.string().nullable().optional(),
});

// 확장된 주간예보 응답 스키마
export const extendedWeeklyForecastResponseSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
    body: z.object({
      totalCount: z.number(),
      items: z.array(extendedWeeklyForecastItemSchema),
      pageNo: z.number(),
      numOfRows: z.number(),
    }),
  }),
});

// 7일간 통합 대기질 예보 스키마
export const sevenDayForecastSchema = z.object({
  forecastDate: z.string(), // 예보 날짜 (YYYY-MM-DD)
  dayOffset: z.number(), // 오늘 기준 날짜 차이 (0=오늘, 1=내일, ...)
  pm10Grade: z.string().optional(), // PM10 등급
  pm25Grade: z.string().optional(), // PM2.5 등급
  pm10RegionalInfo: z.string().optional(), // PM10 지역별 정보
  pm25RegionalInfo: z.string().optional(), // PM2.5 지역별 정보
  gradeInfo: z.object({
    label: z.string(),
    color: z.string(),
    description: z.string(),
  }),
  source: z.enum(['daily', 'weekly']), // 데이터 출처
});

// TypeScript 타입 추출
export type WeeklyForecastRequest = z.infer<typeof weeklyForecastSchema>;
export type WeeklyForecastResponse = z.infer<typeof weeklyForecastResponseSchema>;
export type WeeklyForecastItem = z.infer<typeof weeklyForecastItemSchema>;
export type ProcessedWeeklyForecast = z.infer<typeof processedWeeklyForecastSchema>;

export type HourlyForecastRequest = z.infer<typeof hourlyForecastSchema>;
export type HourlyForecastResponse = z.infer<typeof hourlyForecastResponseSchema>;
export type HourlyForecastItem = z.infer<typeof hourlyForecastItemSchema>;
export type ProcessedHourlyForecast = z.infer<typeof processedHourlyForecastSchema>;

export type DailyForecastRequest = z.infer<typeof dailyForecastSchema>;
export type DailyForecastResponse = z.infer<typeof dailyForecastResponseSchema>;
export type DailyForecastItem = z.infer<typeof dailyForecastItemSchema>;
export type ProcessedDailyForecast = z.infer<typeof processedDailyForecastSchema>;

export type ExtendedWeeklyForecastResponse = z.infer<typeof extendedWeeklyForecastResponseSchema>;
export type ExtendedWeeklyForecastItem = z.infer<typeof extendedWeeklyForecastItemSchema>;

export type SevenDayForecast = z.infer<typeof sevenDayForecastSchema>;
