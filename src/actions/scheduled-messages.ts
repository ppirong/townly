'use server';

import { db } from '@/db';
import { scheduledMessages, scheduledMessageLogs } from '@/db/schema';
import { auth } from '@clerk/nextjs/server';
import { desc, eq, and, gte, lte, count } from 'drizzle-orm';
import { z } from 'zod';

// 스케줄 메시지 생성 스키마
const createScheduledMessageSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요'),
  message: z.string().min(1, '메시지 내용을 입력해주세요').max(1000, '메시지는 1000자 이하로 입력해주세요'),
  scheduleType: z.enum(['daily', 'weekly', 'monthly', 'once']),
  scheduleTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, '시간 형식이 올바르지 않습니다 (HH:MM)'),
  scheduleDay: z.number().min(0).max(31).optional(),
  targetType: z.enum(['all', 'specific', 'segment']).default('all'),
  targetUsers: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

type CreateScheduledMessageInput = z.infer<typeof createScheduledMessageSchema>;

/**
 * 스케줄 메시지 생성
 */
export async function createScheduledMessage(input: CreateScheduledMessageInput) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  const validatedData = createScheduledMessageSchema.parse(input);
  
  try {
    // 다음 발송 시간 계산
    const nextSendAt = calculateNextSendTime(
      validatedData.scheduleType,
      validatedData.scheduleTime,
      validatedData.scheduleDay
    );
    
    const result = await db.insert(scheduledMessages).values({
      ...validatedData,
      nextSendAt,
      createdBy: userId,
      targetUsers: validatedData.targetUsers ? JSON.stringify(validatedData.targetUsers) : null,
    }).returning();
    
    return { success: true, scheduledMessage: result[0] };
  } catch (error) {
    console.error('스케줄 메시지 생성 오류:', error);
    throw new Error('스케줄 메시지를 생성하는 중 오류가 발생했습니다');
  }
}

/**
 * 스케줄 메시지 목록 조회
 */
export async function getScheduledMessages() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  try {
    const messages = await db
      .select()
      .from(scheduledMessages)
      .orderBy(desc(scheduledMessages.createdAt));
    
    return { success: true, messages };
  } catch (error) {
    console.error('스케줄 메시지 조회 오류:', error);
    throw new Error('스케줄 메시지를 조회하는 중 오류가 발생했습니다');
  }
}

/**
 * 스케줄 메시지 활성화/비활성화
 */
export async function toggleScheduledMessage(id: string, isActive: boolean) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  try {
    await db
      .update(scheduledMessages)
      .set({ 
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(scheduledMessages.id, id));
    
    return { success: true };
  } catch (error) {
    console.error('스케줄 메시지 상태 변경 오류:', error);
    throw new Error('스케줄 메시지 상태를 변경하는 중 오류가 발생했습니다');
  }
}

/**
 * 스케줄 메시지 삭제
 */
export async function deleteScheduledMessage(id: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  try {
    // 연관된 로그도 함께 삭제
    await db.delete(scheduledMessageLogs).where(eq(scheduledMessageLogs.scheduledMessageId, id));
    await db.delete(scheduledMessages).where(eq(scheduledMessages.id, id));
    
    return { success: true };
  } catch (error) {
    console.error('스케줄 메시지 삭제 오류:', error);
    throw new Error('스케줄 메시지를 삭제하는 중 오류가 발생했습니다');
  }
}

/**
 * 발송 예정인 메시지들 조회 (크론잡에서 사용)
 */
export async function getPendingMessages() {
  try {
    const now = new Date();
    
    const pendingMessages = await db
      .select()
      .from(scheduledMessages)
      .where(
        and(
          eq(scheduledMessages.isActive, true),
          lte(scheduledMessages.nextSendAt, now)
        )
      );
    
    return pendingMessages;
  } catch (error) {
    console.error('발송 예정 메시지 조회 오류:', error);
    return [];
  }
}

/**
 * 메시지 발송 처리 및 로그 기록
 */
