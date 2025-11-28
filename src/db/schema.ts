import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * RSS 소스 테이블
 * RSS 피드 소스 정보를 저장합니다.
 */
export const rssSources = pgTable('rss_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  url: text('url').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  description: text('description'),
  language: text('language'),
  lastFetched: timestamp('last_fetched'),
  lastError: text('last_error'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 기사 테이블
 * RSS 피드에서 가져온 기사 정보를 저장합니다.
 */
export const articles = pgTable('articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  rssSourceId: uuid('rss_source_id').references(() => rssSources.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  author: text('author'),
  url: text('url').notNull(),
  imageUrl: text('image_url'),
  publishedAt: timestamp('published_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 기사 요약 테이블
 * AI가 생성한 기사 요약 정보를 저장합니다.
 */
export const articleSummaries = pgTable('article_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id).notNull(),
  summary: text('summary').notNull(),
  keywords: text('keywords').array(),
  language: text('language'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 사용자 프로필 테이블
 * Clerk 사용자와 연결된 프로필 정보를 저장합니다.
 */
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  preferences: jsonb('preferences'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 사용자 상호작용 테이블
 * 사용자와 기사 간의 상호작용 정보를 저장합니다.
 */
export const userInteractions = pgTable('user_interactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  articleId: uuid('article_id').references(() => articles.id).notNull(),
  interactionType: text('interaction_type').notNull(), // view, like, dislike, share
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 스크랩된 기사 테이블
 * 사용자가 스크랩한 기사 정보를 저장합니다.
 */
export const scrappedArticles = pgTable('scrapped_articles', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  articleId: uuid('article_id').references(() => articles.id).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 추천 기사 테이블
 * 사용자별 추천 기사 정보를 저장합니다.
 */
export const recommendations = pgTable('recommendations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  articleId: uuid('article_id').references(() => articles.id).notNull(),
  score: integer('score').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 댓글 테이블
 * 기사에 대한 사용자 댓글을 저장합니다.
 */
export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  articleId: uuid('article_id').references(() => articles.id).notNull(),
  clerkUserId: text('clerk_user_id').notNull(),
  content: text('content').notNull(),
  parentId: uuid('parent_id').references(() => comments.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 댓글 좋아요 테이블
 * 댓글에 대한 좋아요 정보를 저장합니다.
 */
export const commentLikes = pgTable('comment_likes', {
  id: uuid('id').defaultRandom().primaryKey(),
  commentId: uuid('comment_id').references(() => comments.id).notNull(),
  clerkUserId: text('clerk_user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 사용자 이메일 설정 테이블
 * 사용자의 이메일 알림 설정을 저장합니다.
 */
export const userEmailSettings = pgTable('user_email_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  email: text('email').notNull(),
  receiveWeatherEmails: boolean('receive_weather_emails').default(true).notNull(),
  receiveMorningEmail: boolean('receive_morning_email').default(true).notNull(),
  receiveEveningEmail: boolean('receive_evening_email').default(true).notNull(),
  isSubscribed: boolean('is_subscribed').default(true).notNull(),
  preferredLanguage: text('preferred_language').default('ko').notNull(),
  timezone: text('timezone').default('Asia/Seoul').notNull(),
  totalEmailsSent: integer('total_emails_sent').default(0).notNull(),
  unsubscribedAt: timestamp('unsubscribed_at'),
  unsubscribeReason: text('unsubscribe_reason'),
  lastEmailSentAt: timestamp('last_email_sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 이메일 스케줄 테이블
 * 이메일 발송 스케줄을 저장합니다.
 */
export const emailSchedules = pgTable('email_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(), // name -> title로 변경
  description: text('description'),
  emailSubject: text('email_subject').notNull(), // 이메일 제목
  emailTemplate: text('email_template').notNull(), // weather_summary, custom
  scheduleTime: text('schedule_time').notNull(), // HH:MM 형식
  timezone: text('timezone').default('Asia/Seoul').notNull(),
  targetType: text('target_type').notNull(), // all_users, active_users, specific_users
  targetUserIds: jsonb('target_user_ids'), // 특정 사용자 ID 배열
  isActive: boolean('is_active').default(true).notNull(),
  lastSentAt: timestamp('last_sent_at'), // 마지막 발송 시간
  nextSendAt: timestamp('next_send_at'), // 다음 발송 시간
  totalSentCount: integer('total_sent_count').default(0).notNull(), // 총 발송 횟수
  createdBy: text('created_by'), // 생성한 사용자 ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 이메일 로그 테이블
 * 발송된 이메일의 로그를 저장합니다.
 */
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  scheduleId: uuid('schedule_id').references(() => emailSchedules.id),
  clerkUserId: text('clerk_user_id').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  status: text('status').notNull(), // sent, failed, delivered, opened
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  openedAt: timestamp('opened_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 사용자 위치 테이블
 * 사용자의 저장된 위치 정보를 저장합니다.
 */
export const userLocations = pgTable('user_locations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  address: text('address'),
  cityName: text('city_name'),
  isDefault: boolean('is_default').default(true).notNull(),
  nickname: text('nickname'),
  accuracy: integer('accuracy'),
  source: text('source').default('gps').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 날씨 데이터 테이블
 * 위치별 날씨 데이터를 저장합니다.
 */
export const weatherData = pgTable('weather_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  locationKey: text('location_key').notNull(),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  currentTemperature: integer('current_temperature'),
  currentConditions: text('current_conditions'),
  forecastData: jsonb('forecast_data'),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 시간별 날씨 데이터 테이블
 * 위치별 시간별 날씨 데이터를 저장합니다.
 */
export const hourlyWeatherData = pgTable('hourly_weather_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  locationKey: text('location_key').notNull(),
  locationName: text('location_name'),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  forecastDateTime: timestamp('forecast_datetime').notNull(),
  forecastDate: text('forecast_date').notNull(),
  forecastHour: integer('forecast_hour').notNull(),
  temperature: text('temperature'),
  conditions: text('conditions'),
  weatherIcon: integer('weather_icon'),
  humidity: integer('humidity'),
  precipitation: text('precipitation'),
  precipitationProbability: integer('precipitation_probability'),
  rainProbability: integer('rain_probability'),
  windSpeed: integer('wind_speed'),
  units: text('units'),
  cacheKey: text('cache_key'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 일별 날씨 데이터 테이블
 * 위치별 일별 날씨 데이터를 저장합니다.
 */
export const dailyWeatherData = pgTable('daily_weather_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  locationKey: text('location_key').notNull(),
  locationName: text('location_name'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  forecastDate: text('forecast_date').notNull(),
  dayOfWeek: text('day_of_week'),
  temperature: text('temperature'),
  highTemp: text('high_temp'),
  lowTemp: text('low_temp'),
  conditions: text('conditions'),
  weatherIcon: integer('weather_icon'),
  precipitationProbability: integer('precipitation_probability'),
  rainProbability: integer('rain_probability'),
  units: text('units'),
  dayWeather: jsonb('day_weather'),
  nightWeather: jsonb('night_weather'),
  headline: text('headline'),
  forecastDays: integer('forecast_days'),
  rawData: jsonb('raw_data'),
  cacheKey: text('cache_key'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 대기질 측정소 테이블
 * 대기질 측정소 정보를 저장합니다.
 */
export const airQualityStations = pgTable('air_quality_stations', {
  id: uuid('id').defaultRandom().primaryKey(),
  stationName: text('station_name').notNull(),
  stationCode: text('station_code').notNull().unique(),
  address: text('address'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  region: text('region'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 사용자-측정소 연결 테이블
 * 사용자와 대기질 측정소 간의 연결 정보를 저장합니다.
 */
export const userStations = pgTable('user_stations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  stationId: uuid('station_id').references(() => airQualityStations.id).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 대기질 데이터 테이블
 * 측정소별 대기질 데이터를 저장합니다.
 */
export const airQualityData = pgTable('air_quality_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  stationId: uuid('station_id').references(() => airQualityStations.id).notNull(),
  pm10Value: integer('pm10_value'),
  pm25Value: integer('pm25_value'),
  o3Value: text('o3_value'),
  no2Value: text('no2_value'),
  coValue: text('co_value'),
  so2Value: text('so2_value'),
  pm10Grade: integer('pm10_grade'),
  pm25Grade: integer('pm25_grade'),
  o3Grade: integer('o3_grade'),
  no2Grade: integer('no2_grade'),
  coGrade: integer('co_grade'),
  so2Grade: integer('so2_grade'),
  khaiValue: integer('khai_value'),
  khaiGrade: integer('khai_grade'),
  dataTime: timestamp('data_time').notNull(),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 대기질 예보 테이블
 * 지역별 대기질 예보 정보를 저장합니다.
 */
export const airQualityForecasts = pgTable('air_quality_forecasts', {
  id: uuid('id').defaultRandom().primaryKey(),
  region: text('region').notNull(),
  forecastDate: timestamp('forecast_date').notNull(),
  informCode: text('inform_code').notNull(), // PM10, PM25, O3
  informGrade: text('inform_grade'), // 좋음, 보통, 나쁨, 매우나쁨
  informOverall: text('inform_overall'),
  informCause: text('inform_cause'),
  informData: jsonb('inform_data'),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 벡터 저장소 테이블
 * 벡터 임베딩 저장소입니다.
 */
export const vectorStore = pgTable('vector_store', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').notNull(),
  embedding: text('embedding').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 사용자 역할 테이블
 * 사용자의 역할 정보를 저장합니다.
 */
export const userRoles = pgTable('user_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  role: text('role').default('user').notNull(), // user, admin, superadmin
  permissions: jsonb('permissions'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 마트 정보 테이블
 * 마트 기본 정보를 저장합니다.
 */
export const marts = pgTable('marts', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 기본 정보
  name: text('name').notNull(), // 마트 이름
  description: text('description'), // 마트 설명
  region: text('region').notNull(), // 지역
  address: text('address'), // 주소
  phone: text('phone'), // 전화번호
  email: text('email'), // 이메일
  website: text('website'), // 웹사이트
  
  // 위치 정보
  latitude: text('latitude'), // 위도
  longitude: text('longitude'), // 경도
  
  // 상태 정보
  isVerified: boolean('is_verified').default(false), // 인증 여부
  isFastResponse: boolean('is_fast_response').default(false), // 빠른 응답 여부
  isBusinessRegistered: boolean('is_business_registered').default(false), // 사업자 등록 여부
  
  // 통계 정보
  hireCount: integer('hire_count').default(0), // 고용 횟수
  responseTime: text('response_time').default('24시간'), // 응답 시간
  portfolioCount: integer('portfolio_count').default(0), // 포트폴리오 수
  photoCount: integer('photo_count').default(0), // 사진 수
  
  // 추가 정보
  logoUrl: text('logo_url'), // 로고 이미지 URL
  portfolioUrls: jsonb('portfolio_urls'), // 포트폴리오 URL 배열
  photoUrls: jsonb('photo_urls'), // 사진 URL 배열
  
  // 관리자 정보
  createdBy: text('created_by'), // 생성한 관리자 ID
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 마트 할인 전단지 테이블
 * 마트별 할인 전단지 메타 정보를 저장합니다.
 */
export const martDiscounts = pgTable('mart_discounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 연결 정보
  martId: uuid('mart_id').references(() => marts.id).notNull(),
  
  // 할인 정보
  title: text('title').notNull(), // 할인 제목
  description: text('description'), // 할인 설명
  startDate: timestamp('start_date').notNull(), // 할인 시작 날짜
  endDate: timestamp('end_date').notNull(), // 할인 종료 날짜
  discountRate: text('discount_rate'), // 할인율
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    martIdIdx: index('mart_discounts_mart_id_idx').on(table.martId),
  }
});

/**
 * 마트 할인 상품 항목 테이블
 * 날짜별 할인 상품 정보를 저장합니다.
 */
export const martDiscountItems = pgTable('mart_discount_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 연결 정보
  discountId: uuid('discount_id').references(() => martDiscounts.id, { onDelete: 'cascade' }).notNull(),
  
  // 할인 날짜 정보
  discountDate: timestamp('discount_date').notNull(), // 할인 날짜 (단일 날짜)
  title: text('title').notNull(), // 할인 제목
  description: text('description'), // 할인 설명
  
  // 이미지 정보
  imageUrl: text('image_url'), // 할인 이미지 URL (압축된 이미지)
  originalImageUrl: text('original_image_url'), // 원본 이미지 URL
  imageSize: integer('image_size'), // 이미지 크기 (bytes)
  
  // OCR 분석 결과
  ocrAnalyzed: boolean('ocr_analyzed').default(false), // OCR 분석 완료 여부
  products: jsonb('products'), // 사용자가 수정한 상품 정보 배열 [{ name: string, price: string }]
  originalProducts: jsonb('original_products'), // Claude AI가 분석한 원본 상품 정보 배열 [{ name: string, price: string }]
  
  // 시간 정보
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    discountIdIdx: index('mart_discount_items_discount_id_idx').on(table.discountId),
    discountDateIdx: index('mart_discount_items_discount_date_idx').on(table.discountDate),
  }
});

// 관계 정의
export const martsRelations = relations(marts, ({ many }) => ({
  discounts: many(martDiscounts),
}));

export const martDiscountsRelations = relations(martDiscounts, ({ one, many }) => ({
  mart: one(marts, {
    fields: [martDiscounts.martId],
    references: [marts.id],
  }),
  discountItems: many(martDiscountItems),
}));

export const martDiscountItemsRelations = relations(martDiscountItems, ({ one }) => ({
  discount: one(martDiscounts, {
    fields: [martDiscountItems.discountId],
    references: [martDiscounts.id],
  }),
}));

// 기본 테이블 타입 정의
export type RssSource = typeof rssSources.$inferSelect;
export type NewRssSource = typeof rssSources.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type ArticleSummary = typeof articleSummaries.$inferSelect;
export type NewArticleSummary = typeof articleSummaries.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export type UserInteraction = typeof userInteractions.$inferSelect;
export type NewUserInteraction = typeof userInteractions.$inferInsert;

export type ScrappedArticle = typeof scrappedArticles.$inferSelect;
export type NewScrappedArticle = typeof scrappedArticles.$inferInsert;

export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type CommentLike = typeof commentLikes.$inferSelect;
export type NewCommentLike = typeof commentLikes.$inferInsert;

export type UserEmailSettings = typeof userEmailSettings.$inferSelect;
export type NewUserEmailSettings = typeof userEmailSettings.$inferInsert;

export type EmailSchedule = typeof emailSchedules.$inferSelect;
export type NewEmailSchedule = typeof emailSchedules.$inferInsert;

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;

export type UserLocation = typeof userLocations.$inferSelect;
export type NewUserLocation = typeof userLocations.$inferInsert;

export type WeatherData = typeof weatherData.$inferSelect;
export type NewWeatherData = typeof weatherData.$inferInsert;

export type HourlyWeatherData = typeof hourlyWeatherData.$inferSelect;
export type NewHourlyWeatherData = typeof hourlyWeatherData.$inferInsert;

export type DailyWeatherData = typeof dailyWeatherData.$inferSelect;
export type NewDailyWeatherData = typeof dailyWeatherData.$inferInsert;

export type AirQualityStation = typeof airQualityStations.$inferSelect;
export type NewAirQualityStation = typeof airQualityStations.$inferInsert;

export type UserStation = typeof userStations.$inferSelect;
export type NewUserStation = typeof userStations.$inferInsert;

export type AirQualityData = typeof airQualityData.$inferSelect;
export type NewAirQualityData = typeof airQualityData.$inferInsert;

export type AirQualityForecast = typeof airQualityForecasts.$inferSelect;
export type NewAirQualityForecast = typeof airQualityForecasts.$inferInsert;

export type VectorStore = typeof vectorStore.$inferSelect;
export type NewVectorStore = typeof vectorStore.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;

// Mart 관련 타입 정의
export type Mart = typeof marts.$inferSelect;
export type NewMart = typeof marts.$inferInsert;

export type MartDiscount = typeof martDiscounts.$inferSelect;
export type NewMartDiscount = typeof martDiscounts.$inferInsert;

export type MartDiscountItem = typeof martDiscountItems.$inferSelect;
export type NewMartDiscountItem = typeof martDiscountItems.$inferInsert;

/**
 * API 호출 로그 테이블
 * API 호출 기록을 저장합니다.
 */
export const apiCallLogs = pgTable('api_call_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  apiProvider: text('api_provider').notNull(), // API 제공자 (weather, airquality 등)
  apiEndpoint: text('api_endpoint').notNull(), // API 엔드포인트
  httpMethod: text('http_method').default('GET').notNull(), // HTTP 메소드
  callDate: text('call_date').notNull(), // 호출 날짜
  callTime: timestamp('call_time').defaultNow().notNull(), // 호출 시간
  httpStatus: integer('http_status'), // HTTP 상태 코드
  responseTime: integer('response_time'), // 응답 시간 (ms)
  isSuccessful: boolean('is_successful').default(true).notNull(), // 성공 여부
  userId: text('user_id'), // 사용자 ID
  requestParams: jsonb('request_params'), // 요청 파라미터
  errorMessage: text('error_message'), // 에러 메시지
  userAgent: text('user_agent'), // 사용자 에이전트
  ipAddress: text('ip_address'), // IP 주소
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 일별 API 통계 테이블
 * 일별 API 사용량 통계를 저장합니다.
 */
export const dailyApiStats = pgTable('daily_api_stats', {
  id: uuid('id').defaultRandom().primaryKey(),
  statDate: text('stat_date').notNull(), // 통계 날짜
  apiProvider: text('api_provider').notNull(), // API 제공자
  totalCalls: integer('total_calls').default(0).notNull(),
  successfulCalls: integer('successful_calls').default(0).notNull(),
  failedCalls: integer('failed_calls').default(0).notNull(),
  avgResponseTime: integer('avg_response_time'), // 평균 응답 시간 (ms)
  maxResponseTime: integer('max_response_time'), // 최대 응답 시간 (ms)
  minResponseTime: integer('min_response_time'), // 최소 응답 시간 (ms)
  endpointStats: jsonb('endpoint_stats'), // 엔드포인트별 통계
  hourlyStats: jsonb('hourly_stats'), // 시간별 통계
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  isFinalized: boolean('is_finalized').default(false).notNull(), // 최종화 여부
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * ChatGPT 대화 테이블
 * ChatGPT와의 대화 기록을 저장합니다.
 */
export const chatGptConversations = pgTable('chatgpt_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  sessionId: text('session_id').notNull(),
  userMessage: text('user_message').notNull(),
  assistantMessage: text('assistant_message').notNull(),
  model: text('model').default('gpt-3.5-turbo').notNull(),
  tokens: integer('tokens'),
  cost: text('cost'), // 비용 (달러)
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 이메일 발송 로그 테이블
 * 이메일 발송 기록을 저장합니다.
 */
export const emailSendLogs = pgTable('email_send_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  scheduleId: uuid('schedule_id').references(() => emailSchedules.id),
  emailType: text('email_type').notNull(), // scheduled_personalized, manual 등
  clerkUserId: text('clerk_user_id'),
  email: text('email'),
  subject: text('subject').notNull(),
  content: text('content'),
  recipientCount: integer('recipient_count').default(0).notNull(), // 수신자 수
  successCount: integer('success_count').default(0).notNull(), // 성공 발송 수
  failureCount: integer('failure_count').default(0).notNull(), // 실패 발송 수
  weatherDataUsed: jsonb('weather_data_used'), // 사용된 날씨 데이터
  aiSummary: text('ai_summary'), // AI 생성 요약
  forecastPeriod: text('forecast_period'), // 예보 기간
  isSuccessful: boolean('is_successful').default(false).notNull(), // 전체 발송 성공 여부
  initiatedBy: text('initiated_by').notNull(), // 발송 주체 (cron_job, manual 등)
  executionTime: integer('execution_time'), // 실행 시간 (밀리초)
  failedEmails: jsonb('failed_emails'), // 실패한 이메일 목록
  status: text('status').notNull(), // sent, failed, delivered, opened
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 개별 이메일 로그 테이블
 * 개별 이메일 발송 상세 기록을 저장합니다.
 */
export const individualEmailLogs = pgTable('individual_email_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  sendLogId: uuid('send_log_id').references(() => emailSendLogs.id),
  clerkUserId: text('clerk_user_id').notNull(),
  email: text('email').notNull(),
  emailType: text('email_type').notNull(), // weather, news, etc.
  templateUsed: text('template_used'),
  personalizedContent: jsonb('personalized_content'),
  status: text('status').notNull(),
  errorDetails: text('error_details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Google 시간별 대기질 데이터 테이블
 * Google Air Quality API의 시간별 데이터를 저장합니다.
 */
export const googleHourlyAirQualityData = pgTable('google_hourly_air_quality_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id'), // 실제 DB에서는 nullable
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  locationName: text('location_name'), // 실제 DB 구조에 맞춤
  forecastDate: text('forecast_date').notNull(), // 실제 DB 구조
  forecastHour: integer('forecast_hour').notNull(), // 실제 DB 구조
  forecastDateTime: timestamp('forecast_datetime').notNull(), // 언더스코어 없음!
  pm10: integer('pm10'),
  pm25: integer('pm25'),
  caiKr: integer('cai_kr'), // 실제 DB 구조
  breezoMeterAqi: integer('breezo_meter_aqi'), // 실제 DB 구조
  no2: integer('no2'),
  o3: integer('o3'),
  so2: integer('so2'),
  co: integer('co'),
  units: text('units').default('metric').notNull(),
  rawData: jsonb('raw_data'),
  cacheKey: text('cache_key').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Google 일별 대기질 데이터 테이블
 * Google Air Quality API의 일별 데이터를 저장합니다.
 */
export const googleDailyAirQualityData = pgTable('google_daily_air_quality_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id'), // 실제 DB에서는 nullable
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  locationName: text('location_name'), // 실제 DB 구조에 맞춤
  forecastDate: text('forecast_date').notNull(), // text 타입으로 수정
  dayOfWeek: text('day_of_week').notNull(), // 실제 DB 구조
  pm10: integer('pm10'),
  pm10Max: integer('pm10_max'), // 실제 DB 구조
  pm10Min: integer('pm10_min'), // 실제 DB 구조
  pm25: integer('pm25'),
  pm25Max: integer('pm25_max'), // 실제 DB 구조
  pm25Min: integer('pm25_min'), // 실제 DB 구조
  caiKr: integer('cai_kr'), // 실제 DB 구조
  caiKrMax: integer('cai_kr_max'), // 실제 DB 구조
  caiKrMin: integer('cai_kr_min'), // 실제 DB 구조
  breezoMeterAqi: integer('breezo_meter_aqi'), // 실제 DB 구조
  breezoMeterAqiMax: integer('breezo_meter_aqi_max'), // 실제 DB 구조
  breezoMeterAqiMin: integer('breezo_meter_aqi_min'), // 실제 DB 구조
  no2: integer('no2'),
  o3: integer('o3'),
  so2: integer('so2'),
  co: integer('co'),
  units: text('units').default('metric').notNull(),
  forecastDays: integer('forecast_days').default(7).notNull(),
  rawData: jsonb('raw_data'),
  cacheKey: text('cache_key').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});


/**
 * 날씨 위치 키 테이블
 * 날씨 API에서 사용하는 위치 키를 저장합니다.
 */
export const weatherLocationKeys = pgTable('weather_location_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  locationName: text('location_name'),
  latitude: text('latitude'),
  longitude: text('longitude'),
  locationKey: text('location_key').notNull(),
  localizedName: text('localized_name'),
  countryCode: text('country_code'),
  administrativeArea: text('administrative_area'),
  searchType: text('search_type').notNull(),
  rawLocationData: jsonb('raw_location_data'),
  cacheKey: text('cache_key').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 웹훅 로그 테이블
 * 카카오톡 웹훅 등의 로그를 저장합니다.
 */
export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: text('source').notNull(), // kakao, line 등
  eventType: text('event_type').notNull(), // message, postback 등
  method: text('method'), // HTTP 메서드 (GET, POST 등)
  url: text('url'), // 요청 URL
  userId: text('user_id'), // 외부 서비스의 사용자 ID
  requestData: jsonb('request_data'), // 요청 데이터
  requestBody: jsonb('request_body'), // 요청 본문
  responseData: jsonb('response_data'), // 응답 데이터
  statusCode: integer('status_code'),
  isSuccessful: boolean('is_successful').default(false).notNull(), // 성공 여부
  errorMessage: text('error_message'),
  processingTime: integer('processing_time'), // 처리 시간 (ms)
  timestamp: timestamp('timestamp').defaultNow().notNull(), // 타임스탬프
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 카카오 메시지 테이블
 * 카카오톡 메시지 기록을 저장합니다.
 */
export const kakaoMessages = pgTable('kakao_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // 카카오 사용자 ID
  userKey: text('user_key'), // 카카오 사용자 키 (호환성을 위해 추가)
  userMessage: text('user_message').notNull(),
  botResponse: text('bot_response').notNull(),
  message: text('message'), // 메시지 내용
  messageType: text('message_type'), // 메시지 타입
  aiResponse: text('ai_response'), // AI 응답
  responseType: text('response_type'), // 응답 타입
  processingTime: text('processing_time'), // 처리 시간
  channelId: text('channel_id'), // 채널 ID
  rawData: jsonb('raw_data'), // 원본 데이터
  intent: text('intent'), // 감지된 의도
  confidence: text('confidence'), // 신뢰도
  sessionId: text('session_id'),
  metadata: jsonb('metadata'), // 추가 메타데이터
  isRead: boolean('is_read').default(false).notNull(), // 읽음 여부
  receivedAt: timestamp('received_at').defaultNow().notNull(), // 수신 시간
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 타입 정의 추가
export type ApiCallLog = typeof apiCallLogs.$inferSelect;
export type NewApiCallLog = typeof apiCallLogs.$inferInsert;

export type DailyApiStats = typeof dailyApiStats.$inferSelect;
export type NewDailyApiStats = typeof dailyApiStats.$inferInsert;

export type ChatGptConversation = typeof chatGptConversations.$inferSelect;
export type NewChatGptConversation = typeof chatGptConversations.$inferInsert;

export type EmailSendLog = typeof emailSendLogs.$inferSelect;
export type NewEmailSendLog = typeof emailSendLogs.$inferInsert;

export type IndividualEmailLog = typeof individualEmailLogs.$inferSelect;
export type NewIndividualEmailLog = typeof individualEmailLogs.$inferInsert;

export type GoogleHourlyAirQualityData = typeof googleHourlyAirQualityData.$inferSelect;
export type NewGoogleHourlyAirQualityData = typeof googleHourlyAirQualityData.$inferInsert;

export type GoogleDailyAirQualityData = typeof googleDailyAirQualityData.$inferSelect;
export type NewGoogleDailyAirQualityData = typeof googleDailyAirQualityData.$inferInsert;


export type WeatherLocationKey = typeof weatherLocationKeys.$inferSelect;
export type NewWeatherLocationKey = typeof weatherLocationKeys.$inferInsert;

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;

export type KakaoMessage = typeof kakaoMessages.$inferSelect;
export type NewKakaoMessage = typeof kakaoMessages.$inferInsert;

/**
 * 지역별 시간별 대기질 데이터 테이블
 * 지역별 시간별 대기질 데이터를 저장합니다.
 */
export const regionalHourlyAirQuality = pgTable('regional_hourly_air_quality', {
  id: uuid('id').defaultRandom().primaryKey(),
  regionCode: text('region_code').notNull(),
  regionName: text('region_name').notNull(),
  forecastDateTime: timestamp('forecast_datetime').notNull(),
  pm10Value: integer('pm10_value'),
  pm25Value: integer('pm25_value'),
  o3Value: integer('o3_value'),
  no2Value: integer('no2_value'),
  coValue: integer('co_value'),
  so2Value: integer('so2_value'),
  pm10Grade: integer('pm10_grade'),
  pm25Grade: integer('pm25_grade'),
  o3Grade: integer('o3_grade'),
  no2Grade: integer('no2_grade'),
  coGrade: integer('co_grade'),
  so2Grade: integer('so2_grade'),
  khaiValue: integer('khai_value'),
  khaiGrade: integer('khai_grade'),
  rawData: jsonb('raw_data'),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 지역별 일별 대기질 데이터 테이블
 * 지역별 일별 대기질 데이터를 저장합니다.
 */
export const regionalDailyAirQuality = pgTable('regional_daily_air_quality', {
  id: uuid('id').defaultRandom().primaryKey(),
  regionCode: text('region_code').notNull(),
  regionName: text('region_name').notNull(),
  forecastDate: timestamp('forecast_date').notNull(),
  pm10Value: integer('pm10_value'),
  pm25Value: integer('pm25_value'),
  o3Value: integer('o3_value'),
  no2Value: integer('no2_value'),
  coValue: integer('co_value'),
  so2Value: integer('so2_value'),
  pm10Grade: integer('pm10_grade'),
  pm25Grade: integer('pm25_grade'),
  o3Grade: integer('o3_grade'),
  no2Grade: integer('no2_grade'),
  coGrade: integer('co_grade'),
  so2Grade: integer('so2_grade'),
  khaiValue: integer('khai_value'),
  khaiGrade: integer('khai_grade'),
  rawData: jsonb('raw_data'),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 사용자 선택 측정소 테이블
 * 사용자가 선택한 대기질 측정소 정보를 저장합니다.
 */
export const userSelectedStations = pgTable('user_selected_stations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  stationName: text('station_name').notNull(),
  sido: text('sido').notNull(),
  isAutoSelected: boolean('is_auto_selected').default(false).notNull(),
  distance: integer('distance'), // 미터 단위
  stationAddress: text('station_address'),
  userLatitude: text('user_latitude'),
  userLongitude: text('user_longitude'),
  isDefault: boolean('is_default').default(false).notNull(),
  selectedAt: timestamp('selected_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 추가 타입 정의
export type RegionalHourlyAirQuality = typeof regionalHourlyAirQuality.$inferSelect;
export type NewRegionalHourlyAirQuality = typeof regionalHourlyAirQuality.$inferInsert;

export type RegionalDailyAirQuality = typeof regionalDailyAirQuality.$inferSelect;
export type NewRegionalDailyAirQuality = typeof regionalDailyAirQuality.$inferInsert;

export type UserSelectedStation = typeof userSelectedStations.$inferSelect;
export type NewUserSelectedStation = typeof userSelectedStations.$inferInsert;