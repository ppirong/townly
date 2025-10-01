import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailSchedules } from '@/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { executeScheduledEmail } from '@/actions/email-schedules';
import { env } from '@/lib/env';

/**
 * 크론 작업 API 엔드포인트
 * 정해진 시간에 스케줄된 이메일을 발송합니다.
 * 
 * GET /api/cron/email-scheduler
 * 
 * Vercel Cron Jobs 설정 예시:
 * - 매일 06:00: "0 6 * * *"
 * - 매일 18:00: "0 18 * * *"
 */
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // 인증 헤더 확인 (보안을 위해)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${env.CRON_SECRET}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 현재 시간에 발송해야 할 스케줄 조회
    const now = new Date();
    const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    
    console.log(`🕐 크론잡 실행 시간:`);
    console.log(`   UTC: ${now.toISOString()}`);
    console.log(`   KST: ${kstNow.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    
    const schedulesToExecute = await db
      .select()
      .from(emailSchedules)
      .where(and(
        eq(emailSchedules.isActive, true),
        lte(emailSchedules.nextSendAt, now)
      ));

    console.log(`📧 발송 대상 스케줄: ${schedulesToExecute.length}개`);
    
    // 각 스케줄의 시간 정보 로깅
    schedulesToExecute.forEach((schedule, index) => {
      const scheduleKst = new Date(schedule.nextSendAt.getTime() + (9 * 60 * 60 * 1000));
      console.log(`   ${index + 1}. ${schedule.title}`);
      console.log(`      예정 시간(UTC): ${schedule.nextSendAt.toISOString()}`);
      console.log(`      예정 시간(KST): ${scheduleKst.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    });

    const results = [];
    let totalSuccess = 0;
    let totalFailure = 0;

    // 각 스케줄 실행
    for (const schedule of schedulesToExecute) {
      try {
        console.log(`Executing schedule: ${schedule.title} (${schedule.id})`);
        
        const result = await executeScheduledEmail(schedule.id);
        
        results.push({
          scheduleId: schedule.id,
          title: schedule.title,
          success: true,
          result: {
            totalSent: result.totalSent,
            successCount: result.successCount,
            failureCount: result.failureCount,
            executionTime: result.executionTime,
          },
        });

        totalSuccess += result.successCount;
        totalFailure += result.failureCount;

        console.log(`Schedule executed successfully: ${schedule.title}, sent: ${result.successCount}, failed: ${result.failureCount}`);
        
      } catch (error) {
        console.error(`Failed to execute schedule ${schedule.title}:`, error);
        
        results.push({
          scheduleId: schedule.id,
          title: schedule.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const executionTime = Date.now() - startTime;

    // 실행 결과 로깅
    console.log(`Cron job completed in ${executionTime}ms:`, {
      schedulesFound: schedulesToExecute.length,
      schedulesExecuted: results.filter(r => r.success).length,
      schedulesFailed: results.filter(r => !r.success).length,
      totalEmailsSucceeded: totalSuccess,
      totalEmailsFailed: totalFailure,
    });

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      schedulesProcessed: schedulesToExecute.length,
      results,
      summary: {
        schedulesExecuted: results.filter(r => r.success).length,
        schedulesFailed: results.filter(r => !r.success).length,
        totalEmailsSucceeded: totalSuccess,
        totalEmailsFailed: totalFailure,
      },
      executionTime,
    });

  } catch (error) {
    console.error('Cron job error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * 수동 크론 작업 트리거 (개발/테스트용)
 * POST /api/cron/email-scheduler
 */
export async function POST(request: NextRequest) {
  try {
    // 개발 환경에서만 허용
    if (env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Manual trigger not allowed in production' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { scheduleId, forceExecution } = body;

    if (scheduleId) {
      // 특정 스케줄 실행
      const result = await executeScheduledEmail(scheduleId);
      
      return NextResponse.json({
        success: true,
        scheduleId,
        result,
        timestamp: new Date().toISOString(),
      });
    } else if (forceExecution) {
      // 모든 활성 스케줄 강제 실행
      return await GET(request);
    } else {
      return NextResponse.json(
        { error: 'scheduleId or forceExecution required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Manual cron trigger error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
