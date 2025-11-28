/**
 * 카카오 메시지 DTO 매퍼
 * DB 마스터 규칙: DB 타입을 클라이언트로 직접 전달 금지, 반드시 DTO 매퍼 사용
 */

import type { KakaoMessage } from '@/db/schema';
import { toISOString, toISOStringOrNull } from '@/lib/utils';

/**
 * 클라이언트용 카카오 메시지 DTO 타입
 */
export interface ClientKakaoMessage {
  id: string;
  userKey: string;
  message: string; // null을 빈 문자열로 변환
  messageType: string | null;
  receivedAt: Date;
  isRead: boolean;
  createdAt: Date;
}

/**
 * 클라이언트용 웹훅 로그 DTO 타입
 */
export interface ClientWebhookLog {
  id: string;
  method: string;
  url: string;
  statusCode: number;
  isSuccessful: boolean;
  errorMessage: string | null;
  timestamp: Date;
  requestBody: unknown;
  processingTime: number;
}

/**
 * 카카오 메시지 DTO 매퍼 (getKakaoMessages 결과용)
 * DB 마스터 규칙 5.1: 기본 엔티티 매퍼 적용
 */
export function mapKakaoMessageForClient(db: {
  id: string;
  userKey: string | null;
  message: string | null;
  messageType: string | null;
  receivedAt: Date;
  isRead: boolean;
  createdAt: Date;
}): ClientKakaoMessage {
  return {
    id: db.id,
    userKey: db.userKey || '', // null 안전성 확보
    message: db.message || '', // null 안전성 확보
    messageType: db.messageType,
    receivedAt: db.receivedAt,
    isRead: db.isRead,
    createdAt: db.createdAt,
  };
}

/**
 * 카카오 메시지 배열 DTO 매퍼
 */
export function mapKakaoMessagesForClient(dbMessages: {
  id: string;
  userKey: string | null;
  message: string | null;
  messageType: string | null;
  receivedAt: Date;
  isRead: boolean;
  createdAt: Date;
}[]): ClientKakaoMessage[] {
  return dbMessages.map(mapKakaoMessageForClient);
}

/**
 * 웹훅 로그 DTO 매퍼
 * DB 마스터 규칙 5.1: 기본 엔티티 매퍼 적용
 */
export function mapWebhookLogForClient(db: {
  id: string;
  method: string | null;
  url: string | null;
  statusCode: number | null;
  isSuccessful: boolean;
  errorMessage: string | null;
  timestamp: Date;
  requestBody: unknown;
  processingTime: number | null;
}): ClientWebhookLog {
  return {
    id: db.id,
    method: db.method || 'GET', // null 안전성 확보
    url: db.url || '', // null 안전성 확보
    statusCode: db.statusCode || 0, // null 안전성 확보
    isSuccessful: db.isSuccessful,
    errorMessage: db.errorMessage,
    timestamp: db.timestamp,
    requestBody: db.requestBody,
    processingTime: db.processingTime || 0, // null 안전성 확보
  };
}

/**
 * 웹훅 로그 배열 DTO 매퍼
 */
export function mapWebhookLogsForClient(dbLogs: {
  id: string;
  method: string | null;
  url: string | null;
  statusCode: number | null;
  isSuccessful: boolean;
  errorMessage: string | null;
  timestamp: Date;
  requestBody: unknown;
  processingTime: number | null;
}[]): ClientWebhookLog[] {
  return dbLogs.map(mapWebhookLogForClient);
}
