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
 * 정기 발송 메시지 스케줄 테이블
 */
export const scheduledMessages = pgTable('scheduled_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 스케줄 정보
  title: text('title').notNull(), // 스케줄 제목 (관리용)
  message: text('message').notNull(), // 발송할 메시지 내용
  
  // 발송 스케줄 설정
  scheduleType: text('schedule_type').notNull(), // 'daily', 'weekly', 'monthly', 'once'
  scheduleTime: text('schedule_time').notNull(), // 'HH:MM' 형식 (예: '09:00')
  scheduleDay: integer('schedule_day'), // 주간: 0-6 (일-토), 월간: 1-31
  timezone: text('timezone').default('Asia/Seoul').notNull(),
  
  // 발송 대상
  targetType: text('target_type').default('all').notNull(), // 'all', 'specific', 'segment'
  targetUsers: jsonb('target_users'), // 특정 사용자 타겟팅 시 사용
  
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
 * 스케줄 메시지 발송 로그 테이블
 */
export const scheduledMessageLogs = pgTable('scheduled_message_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 연결된 스케줄
  scheduledMessageId: uuid('scheduled_message_id').references(() => scheduledMessages.id).notNull(),
  
  // 발송 결과
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  recipientCount: integer('recipient_count').notNull(), // 발송 대상자 수
  successCount: integer('success_count').notNull(), // 성공한 발송 수
  failureCount: integer('failure_count').default(0).notNull(), // 실패한 발송 수
  
  // 에러 정보
  errorMessage: text('error_message'),
  isSuccessful: boolean('is_successful').default(true).notNull(),
  
  // 메타데이터
  executionTime: integer('execution_time'), // 실행 시간 (ms)
  
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

// 타입 정의
export type KakaoMessage = typeof kakaoMessages.$inferSelect;
export type NewKakaoMessage = typeof kakaoMessages.$inferInsert;
export type KakaoResponse = typeof kakaoResponses.$inferSelect;
export type NewKakaoResponse = typeof kakaoResponses.$inferInsert;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;
export type ScheduledMessage = typeof scheduledMessages.$inferSelect;
export type NewScheduledMessage = typeof scheduledMessages.$inferInsert;
export type ScheduledMessageLog = typeof scheduledMessageLogs.$inferSelect;
export type NewScheduledMessageLog = typeof scheduledMessageLogs.$inferInsert;
export type UserLocation = typeof userLocations.$inferSelect;
export type NewUserLocation = typeof userLocations.$inferInsert;
export type UserSelectedStation = typeof userSelectedStations.$inferSelect;
export type NewUserSelectedStation = typeof userSelectedStations.$inferInsert;
