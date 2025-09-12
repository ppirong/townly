import { pgTable, text, timestamp, uuid, boolean, jsonb } from 'drizzle-orm/pg-core';

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

export type KakaoMessage = typeof kakaoMessages.$inferSelect;
export type NewKakaoMessage = typeof kakaoMessages.$inferInsert;
export type KakaoResponse = typeof kakaoResponses.$inferSelect;
export type NewKakaoResponse = typeof kakaoResponses.$inferInsert;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;
