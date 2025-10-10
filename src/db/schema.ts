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
  name: text('name').notNull(),
  description: text('description'),
  cronExpression: text('cron_expression').notNull(),
  emailType: text('email_type').notNull(), // weather, news, etc.
  isActive: boolean('is_active').default(true).notNull(),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
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
  locationName: text('location_name').notNull(),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  address: text('address'),
  isDefault: boolean('is_default').default(false).notNull(),
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
  locationKey: text('location_key').notNull(),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  hourlyData: jsonb('hourly_data'),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 일별 날씨 데이터 테이블
 * 위치별 일별 날씨 데이터를 저장합니다.
 */
export const dailyWeatherData = pgTable('daily_weather_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  locationKey: text('location_key').notNull(),
  latitude: text('latitude').notNull(),
  longitude: text('longitude').notNull(),
  dailyData: jsonb('daily_data'),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
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

// 타입 정의
export type Mart = typeof marts.$inferSelect;
export type NewMart = typeof marts.$inferInsert;

export type MartDiscount = typeof martDiscounts.$inferSelect;
export type NewMartDiscount = typeof martDiscounts.$inferInsert;

export type MartDiscountItem = typeof martDiscountItems.$inferSelect;
export type NewMartDiscountItem = typeof martDiscountItems.$inferInsert;