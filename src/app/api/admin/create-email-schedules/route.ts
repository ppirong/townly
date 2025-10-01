import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { emailSchedules } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 이메일 발송 스케줄 생성 API
 * 한국시간 기준: 18:00, 19:00, 23:00, 01:00, 06:00
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 이메일 발송 스케줄 생성 중...');

    const schedules = [
      {
        title: '저녁 날씨 안내 (18:00)',
        description: '저녁 6시 날씨 안내 이메일',
        emailSubject: '🌤️ 오늘 저녁 날씨 안내',
        emailTemplate: 'weather_summary',
        scheduleTime: '18:00',
        timezone: 'Asia/Seoul',
        targetType: 'all_users',
        isActive: true,
        createdBy: userId,
      },
      {
        title: '저녁 날씨 안내 (19:00)',
        description: '저녁 7시 날씨 안내 이메일',
        emailSubject: '🌤️ 오늘 저녁 날씨 안내',
        emailTemplate: 'weather_summary',
        scheduleTime: '19:00',
        timezone: 'Asia/Seoul',
        targetType: 'all_users',
        isActive: true,
        createdBy: userId,
      },
      {
        title: '밤 날씨 안내 (23:00)',
        description: '밤 11시 내일 날씨 안내 이메일',
        emailSubject: '🌙 내일 날씨 미리보기',
        emailTemplate: 'weather_summary',
        scheduleTime: '23:00',
        timezone: 'Asia/Seoul',
        targetType: 'all_users',
        isActive: true,
        createdBy: userId,
      },
      {
        title: '새벽 날씨 안내 (01:00)',
        description: '새벽 1시 오늘 날씨 안내 이메일',
        emailSubject: '🌃 새벽 날씨 안내',
        emailTemplate: 'weather_summary',
        scheduleTime: '01:00',
        timezone: 'Asia/Seoul',
        targetType: 'all_users',
        isActive: true,
        createdBy: userId,
      },
      {
        title: '아침 날씨 안내 (06:00)',
        description: '아침 6시 오늘 날씨 안내 이메일',
        emailSubject: '☀️ 좋은 아침! 오늘의 날씨',
        emailTemplate: 'weather_summary',
        scheduleTime: '06:00',
        timezone: 'Asia/Seoul',
        targetType: 'all_users',
        isActive: true,
        createdBy: userId,
      },
    ];

    const createdSchedules = [];
    const skippedSchedules = [];

    for (const schedule of schedules) {
      // 다음 발송 시간 계산
      const nextSendAt = calculateNextSendTime(schedule.scheduleTime, schedule.timezone);
      
      // 기존 스케줄이 있는지 확인
      const existing = await db
        .select()
        .from(emailSchedules)
        .where(eq(emailSchedules.scheduleTime, schedule.scheduleTime))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⏭️  ${schedule.scheduleTime} 스케줄이 이미 존재합니다. 건너뜁니다.`);
        skippedSchedules.push(schedule.title);
        continue;
      }

      // 새 스케줄 생성
      await db.insert(emailSchedules).values({
        ...schedule,
        id: crypto.randomUUID(),
        nextSendAt,
        totalSentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ ${schedule.title} 스케줄 생성 완료`);
      createdSchedules.push(schedule.title);
    }

    // 생성된 스케줄 확인
    const allSchedules = await db.select().from(emailSchedules);
    
    return NextResponse.json({
      success: true,
      message: '이메일 스케줄 생성 완료',
      created: createdSchedules,
      skipped: skippedSchedules,
      totalSchedules: allSchedules.length,
      schedules: allSchedules.map(s => ({
        id: s.id,
        title: s.title,
        scheduleTime: s.scheduleTime,
        isActive: s.isActive,
        nextSendAt: s.nextSendAt,
      })),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 이메일 스케줄 생성 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

/**
 * 다음 발송 시간 계산
 */
function calculateNextSendTime(scheduleTime: string, timezone: string): Date {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  
  // 현재 한국 시간
  const now = new Date();
  const kstNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  // 오늘 해당 시간으로 설정
  const nextSend = new Date(kstNow);
  nextSend.setHours(hours, minutes, 0, 0);
  
  // 이미 지난 시간이면 내일로 설정
  if (nextSend <= kstNow) {
    nextSend.setDate(nextSend.getDate() + 1);
  }
  
  // UTC로 변환하여 반환
  return new Date(nextSend.toLocaleString('en-US', { timeZone: 'UTC' }));
}

/**
 * 현재 이메일 스케줄 조회
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allSchedules = await db.select().from(emailSchedules);
    
    return NextResponse.json({
      success: true,
      schedules: allSchedules.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        scheduleTime: s.scheduleTime,
        timezone: s.timezone,
        isActive: s.isActive,
        nextSendAt: s.nextSendAt,
        totalSentCount: s.totalSentCount,
        createdAt: s.createdAt,
      })),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ 이메일 스케줄 조회 중 오류:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
