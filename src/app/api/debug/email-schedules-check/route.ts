import { NextResponse } from 'next/server';
import { db } from '@/db';
import { emailSchedules } from '@/db/schema';
import { desc } from 'drizzle-orm';

/**
 * 이메일 스케줄 디버그 조회 API (인증 불필요)
 * GET /api/debug/email-schedules-check
 */
export async function GET() {
  try {
    console.log('🔍 이메일 스케줄 디버그 조회 시작');

    // 현재 시간 정보
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));

    // 모든 이메일 스케줄 조회
    const schedules = await db
      .select()
      .from(emailSchedules)
      .orderBy(desc(emailSchedules.createdAt));

    console.log(`📧 발견된 이메일 스케줄 수: ${schedules.length}`);

    // 스케줄 분석 및 시간대 변환
    const processedSchedules = schedules.map(schedule => {
      const utcNextSend = new Date(schedule.nextSendAt);
      const kstNextSend = new Date(utcNextSend.getTime() + (9 * 60 * 60 * 1000));
      
      return {
        id: schedule.id,
        title: schedule.title,
        scheduleTime: schedule.scheduleTime, // 입력된 KST 시간
        timezone: schedule.timezone,
        status: schedule.isActive ? 'active' : 'inactive',
        nextSendAt: {
          utc: utcNextSend.toISOString(),
          kst: kstNextSend.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          utcHour: utcNextSend.getUTCHours(),
          utcMinute: utcNextSend.getUTCMinutes(),
        },
        createdAt: schedule.createdAt,
        lastSentAt: schedule.lastSentAt,
        totalSentCount: schedule.totalSentCount,
      };
    });

    // 14:40 스케줄 찾기
    const schedule1440 = processedSchedules.find(s => s.scheduleTime === '14:40');

    return NextResponse.json({
      message: '이메일 스케줄 디버그 조회 성공',
      currentTime: {
        utc: now.toISOString(),
        kst: kstTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      },
      totalSchedules: schedules.length,
      activeSchedules: schedules.filter(s => s.isActive).length,
      schedules: processedSchedules,
      schedule1440: schedule1440 ? {
        found: true,
        data: schedule1440,
        explanation: {
          inputTime: '14:40 (KST 오후 2시 40분)',
          storedUtc: schedule1440.nextSendAt.utc,
          storedKst: schedule1440.nextSendAt.kst,
          requiredCronJob: `${schedule1440.nextSendAt.utcMinute} ${schedule1440.nextSendAt.utcHour} * * *`,
          currentCronJob: '0 21,9 * * *',
          willExecute: schedule1440.nextSendAt.utcHour === 20 && schedule1440.nextSendAt.utcMinute === 40 ? 
            '현재 크론잡으로는 실행되지 않음' : 
            '현재 크론잡으로는 실행되지 않음'
        }
      } : {
        found: false,
        message: '14:40 스케줄을 찾을 수 없습니다'
      },
      vercelCronStatus: {
        current: '0 21,9 * * *',
        meaning: 'UTC 21:00 (KST 06:00), UTC 09:00 (KST 18:00)',
        note: '14:40 KST 발송을 위해서는 "40 5 * * *" (UTC 05:40 = KST 14:40) 크론잡 추가 필요'
      }
    });
  } catch (error) {
    console.error('❌ 이메일 스케줄 디버그 조회 실패:', error);
    return NextResponse.json({ 
      message: '이메일 스케줄 디버그 조회 실패', 
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
