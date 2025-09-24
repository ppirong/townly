import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { scheduledMessages } from '@/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { z } from 'zod';

// 예약 메시지 생성 스키마
const createScheduledMessageSchema = z.object({
  title: z.string().min(1, '제목은 필수입니다').max(100, '제목은 100자 이하여야 합니다'),
  message: z.string().min(1, '메시지 내용은 필수입니다').max(1000, '메시지는 1000자 이하여야 합니다'),
  scheduleType: z.enum(['daily', 'weekly', 'monthly', 'once'], {
    message: '유효하지 않은 스케줄 타입입니다'
  }),
  scheduleTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '유효한 시간 형식이 아닙니다'),
  scheduleDay: z.number().int().min(0).max(31).optional(),
  isActive: z.boolean().default(true),
});

// 다음 발송 시간 계산
function calculateNextSendTime(scheduleType: string, scheduleTime: string, scheduleDay?: number): Date {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  const now = new Date();
  const nextSend = new Date();
  
  nextSend.setHours(hours, minutes, 0, 0);
  
  switch (scheduleType) {
    case 'daily':
      // 오늘 시간이 지났으면 내일로
      if (nextSend <= now) {
        nextSend.setDate(nextSend.getDate() + 1);
      }
      break;
      
    case 'weekly':
      if (scheduleDay !== undefined) {
        // 이번 주 해당 요일로 설정
        const currentDay = nextSend.getDay();
        const daysUntilTarget = (scheduleDay - currentDay + 7) % 7;
        
        if (daysUntilTarget === 0 && nextSend <= now) {
          // 오늘이 목표 요일이지만 시간이 지났으면 다음 주
          nextSend.setDate(nextSend.getDate() + 7);
        } else if (daysUntilTarget > 0) {
          nextSend.setDate(nextSend.getDate() + daysUntilTarget);
        }
      }
      break;
      
    case 'monthly':
      if (scheduleDay !== undefined) {
        nextSend.setDate(scheduleDay);
        // 이번 달 날짜가 지났으면 다음 달로
        if (nextSend <= now) {
          nextSend.setMonth(nextSend.getMonth() + 1);
          nextSend.setDate(scheduleDay);
        }
      }
      break;
      
    case 'once':
      // 일회성은 오늘 시간이 지났으면 내일로
      if (nextSend <= now) {
        nextSend.setDate(nextSend.getDate() + 1);
      }
      break;
  }
  
  return nextSend;
}

// GET: 예약 메시지 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 메시지 목록 조회
    const messagesList = await db
      .select()
      .from(scheduledMessages)
      .orderBy(desc(scheduledMessages.createdAt));

    // 통계 계산
    const [totalResult] = await db
      .select({ count: count() })
      .from(scheduledMessages);

    const [activeResult] = await db
      .select({ count: count() })
      .from(scheduledMessages)
      .where(eq(scheduledMessages.isActive, true));

    // 최근 30일 발송 성공 횟수 (간단하게 totalSentCount의 합으로 계산)
    const recentSends = messagesList.reduce((sum, msg) => sum + (msg.totalSentCount || 0), 0);

    const stats = {
      totalSchedules: totalResult.count,
      activeSchedules: activeResult.count,
      recentSuccessfulSends: recentSends,
    };

    return NextResponse.json({
      messages: messagesList,
      stats,
    });
  } catch (error) {
    console.error('예약 메시지 조회 오류:', error);
    return NextResponse.json(
      { error: '예약 메시지를 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// POST: 새 예약 메시지 생성
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // 데이터 검증
    const validatedData = createScheduledMessageSchema.parse(body);
    
    // 스케줄 타입별 scheduleDay 검증
    if (validatedData.scheduleType === 'weekly' && validatedData.scheduleDay === undefined) {
      return NextResponse.json({ error: '주간 스케줄의 경우 요일을 선택해야 합니다' }, { status: 400 });
    }
    
    if (validatedData.scheduleType === 'monthly' && validatedData.scheduleDay === undefined) {
      return NextResponse.json({ error: '월간 스케줄의 경우 날짜를 선택해야 합니다' }, { status: 400 });
    }

    // 다음 발송 시간 계산
    const nextSendAt = calculateNextSendTime(
      validatedData.scheduleType,
      validatedData.scheduleTime,
      validatedData.scheduleDay
    );

    // 데이터베이스에 저장
    const [newMessage] = await db
      .insert(scheduledMessages)
      .values({
        id: crypto.randomUUID(),
        title: validatedData.title,
        message: validatedData.message,
        scheduleType: validatedData.scheduleType,
        scheduleTime: validatedData.scheduleTime,
        scheduleDay: validatedData.scheduleDay,
        isActive: validatedData.isActive,
        nextSendAt: nextSendAt,
        totalSentCount: 0,
        createdBy: userId, // 생성자 ID 추가
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error('예약 메시지 생성 오류:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: '예약 메시지 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
