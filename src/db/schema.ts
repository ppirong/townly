import { pgTable, text, timestamp, uuid, boolean, jsonb, integer } from 'drizzle-orm/pg-core';

// 카카오 채널로 받은 메시지들을 저장하는 테이블
export const kakaoMessages = pgTable('kakao_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 카카오톡 사용자 정보
  userKey: text('user_key').notNull(), // 카카오에서 제공하는 사용자 식별키
  
  // 메시지 내용
  message: text('message').notNull(), // 사용자가 보낸 메시지 내용
  messageType: text('message_type').default('text'), // 메시지 타입 (text, image, etc.)
  
  // AI 응답 정보
  aiResponse: text('ai_response'), // ChatGPT가 생성한 응답
  responseType: text('response_type').default('chatgpt'), // 응답 타입 (chatgpt, fallback, error)
  processingTime: text('processing_time'), // AI 응답 생성 시간 (ms)
  
  // 카카오 채널 정보
  channelId: text('channel_id').notNull().default('68bef0501c4ef66e4f5d73be'), // 카카오 챗봇 ID
  
  // 시간 정보
  receivedAt: timestamp('received_at').defaultNow().notNull(), // 메시지 수신 시간
  
  // 추가 메타데이터
  rawData: jsonb('raw_data'), // 카카오에서 받은 원본 데이터
  
  // 관리자 확인 여부
  isRead: boolean('is_read').default(false), // 관리자가 확인했는지 여부
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 관리자 응답 메시지 (향후 확장용)
export const kakaoResponses = pgTable('kakao_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 연결된 메시지
  messageId: uuid('message_id').references(() => kakaoMessages.id).notNull(),
  
  // 응답 내용
  response: text('response').notNull(),
  responseType: text('response_type').default('text'),
  
  // 관리자 정보 (Clerk userId)
  adminUserId: text('admin_user_id').notNull(),
  
  // 전송 정보
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  isSuccessful: boolean('is_successful').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 웹훅 디버깅 정보를 저장하는 테이블
export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 요청 정보
  method: text('method').notNull(), // GET, POST
  url: text('url').notNull(), // 요청된 URL
  userAgent: text('user_agent'), // User-Agent 헤더
  
  // 요청 본문 및 헤더
  requestBody: text('request_body'), // 요청 본문 (JSON 등)
  requestHeaders: jsonb('request_headers'), // 요청 헤더들
  
  // 응답 정보
  statusCode: text('status_code').notNull(), // 응답 상태 코드
  responseBody: text('response_body'), // 응답 본문
  
  // 처리 정보
  processingTime: text('processing_time'), // 처리 시간 (ms)
  errorMessage: text('error_message'), // 에러 메시지 (있을 경우)
  
  // 메타데이터
  ipAddress: text('ip_address'), // 요청자 IP
  isSuccessful: boolean('is_successful').default(true), // 성공 여부
  
  // 시간 정보
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


/**
 * 사용자 위치 정보 테이블
 */
export const userLocations = pgTable('user_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Clerk 사용자 ID
  clerkUserId: text('clerk_user_id').notNull().unique(),
  
  // 위치 정보
  latitude: text('latitude').notNull(), // 위도
  longitude: text('longitude').notNull(), // 경도
  address: text('address'), // 역지오코딩된 주소
  cityName: text('city_name'), // 도시명 (날씨 조회용)
  
  // 설정 정보
  isDefault: boolean('is_default').default(true).notNull(), // 기본 위치 여부
  nickname: text('nickname'), // 위치 별칭 (예: '집', '회사')
  
  // 위치 정확도 및 메타데이터
  accuracy: integer('accuracy'), // GPS 정확도 (미터)
  source: text('source').default('gps').notNull(), // 'gps', 'manual'
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 사용자별 선택된 측정소 정보 테이블
 */
export const userSelectedStations = pgTable('user_selected_stations', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Clerk 사용자 ID
  clerkUserId: text('clerk_user_id').notNull().unique(),
  
  // 측정소 정보
  stationName: text('station_name').notNull(), // 측정소명
  sido: text('sido').notNull(), // 시도
  
  // 자동 선택 정보
  isAutoSelected: boolean('is_auto_selected').default(false).notNull(), // 자동 선택 여부
  distance: integer('distance'), // 사용자 위치로부터의 거리 (미터)
  stationAddress: text('station_address'), // 측정소 주소
  
  // 사용자 위치 정보 (자동 선택 시)
  userLatitude: text('user_latitude'), // 사용자 위도
  userLongitude: text('user_longitude'), // 사용자 경도
  
  // 설정 정보
  isDefault: boolean('is_default').default(true).notNull(), // 기본 측정소 여부
  
  // 시간 정보
  selectedAt: timestamp('selected_at').defaultNow().notNull(), // 선택된 시간
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 미세먼지 주간예보 캐시 테이블
 */
export const weeklyAirQualityForecasts = pgTable('weekly_air_quality_forecasts', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 예보 기본 정보
  dataTime: text('data_time').notNull(), // 통보일시
  informCode: text('inform_code').notNull(), // 통보코드 (PM10, PM25)
  informData: text('inform_data').notNull(), // 통보시간
  searchDate: text('search_date').notNull(), // 조회 기준 날짜 (YYYY-MM-DD)
  
  // 예보 내용
  informOverall: text('inform_overall').notNull(), // 대기질 전망
  informCause: text('inform_cause'), // 대기질 전망 원인
  informGrade: text('inform_grade'), // 예보등급
  actionKnack: text('action_knack'), // 행동요령
  
  // 일별 예보 데이터 (JSON 형태로 저장)
  dailyForecasts: jsonb('daily_forecasts'), // [{ date, grade, description }]
  
  // 예보 이미지 URL들
  imageUrls: jsonb('image_urls'), // [url1, url2, ...]
  
  // 원본 API 응답 데이터 (백업용)
  rawData: jsonb('raw_data'),
  
  // 캐시 정보
  cacheKey: text('cache_key').notNull(), // 캐시 키 (예: "PM10_2024-01-15")
  expiresAt: timestamp('expires_at').notNull(), // 캐시 만료 시간
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 지역별 시간별 대기질 정보 테이블
 */
export const regionalHourlyAirQuality = pgTable('regional_hourly_air_quality', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 지역 정보
  regionCode: text('region_code').notNull(), // 지역 코드 (seoul, gyeonggi_north, incheon)
  regionName: text('region_name').notNull(), // 지역명 (서울, 경기 북부, 인천)
  sidoName: text('sido_name').notNull(), // API 호출용 시도명
  
  // 시간 정보
  measureDate: text('measure_date').notNull(), // 측정 날짜 (YYYY-MM-DD)
  measureHour: integer('measure_hour').notNull(), // 측정 시간 (0-23)
  dataTime: text('data_time').notNull(), // 원본 측정 시간 (API 응답)
  
  // 통합 대기환경지수
  khaiValue: text('khai_value'), // 통합대기환경지수
  khaiGrade: text('khai_grade'), // 통합대기환경등급
  
  // 미세먼지 (PM10)
  pm10Value: text('pm10_value'), // 미세먼지 농도
  pm10Grade: text('pm10_grade'), // 미세먼지 등급
  
  // 초미세먼지 (PM2.5)
  pm25Value: text('pm25_value'), // 초미세먼지 농도
  pm25Grade: text('pm25_grade'), // 초미세먼지 등급
  
  // 오존 (O3)
  o3Value: text('o3_value'), // 오존 농도
  o3Grade: text('o3_grade'), // 오존 등급
  
  // 이산화질소 (NO2)
  no2Value: text('no2_value'), // 이산화질소 농도
  no2Grade: text('no2_grade'), // 이산화질소 등급
  
  // 일산화탄소 (CO)
  coValue: text('co_value'), // 일산화탄소 농도
  coGrade: text('co_grade'), // 일산화탄소 등급
  
  // 아황산가스 (SO2)
  so2Value: text('so2_value'), // 아황산가스 농도
  so2Grade: text('so2_grade'), // 아황산가스 등급
  
  // 캐시 정보
  cacheKey: text('cache_key').notNull(), // 캐시 키
  expiresAt: timestamp('expires_at').notNull(), // 캐시 만료 시간
  
  // 메타데이터
  rawData: jsonb('raw_data'), // 원본 API 응답
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 지역별 일별 대기질 정보 테이블
 */
export const regionalDailyAirQuality = pgTable('regional_daily_air_quality', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 지역 정보
  regionCode: text('region_code').notNull(), // 지역 코드
  regionName: text('region_name').notNull(), // 지역명
  sidoName: text('sido_name').notNull(), // API 호출용 시도명
  
  // 날짜 정보
  measureDate: text('measure_date').notNull(), // 측정 날짜 (YYYY-MM-DD)
  dataTime: text('data_time').notNull(), // 원본 측정 시간
  
  // 통합 대기환경지수 (일 대표값)
  khaiValue: text('khai_value'), // 통합대기환경지수
  khaiGrade: text('khai_grade'), // 통합대기환경등급
  
  // 미세먼지 (PM10) 통계
  pm10Value: text('pm10_value'), // 미세먼지 농도 (일 평균)
  pm10Grade: text('pm10_grade'), // 미세먼지 등급
  pm10Avg: text('pm10_avg'), // 미세먼지 평균
  pm10Max: text('pm10_max'), // 미세먼지 최대
  pm10Min: text('pm10_min'), // 미세먼지 최소
  
  // 초미세먼지 (PM2.5) 통계
  pm25Value: text('pm25_value'), // 초미세먼지 농도 (일 평균)
  pm25Grade: text('pm25_grade'), // 초미세먼지 등급
  pm25Avg: text('pm25_avg'), // 초미세먼지 평균
  pm25Max: text('pm25_max'), // 초미세먼지 최대
  pm25Min: text('pm25_min'), // 초미세먼지 최소
  
  // 오존 (O3) 통계
  o3Value: text('o3_value'), // 오존 농도 (일 평균)
  o3Grade: text('o3_grade'), // 오존 등급
  o3Avg: text('o3_avg'), // 오존 평균
  o3Max: text('o3_max'), // 오존 최대
  o3Min: text('o3_min'), // 오존 최소
  
  // 이산화질소 (NO2)
  no2Value: text('no2_value'), // 이산화질소 농도
  no2Grade: text('no2_grade'), // 이산화질소 등급
  
  // 일산화탄소 (CO)
  coValue: text('co_value'), // 일산화탄소 농도
  coGrade: text('co_grade'), // 일산화탄소 등급
  
  // 아황산가스 (SO2)
  so2Value: text('so2_value'), // 아황산가스 농도
  so2Grade: text('so2_grade'), // 아황산가스 등급
  
  // 캐시 정보
  cacheKey: text('cache_key').notNull(), // 캐시 키
  expiresAt: timestamp('expires_at').notNull(), // 캐시 만료 시간
  
  // 메타데이터
  rawData: jsonb('raw_data'), // 원본 API 응답
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * API 호출 기록 테이블
 * AccuWeather API 등 외부 API 호출 수를 추적하여 일일 한도를 관리합니다.
 */
export const apiCallLogs = pgTable('api_call_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // API 기본 정보
  apiProvider: text('api_provider').notNull(), // 'accuweather', 'airkorea', 'openai'
  apiEndpoint: text('api_endpoint').notNull(), // 호출한 API 엔드포인트
  httpMethod: text('http_method').default('GET').notNull(), // HTTP 메서드
  
  // 호출 시간 정보
  callDate: text('call_date').notNull(), // 호출 날짜 (YYYY-MM-DD)
  callTime: timestamp('call_time').defaultNow().notNull(), // 정확한 호출 시간
  
  // 응답 정보
  httpStatus: integer('http_status'), // HTTP 응답 상태코드
  responseTime: integer('response_time'), // 응답 시간 (ms)
  isSuccessful: boolean('is_successful').default(true).notNull(), // 성공 여부
  
  // 사용자 정보 (선택사항)
  userId: text('user_id'), // Clerk userId (사용자별 호출 추적 시)
  
  // 요청 정보
  requestParams: jsonb('request_params'), // 요청 파라미터 (개인정보 제외)
  errorMessage: text('error_message'), // 에러 메시지 (실패 시)
  
  // 메타데이터
  userAgent: text('user_agent'), // 요청 User-Agent
  ipAddress: text('ip_address'), // 요청 IP (익명화)
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 일일 API 호출 통계 테이블
 * 매일 자정에 업데이트되는 API 호출 현황 요약
 */
export const dailyApiStats = pgTable('daily_api_stats', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 기본 정보
  statDate: text('stat_date').notNull(), // 통계 날짜 (YYYY-MM-DD)
  apiProvider: text('api_provider').notNull(), // API 제공자
  
  // 호출 통계
  totalCalls: integer('total_calls').default(0).notNull(), // 총 호출 수
  successfulCalls: integer('successful_calls').default(0).notNull(), // 성공한 호출 수
  failedCalls: integer('failed_calls').default(0).notNull(), // 실패한 호출 수
  
  // 성능 통계
  avgResponseTime: integer('avg_response_time'), // 평균 응답 시간 (ms)
  maxResponseTime: integer('max_response_time'), // 최대 응답 시간 (ms)
  minResponseTime: integer('min_response_time'), // 최소 응답 시간 (ms)
  
  // API 별 상세 통계 (JSON)
  endpointStats: jsonb('endpoint_stats'), // { "/endpoint": { calls: 10, success: 9, ... } }
  
  // 시간대별 통계
  hourlyStats: jsonb('hourly_stats'), // [{ hour: 0, calls: 5 }, ...]
  
  // 메타데이터
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  isFinalized: boolean('is_finalized').default(false).notNull(), // 하루 종료 후 확정 여부
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 시간별 날씨 정보 테이블
 * AccuWeather API에서 가져온 시간별 날씨 데이터를 캐시
 */
export const hourlyWeatherData = pgTable('hourly_weather_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 사용자 정보
  clerkUserId: text('clerk_user_id'), // Clerk 사용자 ID (사용자별 날씨 데이터 저장용)
  
  // 위치 정보
  locationKey: text('location_key').notNull(), // AccuWeather 위치 키
  locationName: text('location_name').notNull(), // 위치명
  latitude: text('latitude'), // 위도
  longitude: text('longitude'), // 경도
  
  // 시간 정보
  forecastDate: text('forecast_date').notNull(), // 예보 날짜 (YYYY-MM-DD)
  forecastHour: integer('forecast_hour').notNull(), // 예보 시간 (0-23)
  forecastDateTime: timestamp('forecast_datetime').notNull(), // 정확한 예보 시간
  
  // 기본 날씨 정보
  temperature: integer('temperature').notNull(), // 온도 (°C)
  conditions: text('conditions').notNull(), // 날씨 상태
  weatherIcon: integer('weather_icon'), // AccuWeather 아이콘 번호
  
  // 상세 정보
  humidity: integer('humidity'), // 습도 (%)
  precipitation: text('precipitation'), // 실제 강수량 (mm)
  precipitationProbability: integer('precipitation_probability'), // 강수 확률 (%)
  rainProbability: integer('rain_probability'), // 비 올 확률 (%)
  windSpeed: integer('wind_speed'), // 풍속 (km/h)
  
  // 메타데이터
  units: text('units').default('metric').notNull(), // 단위 시스템
  rawData: jsonb('raw_data'), // 원본 API 응답 데이터 (백업용)
  
  // 캐시 정보
  cacheKey: text('cache_key').notNull(), // 캐시 키
  expiresAt: timestamp('expires_at').notNull(), // 캐시 만료 시간
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 일별 날씨 정보 테이블
 * AccuWeather API에서 가져온 일별 날씨 데이터를 캐시
 */
export const dailyWeatherData = pgTable('daily_weather_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 사용자 정보
  clerkUserId: text('clerk_user_id'), // Clerk 사용자 ID (사용자별 날씨 데이터 저장용)
  
  // 위치 정보
  locationKey: text('location_key').notNull(), // AccuWeather 위치 키
  locationName: text('location_name').notNull(), // 위치명
  latitude: text('latitude'), // 위도
  longitude: text('longitude'), // 경도
  
  // 날짜 정보
  forecastDate: text('forecast_date').notNull(), // 예보 날짜 (YYYY-MM-DD)
  dayOfWeek: text('day_of_week').notNull(), // 요일
  
  // 온도 정보
  temperature: integer('temperature').notNull(), // 평균 온도 (°C)
  highTemp: integer('high_temp').notNull(), // 최고 온도 (°C)
  lowTemp: integer('low_temp').notNull(), // 최저 온도 (°C)
  
  // 기본 날씨 정보
  conditions: text('conditions').notNull(), // 날씨 상태
  weatherIcon: integer('weather_icon'), // AccuWeather 아이콘 번호
  
  // 강수 정보
  precipitationProbability: integer('precipitation_probability'), // 강수 확률 (%)
  rainProbability: integer('rain_probability'), // 비 올 확률 (%)
  
  // Day/Night 세부 정보 (JSON 형태로 저장)
  dayWeather: jsonb('day_weather'), // { icon, conditions, precipitationProbability }
  nightWeather: jsonb('night_weather'), // { icon, conditions, precipitationProbability }
  
  // 헤드라인 정보 (중요한 날씨 알림)
  headline: jsonb('headline'), // { text, category, severity }
  
  // 메타데이터
  units: text('units').default('metric').notNull(), // 단위 시스템
  forecastDays: integer('forecast_days').default(5).notNull(), // 예보 일수 (1, 5, 10, 15)
  rawData: jsonb('raw_data'), // 원본 API 응답 데이터 (백업용)
  
  // 캐시 정보
  cacheKey: text('cache_key').notNull(), // 캐시 키
  expiresAt: timestamp('expires_at').notNull(), // 캐시 만료 시간
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * AccuWeather 위치 키 캐시 테이블
 * 위치명이나 좌표로 조회한 AccuWeather 위치 키를 캐시
 */
export const weatherLocationKeys = pgTable('weather_location_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 위치 정보
  locationName: text('location_name'), // 위치명 (검색어)
  latitude: text('latitude'), // 위도
  longitude: text('longitude'), // 경도
  
  // AccuWeather 정보
  locationKey: text('location_key').notNull(), // AccuWeather 위치 키
  localizedName: text('localized_name'), // 현지화된 위치명
  countryCode: text('country_code'), // 국가 코드
  administrativeArea: text('administrative_area'), // 행정구역
  
  // 메타데이터
  searchType: text('search_type').notNull(), // 'name' 또는 'coordinates'
  rawLocationData: jsonb('raw_location_data'), // 원본 위치 정보 (백업용)
  
  // 캐시 정보
  cacheKey: text('cache_key').notNull().unique(), // 캐시 키
  expiresAt: timestamp('expires_at').notNull(), // 캐시 만료 시간
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 타입 정의
export type KakaoMessage = typeof kakaoMessages.$inferSelect;
export type NewKakaoMessage = typeof kakaoMessages.$inferInsert;
export type KakaoResponse = typeof kakaoResponses.$inferSelect;
export type NewKakaoResponse = typeof kakaoResponses.$inferInsert;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;
export type UserLocation = typeof userLocations.$inferSelect;
export type NewUserLocation = typeof userLocations.$inferInsert;
export type UserSelectedStation = typeof userSelectedStations.$inferSelect;
export type NewUserSelectedStation = typeof userSelectedStations.$inferInsert;
export type WeeklyAirQualityForecast = typeof weeklyAirQualityForecasts.$inferSelect;
export type NewWeeklyAirQualityForecast = typeof weeklyAirQualityForecasts.$inferInsert;
export type RegionalHourlyAirQuality = typeof regionalHourlyAirQuality.$inferSelect;
export type NewRegionalHourlyAirQuality = typeof regionalHourlyAirQuality.$inferInsert;
export type RegionalDailyAirQuality = typeof regionalDailyAirQuality.$inferSelect;
export type NewRegionalDailyAirQuality = typeof regionalDailyAirQuality.$inferInsert;
// 날씨 정보 벡터 임베딩 테이블
export const weatherEmbeddings = pgTable('weather_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 사용자 정보
  clerkUserId: text('clerk_user_id'), // Clerk 사용자 ID (사용자별 날씨 임베딩 필터링용)
  
  contentType: text('content_type').notNull(), // 'current', 'hourly', 'daily', 'forecast'
  locationName: text('location_name').notNull(),
  forecastDate: text('forecast_date'),
  forecastHour: integer('forecast_hour'),
  content: text('content').notNull(), // 임베딩할 텍스트 내용
  embedding: text('embedding').notNull(), // JSON 문자열로 저장된 벡터
  metadata: jsonb('metadata'), // 추가 메타데이터 (온도, 습도, 강수확률 등)
  weatherDataId: uuid('weather_data_id'), // 원본 날씨 데이터 ID 참조
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ChatGPT 대화 히스토리 테이블
export const chatGptConversations = pgTable('chatgpt_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 사용자 정보 (Clerk 사용자 ID 사용)
  clerkUserId: text('clerk_user_id').notNull(), // Clerk 사용자 ID로 변경
  sessionId: text('session_id').notNull(),
  userQuestion: text('user_question').notNull(),
  retrievedContext: jsonb('retrieved_context'), // RAG로 가져온 컨텍스트
  gptResponse: text('gpt_response').notNull(),
  tokensUsed: integer('tokens_used'),
  responseTime: integer('response_time'), // 응답 시간 (ms)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ApiCallLog = typeof apiCallLogs.$inferSelect;
export type NewApiCallLog = typeof apiCallLogs.$inferInsert;
export type DailyApiStats = typeof dailyApiStats.$inferSelect;
export type NewDailyApiStats = typeof dailyApiStats.$inferInsert;
export type HourlyWeatherData = typeof hourlyWeatherData.$inferSelect;
export type NewHourlyWeatherData = typeof hourlyWeatherData.$inferInsert;
export type DailyWeatherData = typeof dailyWeatherData.$inferSelect;
export type NewDailyWeatherData = typeof dailyWeatherData.$inferInsert;
export type WeatherLocationKey = typeof weatherLocationKeys.$inferSelect;
export type NewWeatherLocationKey = typeof weatherLocationKeys.$inferInsert;
/**
 * 이메일 발송 스케줄 테이블
 * 매일 정해진 시간에 날씨 안내 이메일 발송을 관리
 */
export const emailSchedules = pgTable('email_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 스케줄 기본 정보
  title: text('title').notNull(), // 스케줄 제목 (예: "아침 날씨 안내", "저녁 날씨 안내")
  description: text('description'), // 스케줄 설명
  
  // 이메일 내용 템플릿 설정
  emailSubject: text('email_subject').notNull(), // 이메일 제목
  emailTemplate: text('email_template').notNull(), // 이메일 템플릿 ('weather_summary', 'custom')
  
  // 발송 스케줄 설정
  scheduleTime: text('schedule_time').notNull(), // 'HH:MM' 형식 (예: '06:00', '18:00')
  timezone: text('timezone').default('Asia/Seoul').notNull(),
  
  // 발송 대상 설정
  targetType: text('target_type').default('all_users').notNull(), // 'all_users', 'active_users', 'specific_users'
  targetUserIds: jsonb('target_user_ids'), // 특정 사용자 타겟팅 시 Clerk userId 배열
  
  // 활성화 상태
  isActive: boolean('is_active').default(true).notNull(),
  
  // 발송 이력
  lastSentAt: timestamp('last_sent_at'),
  nextSendAt: timestamp('next_send_at').notNull(),
  totalSentCount: integer('total_sent_count').default(0).notNull(),
  
  // 생성자 정보 (관리자)
  createdBy: text('created_by').notNull(), // Clerk userId
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 이메일 발송 로그 테이블
 * 실제 이메일 발송 결과를 기록
 */
export const emailSendLogs = pgTable('email_send_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 연결된 스케줄 (수동 발송의 경우 null)
  emailScheduleId: uuid('email_schedule_id').references(() => emailSchedules.id),
  
  // 발송 기본 정보
  emailType: text('email_type').notNull(), // 'scheduled', 'manual', 'test'
  subject: text('subject').notNull(), // 발송된 이메일 제목
  
  // 발송 대상 정보
  recipientCount: integer('recipient_count').notNull(), // 총 발송 대상자 수
  successCount: integer('success_count').notNull(), // 성공한 발송 수
  failureCount: integer('failure_count').default(0).notNull(), // 실패한 발송 수
  
  // 날씨 데이터 정보
  weatherDataUsed: jsonb('weather_data_used'), // 사용된 날씨 데이터 정보
  aiSummary: text('ai_summary'), // AI가 생성한 날씨 요약
  forecastPeriod: text('forecast_period'), // 예보 기간 (예: "12시간", "24시간")
  
  // 발송 결과
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  executionTime: integer('execution_time'), // 실행 시간 (ms)
  isSuccessful: boolean('is_successful').default(true).notNull(),
  
  // 에러 정보
  errorMessage: text('error_message'),
  failedEmails: jsonb('failed_emails'), // 실패한 이메일 주소들과 에러 정보
  
  // 발송자 정보
  initiatedBy: text('initiated_by').notNull(), // Clerk userId (수동 발송 시 관리자, 자동 발송 시 'system')
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 사용자 이메일 설정 테이블
 * 사용자별 이메일 수신 설정 관리
 */
export const userEmailSettings = pgTable('user_email_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Clerk 사용자 ID
  clerkUserId: text('clerk_user_id').notNull().unique(),
  
  // 이메일 주소
  email: text('email').notNull(), // Clerk에서 가져온 이메일 주소
  
  // 수신 설정
  receiveWeatherEmails: boolean('receive_weather_emails').default(true).notNull(), // 날씨 이메일 수신 여부
  receiveMorningEmail: boolean('receive_morning_email').default(true).notNull(), // 아침 이메일 수신 여부
  receiveEveningEmail: boolean('receive_evening_email').default(true).notNull(), // 저녁 이메일 수신 여부
  
  // 개인화 설정
  preferredLanguage: text('preferred_language').default('ko').notNull(), // 이메일 언어 설정
  timezone: text('timezone').default('Asia/Seoul').notNull(), // 사용자 시간대
  
  // 구독 상태
  isSubscribed: boolean('is_subscribed').default(true).notNull(), // 전체 구독 상태
  unsubscribedAt: timestamp('unsubscribed_at'), // 구독 취소 시간
  unsubscribeReason: text('unsubscribe_reason'), // 구독 취소 이유
  
  // 이메일 발송 통계
  totalEmailsSent: integer('total_emails_sent').default(0).notNull(), // 총 발송된 이메일 수
  lastEmailSentAt: timestamp('last_email_sent_at'), // 마지막 이메일 발송 시간
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 개별 이메일 발송 기록 테이블
 * 각 사용자에게 발송된 개별 이메일 상세 기록
 */
export const individualEmailLogs = pgTable('individual_email_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 연결 정보
  emailSendLogId: uuid('email_send_log_id').references(() => emailSendLogs.id).notNull(),
  clerkUserId: text('clerk_user_id').notNull(), // 수신자 Clerk userId
  
  // 이메일 정보
  recipientEmail: text('recipient_email').notNull(), // 수신자 이메일 주소
  subject: text('subject').notNull(), // 이메일 제목
  emailContent: text('email_content'), // 실제 발송된 이메일 내용 (선택적)
  
  // 발송 결과
  status: text('status').notNull(), // 'sent', 'failed', 'bounced', 'delivered'
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  
  // Gmail API 정보
  gmailMessageId: text('gmail_message_id'), // Gmail API에서 반환된 메시지 ID
  gmailThreadId: text('gmail_thread_id'), // Gmail 스레드 ID
  
  // 에러 정보
  errorCode: text('error_code'), // Gmail API 에러 코드
  errorMessage: text('error_message'), // 에러 메시지
  
  // 사용자 반응 (향후 확장용)
  isOpened: boolean('is_opened').default(false), // 이메일 열림 여부
  openedAt: timestamp('opened_at'), // 열린 시간
  isClicked: boolean('is_clicked').default(false), // 링크 클릭 여부
  clickedAt: timestamp('clicked_at'), // 클릭 시간
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type WeatherEmbedding = typeof weatherEmbeddings.$inferSelect;
export type NewWeatherEmbedding = typeof weatherEmbeddings.$inferInsert;
export type ChatGptConversation = typeof chatGptConversations.$inferSelect;
export type NewChatGptConversation = typeof chatGptConversations.$inferInsert;

// 이메일 관련 타입 정의
export type EmailSchedule = typeof emailSchedules.$inferSelect;
export type NewEmailSchedule = typeof emailSchedules.$inferInsert;
export type EmailSendLog = typeof emailSendLogs.$inferSelect;
export type NewEmailSendLog = typeof emailSendLogs.$inferInsert;
export type UserEmailSettings = typeof userEmailSettings.$inferSelect;
export type NewUserEmailSettings = typeof userEmailSettings.$inferInsert;
export type IndividualEmailLog = typeof individualEmailLogs.$inferSelect;
export type NewIndividualEmailLog = typeof individualEmailLogs.$inferInsert;

/**
 * Google Air Quality API 시간별 대기질 데이터 테이블
 * Google Air Quality API에서 가져온 시간별 대기질 데이터를 캐시
 */
export const googleHourlyAirQualityData = pgTable('google_hourly_air_quality_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 사용자 정보
  clerkUserId: text('clerk_user_id'), // Clerk 사용자 ID (사용자별 대기질 데이터 저장용)
  
  // 위치 정보
  latitude: text('latitude').notNull(), // 위도
  longitude: text('longitude').notNull(), // 경도
  locationName: text('location_name'), // 위치명
  
  // 시간 정보
  forecastDate: text('forecast_date').notNull(), // 예보 날짜 (YYYY-MM-DD)
  forecastHour: integer('forecast_hour').notNull(), // 예보 시간 (0-23)
  forecastDateTime: timestamp('forecast_datetime').notNull(), // 정확한 예보 시간
  
  // PM 농도 정보 (μg/m³)
  pm10: integer('pm10'), // PM10 농도
  pm25: integer('pm25'), // PM2.5 농도
  
  // 대기질 지수
  caiKr: integer('cai_kr'), // CAI (Korea) 지수
  breezoMeterAqi: integer('breezo_meter_aqi'), // BreezoMeter AQI
  
  // 추가 오염물질 (선택사항)
  no2: integer('no2'), // 이산화질소 (μg/m³)
  o3: integer('o3'), // 오존 (μg/m³)
  so2: integer('so2'), // 아황산가스 (μg/m³)
  co: integer('co'), // 일산화탄소 (mg/m³)
  
  // 메타데이터
  units: text('units').default('metric').notNull(), // 단위 시스템
  rawData: jsonb('raw_data'), // 원본 API 응답 데이터 (백업용)
  
  // 캐시 정보
  cacheKey: text('cache_key').notNull(), // 캐시 키
  expiresAt: timestamp('expires_at').notNull(), // 캐시 만료 시간
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Google Air Quality API 일별 대기질 데이터 테이블
 * Google Air Quality API에서 가져온 일별 대기질 데이터를 캐시
 */
export const googleDailyAirQualityData = pgTable('google_daily_air_quality_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 사용자 정보
  clerkUserId: text('clerk_user_id'), // Clerk 사용자 ID (사용자별 대기질 데이터 저장용)
  
  // 위치 정보
  latitude: text('latitude').notNull(), // 위도
  longitude: text('longitude').notNull(), // 경도
  locationName: text('location_name'), // 위치명
  
  // 날짜 정보
  forecastDate: text('forecast_date').notNull(), // 예보 날짜 (YYYY-MM-DD)
  dayOfWeek: text('day_of_week').notNull(), // 요일
  
  // PM 농도 정보 (일 평균, μg/m³)
  pm10: integer('pm10'), // PM10 농도 (일 평균)
  pm10Max: integer('pm10_max'), // PM10 최대값
  pm10Min: integer('pm10_min'), // PM10 최소값
  
  pm25: integer('pm25'), // PM2.5 농도 (일 평균)
  pm25Max: integer('pm25_max'), // PM2.5 최대값
  pm25Min: integer('pm25_min'), // PM2.5 최소값
  
  // 대기질 지수 (일 평균)
  caiKr: integer('cai_kr'), // CAI (Korea) 지수
  caiKrMax: integer('cai_kr_max'), // CAI (Korea) 최대값
  caiKrMin: integer('cai_kr_min'), // CAI (Korea) 최소값
  
  breezoMeterAqi: integer('breezo_meter_aqi'), // BreezoMeter AQI
  breezoMeterAqiMax: integer('breezo_meter_aqi_max'), // BreezoMeter AQI 최대값
  breezoMeterAqiMin: integer('breezo_meter_aqi_min'), // BreezoMeter AQI 최소값
  
  // 추가 오염물질 (일 평균)
  no2: integer('no2'), // 이산화질소 (μg/m³)
  o3: integer('o3'), // 오존 (μg/m³)
  so2: integer('so2'), // 아황산가스 (μg/m³)
  co: integer('co'), // 일산화탄소 (mg/m³)
  
  // 메타데이터
  units: text('units').default('metric').notNull(), // 단위 시스템
  forecastDays: integer('forecast_days').default(7).notNull(), // 예보 일수
  rawData: jsonb('raw_data'), // 원본 API 응답 데이터 (백업용)
  
  // 캐시 정보
  cacheKey: text('cache_key').notNull(), // 캐시 키
  expiresAt: timestamp('expires_at').notNull(), // 캐시 만료 시간
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Google Air Quality API 관련 타입 정의
export type GoogleHourlyAirQualityData = typeof googleHourlyAirQualityData.$inferSelect;
export type NewGoogleHourlyAirQualityData = typeof googleHourlyAirQualityData.$inferInsert;
export type GoogleDailyAirQualityData = typeof googleDailyAirQualityData.$inferSelect;
export type NewGoogleDailyAirQualityData = typeof googleDailyAirQualityData.$inferInsert;
