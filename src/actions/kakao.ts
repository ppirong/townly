'use server';

import { db } from '@/db';
import { kakaoMessages, webhookLogs } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { desc, eq, and, gte, lte, count } from 'drizzle-orm';
import { 
  getMessagesSchema, 
  markAsReadSchema, 
  markMultipleAsReadSchema,
  type GetMessagesInput,
  type MarkAsReadInput,
  type MarkMultipleAsReadInput 
} from '@/lib/schemas/kakao';

/**
 * 카카오 메시지 목록 조회
 */
export async function getKakaoMessages(input: Partial<GetMessagesInput> = {}) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  // 입력 데이터 검증 (기본값 적용)
  const validatedData = getMessagesSchema.parse({
    limit: 50,
    offset: 0,
    ...input,
  });
  const { limit, offset, userKey, isRead, startDate, endDate } = validatedData;
  
  try {
    // WHERE 조건 구성
    const conditions = [];
    
    if (userKey) {
      conditions.push(eq(kakaoMessages.userId, userKey));
    }
    
    if (isRead !== undefined) {
      conditions.push(eq(kakaoMessages.isRead, isRead));
    }
    
    if (startDate) {
      conditions.push(gte(kakaoMessages.receivedAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(kakaoMessages.receivedAt, endDate));
    }
    
    // 메시지 조회 (최신순)
    const messages = await db
      .select({
        id: kakaoMessages.id,
        userKey: kakaoMessages.userId,
        message: kakaoMessages.message,
        messageType: kakaoMessages.messageType,
        receivedAt: kakaoMessages.receivedAt,
        isRead: kakaoMessages.isRead,
        createdAt: kakaoMessages.createdAt,
      })
      .from(kakaoMessages)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(kakaoMessages.receivedAt))
      .limit(limit)
      .offset(offset);
    
    // 전체 메시지 수 조회
    const totalResult = await db
      .select({ count: count() })
      .from(kakaoMessages)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = totalResult[0]?.count || 0;
    
    return {
      messages,
      total,
      hasMore: offset + messages.length < total,
    };
  } catch (error) {
    console.error('메시지 조회 오류:', error);
    throw new Error('메시지를 조회하는 중 오류가 발생했습니다');
  }
}

/**
 * 단일 메시지를 읽음으로 표시
 */
export async function markMessageAsRead(input: MarkAsReadInput) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  const validatedData = markAsReadSchema.parse(input);
  const { messageId } = validatedData;
  
  try {
    await db
      .update(kakaoMessages)
      .set({ 
        isRead: true,
        updatedAt: new Date(),
      })
      .where(eq(kakaoMessages.id, messageId));
    
    return { success: true, messageId };
  } catch (error) {
    console.error('메시지 읽음 처리 오류:', error);
    throw new Error('메시지 상태를 업데이트하는 중 오류가 발생했습니다');
  }
}

/**
 * 여러 메시지를 읽음으로 표시
 */
export async function markMultipleMessagesAsRead(input: MarkMultipleAsReadInput) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  const validatedData = markMultipleAsReadSchema.parse(input);
  const { messageIds } = validatedData;
  
  try {
    // 각 메시지를 개별적으로 업데이트
    const results = await Promise.all(
      messageIds.map(messageId =>
        db.update(kakaoMessages)
          .set({ 
            isRead: true,
            updatedAt: new Date(),
          })
          .where(eq(kakaoMessages.id, messageId))
      )
    );
    
    return { 
      success: true, 
      updatedCount: results.length,
      messageIds 
    };
  } catch (error) {
    console.error('메시지 읽음 처리 오류:', error);
    throw new Error('메시지 상태를 업데이트하는 중 오류가 발생했습니다');
  }
}

/**
 * 모든 메시지를 읽음으로 표시
 */
export async function markAllMessagesAsRead() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  try {
    await db
      .update(kakaoMessages)
      .set({ 
        isRead: true,
        updatedAt: new Date(),
      })
      .where(eq(kakaoMessages.isRead, false));
    
    return { success: true };
  } catch (error) {
    console.error('모든 메시지 읽음 처리 오류:', error);
    throw new Error('메시지 상태를 업데이트하는 중 오류가 발생했습니다');
  }
}

/**
 * 읽지 않은 메시지 수 조회
 */
export async function getUnreadMessageCount() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  try {
    const result = await db
      .select({ count: count() })
      .from(kakaoMessages)
      .where(eq(kakaoMessages.isRead, false));
    
    return result[0]?.count || 0;
  } catch (error) {
    console.error('읽지 않은 메시지 수 조회 오류:', error);
    throw new Error('읽지 않은 메시지 수를 조회하는 중 오류가 발생했습니다');
  }
}

/**
 * 사용자별 메시지 통계 조회
 */
export async function getUserMessageStats() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  try {
    const stats = await db
      .select({
        userKey: kakaoMessages.userId,
        totalMessages: count(),
      })
      .from(kakaoMessages)
      .groupBy(kakaoMessages.userId)
      .orderBy(desc(count()));
    
    return stats;
  } catch (error) {
    console.error('사용자 메시지 통계 조회 오류:', error);
    throw new Error('사용자 통계를 조회하는 중 오류가 발생했습니다');
  }
}

/**
 * 웹훅 상태 및 디버깅 정보 조회
 */
export async function getWebhookDebugInfo() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  try {
    // 최근 24시간 웹훅 로그 조회
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentLogs = await db
      .select({
        id: webhookLogs.id,
        method: webhookLogs.method,
        url: webhookLogs.url,
        statusCode: webhookLogs.statusCode,
        isSuccessful: webhookLogs.isSuccessful,
        errorMessage: webhookLogs.errorMessage,
        timestamp: webhookLogs.timestamp,
        requestBody: webhookLogs.requestBody,
        processingTime: webhookLogs.processingTime,
      })
      .from(webhookLogs)
      .where(gte(webhookLogs.timestamp, oneDayAgo))
      .orderBy(desc(webhookLogs.timestamp))
      .limit(50);
    
    // 웹훅 통계 계산
    const totalRequests = recentLogs.length;
    const successfulRequests = recentLogs.filter(log => log.isSuccessful).length;
    const failedRequests = totalRequests - successfulRequests;
    const lastRequestTime = recentLogs[0]?.timestamp || null;
    
    // 최근 메시지 수신 통계
    const recentMessages = await db
      .select({ count: count() })
      .from(kakaoMessages)
      .where(gte(kakaoMessages.receivedAt, oneDayAgo));
    
    const messageCount = recentMessages[0]?.count || 0;
    
    return {
      webhookStats: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 0,
        lastRequestTime,
      },
      messageStats: {
        recentMessageCount: messageCount,
      },
      recentLogs: recentLogs.slice(0, 10), // 최근 10개만 반환
      isWebhookHealthy: successfulRequests > 0 && failedRequests < 5,
    };
  } catch (error) {
    console.error('웹훅 디버깅 정보 조회 오류:', error);
    throw new Error('웹훅 상태를 조회하는 중 오류가 발생했습니다');
  }
}

/**
 * 웹훅 연결 테스트
 */
export async function testWebhookConnection() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  try {
    // 현재 ngrok URL 가져오기 (환경변수에서)
    const webhookUrl = process.env.WEBHOOK_URL || 'https://2da26f20f041.ngrok-free.app';
    const testUrl = `${webhookUrl}/api/kakao/webhook`;
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const responseData = await response.text();
    
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responseData,
      testUrl,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('웹훅 연결 테스트 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      testUrl: process.env.WEBHOOK_URL || 'URL을 찾을 수 없음',
      timestamp: new Date(),
    };
  }
}
