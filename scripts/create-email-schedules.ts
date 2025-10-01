#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { db } from '../src/db';
import { emailSchedules } from '../src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 이메일 발송 스케줄 생성 스크립트
 * 한국시간 기준: 18:00, 19:00, 23:00, 01:00, 06:00
 */
async function createEmailSchedules() {
  try {
    console.log('🔄 이메일 발송 스케줄 생성 중...');

    // 관리자 사용자 ID (실제 환경에서는 적절한 관리자 ID로 변경)
    const adminUserId = 'admin_user_id'; // 실제 Clerk 사용자 ID로 변경 필요

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
        createdBy: adminUserId,
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
        createdBy: adminUserId,
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
        createdBy: adminUserId,
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
        createdBy: adminUserId,
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
        createdBy: adminUserId,
      },
    ];

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
    }

    console.log('🎉 모든 이메일 스케줄 생성 완료!');
    
    // 생성된 스케줄 확인
    const allSchedules = await db.select().from(emailSchedules);
    console.log('\n📋 생성된 스케줄 목록:');
    allSchedules.forEach(schedule => {
      console.log(`   - ${schedule.title}: ${schedule.scheduleTime} (${schedule.isActive ? '활성' : '비활성'})`);
    });

  } catch (error) {
    console.error('❌ 이메일 스케줄 생성 중 오류:', error);
    process.exit(1);
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

// 스크립트 실행
if (require.main === module) {
  createEmailSchedules()
    .then(() => {
      console.log('✅ 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export { createEmailSchedules };
