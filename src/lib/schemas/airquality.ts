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