export async function processScheduledMessage(messageId: string) {
  try {
    const message = await db
      .select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.id, messageId))
      .limit(1);
    
    if (!message.length) {
      throw new Error('스케줄 메시지를 찾을 수 없습니다');
    }
    
    const scheduledMessage = message[0];
    const startTime = Date.now();
    
    // 카카오 메시지 전송 API 호출
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/kakao/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: scheduledMessage.message,
        recipient: 'scheduled_broadcast',
      }),
    });
    
    const result = await response.json();
    const executionTime = Date.now() - startTime;
    
    // 발송 로그 기록
    await db.insert(scheduledMessageLogs).values({
      scheduledMessageId: messageId,
      recipientCount: 1, // 브로드캐스트는 채널 전체에 발송되므로 1로 기록
      successCount: result.success ? 1 : 0,
      failureCount: result.success ? 0 : 1,
      errorMessage: result.success ? null : result.error,
      isSuccessful: result.success,
      executionTime,
    });
    
    // 스케줄 메시지 업데이트
    let nextSendAt: Date;
    let isActive: boolean;
    
    if (scheduledMessage.scheduleType === 'once') {
      // 일회성 발송의 경우 먼 미래 날짜로 설정하고 비활성화
      nextSendAt = new Date('2099-12-31T23:59:59Z');
      isActive = false;
    } else {
      // 반복 스케줄의 경우 다음 발송 시간 계산
      nextSendAt = calculateNextSendTime(
        scheduledMessage.scheduleType,
        scheduledMessage.scheduleTime,
        scheduledMessage.scheduleDay
      );
      isActive = scheduledMessage.isActive;
    }
    
    await db
      .update(scheduledMessages)
      .set({
        lastSentAt: new Date(),
        nextSendAt,
        totalSentCount: scheduledMessage.totalSentCount + 1,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(scheduledMessages.id, messageId));
    
    return { success: true, result };
  } catch (error) {
    console.error('스케줄 메시지 처리 오류:', error);
    
    // 에러 로그 기록
    await db.insert(scheduledMessageLogs).values({
      scheduledMessageId: messageId,
      recipientCount: 0,
      successCount: 0,
      failureCount: 1,
      errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
      isSuccessful: false,
      executionTime: 0,
    });
    
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' };
  }
}

/**
 * 다음 발송 시간 계산
 */
function calculateNextSendTime(
  scheduleType: string,
  scheduleTime: string,
  scheduleDay?: number | null
): Date {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  const now = new Date();
  const nextSend = new Date();
  
  // 오늘 해당 시간으로 설정
  nextSend.setHours(hours, minutes, 0, 0);
  
  switch (scheduleType) {
    case 'daily':
      // 오늘 시간이 지났으면 내일로
      if (nextSend <= now) {
        nextSend.setDate(nextSend.getDate() + 1);
      }
      break;
      
    case 'weekly':
      // 지정된 요일로 설정 (0: 일요일, 1: 월요일, ...)
      const targetDay = scheduleDay || 0;
      const currentDay = nextSend.getDay();
      let daysToAdd = targetDay - currentDay;
      
      if (daysToAdd < 0 || (daysToAdd === 0 && nextSend <= now)) {
        daysToAdd += 7; // 다음 주로
      }
      
      nextSend.setDate(nextSend.getDate() + daysToAdd);
      break;
      
    case 'monthly':
      // 지정된 날짜로 설정
      const targetDate = scheduleDay || 1;
      nextSend.setDate(targetDate);
      
      // 이번 달 날짜가 지났거나 오늘인데 시간이 지났으면 다음 달로
      if (nextSend <= now) {
        nextSend.setMonth(nextSend.getMonth() + 1);
        nextSend.setDate(targetDate);
      }
      break;
      
    case 'once':
      // 일회성 발송은 오늘 시간이 지났으면 내일로
      if (nextSend <= now) {
        nextSend.setDate(nextSend.getDate() + 1);
      }
      break;
  }
  
  return nextSend;
}

/**
 * 스케줄 메시지 발송 통계
 */
export async function getScheduledMessageStats() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized: 관리자 로그인이 필요합니다');
  }
  
  try {
    // 총 스케줄 수
    const totalSchedules = await db
      .select({ count: count() })
      .from(scheduledMessages);
    
    // 활성 스케줄 수
    const activeSchedules = await db
      .select({ count: count() })
      .from(scheduledMessages)
      .where(eq(scheduledMessages.isActive, true));
    
    // 최근 30일 발송 통계
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLogs = await db
      .select({
        successCount: count(),
      })
      .from(scheduledMessageLogs)
      .where(
        and(
          gte(scheduledMessageLogs.sentAt, thirtyDaysAgo),
          eq(scheduledMessageLogs.isSuccessful, true)
        )
      );
    
    return {
      totalSchedules: totalSchedules[0]?.count || 0,
      activeSchedules: activeSchedules[0]?.count || 0,
      recentSuccessfulSends: recentLogs[0]?.successCount || 0,
    };
  } catch (error) {
    console.error('스케줄 메시지 통계 조회 오류:', error);
    throw new Error('통계를 조회하는 중 오류가 발생했습니다');
  }
}
