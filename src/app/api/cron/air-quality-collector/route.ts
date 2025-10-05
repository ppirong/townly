/**
 * 대기질 데이터 수집 Cron Job
 * 매일 6시, 12시, 18시, 24시에 실행되어 모든 사용자의 90시간 대기질 데이터를 수집합니다.
 * 
 * Vercel Cron 설정:
 * "0 * * * *" - 매시간 실행되지만, 내부에서 6시, 12시, 18시, 0시만 실제로 수집
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userLocations } from '@/db/schema';
import { googleAirQualityService } from '@/lib/services/google-air-quality';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5분 (여러 사용자 처리를 위해)

/**
 * 스케줄러 실행 여부 확인
 * KST 기준 6시, 12시, 18시, 0시에만 true 반환
 */
function shouldRunCollector(kstHour: number): boolean {
  return kstHour === 6 || kstHour === 12 || kstHour === 18 || kstHour === 0;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 현재 시간 (KST)
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const currentHour = kstTime.getHours();
    
    console.log(`⏰ [${kstTime.toISOString()}] 대기질 수집 크론 작업 호출됨 (${currentHour}시)`);
    
    // Vercel Cron Secret 검증
    const authHeader = request.headers.get('authorization');
    const cronSecret = env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ 인증 실패: 유효하지 않은 Cron Secret');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 6시, 12시, 18시, 0시가 아니면 스킵
    if (!shouldRunCollector(currentHour)) {
      console.log(`⏭️ 현재 시간(${currentHour}시)은 대기질 수집 시간이 아닙니다. 스킵합니다.`);
      return NextResponse.json({
        skipped: true,
        message: `대기질 수집 시간이 아닙니다 (현재: ${currentHour}시, 실행 시간: 6시, 12시, 18시, 0시)`,
        currentHour,
        executedAt: kstTime.toISOString(),
        timezone: 'Asia/Seoul'
      });
    }

    console.log(`🚀 대기질 데이터 수집 시작 (${currentHour}시)`);
    console.log('⏰ 실행 시간:', kstTime.toISOString());
    
    // 모든 사용자 위치 정보 조회
    const allUserLocations = await db
      .select()
      .from(userLocations);

    console.log(`👥 총 ${allUserLocations.length}명의 사용자 위치 정보 조회 완료`);

    if (allUserLocations.length === 0) {
      console.log('⚠️ 위치 정보가 등록된 사용자가 없습니다.');
      return NextResponse.json({
        success: true,
        message: '위치 정보가 등록된 사용자가 없습니다.',
        processedUsers: 0,
        totalTime: Date.now() - startTime,
      });
    }

    // 결과 추적
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    // 각 사용자에 대해 90시간 대기질 데이터 수집
    for (const userLocation of allUserLocations) {
      try {
        const latitude = parseFloat(userLocation.latitude);
        const longitude = parseFloat(userLocation.longitude);
        
        console.log(`🌬️ 사용자 ${userLocation.clerkUserId} 데이터 수집 시작: ${latitude}, ${longitude}`);
        
        await googleAirQualityService.collectAndStore90HourDataForUser(
          userLocation.clerkUserId,
          latitude,
          longitude
        );
        
        results.success++;
        console.log(`✅ 사용자 ${userLocation.clerkUserId} 데이터 수집 완료 (${results.success}/${allUserLocations.length})`);
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push({
          userId: userLocation.clerkUserId,
          error: errorMessage,
        });
        console.error(`❌ 사용자 ${userLocation.clerkUserId} 데이터 수집 실패:`, errorMessage);
      }
    }

    const totalTime = Date.now() - startTime;
    
    console.log(`✅ 대기질 수집 완료 (${currentHour}시) - 총 ${allUserLocations.length}명, 성공 ${results.success}명, 실패 ${results.failed}명 (${totalTime}ms)`);

    return NextResponse.json({
      success: true,
      message: '대기질 데이터 수집 완료',
      data: {
        processedUsers: allUserLocations.length,
        successCount: results.success,
        failedCount: results.failed,
        scheduleHour: currentHour,
        executedAt: kstTime.toISOString(),
      },
      errors: results.errors,
      totalTime,
      timezone: 'Asia/Seoul'
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ 대기질 데이터 수집 Cron Job 실패:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * 수동 실행 (테스트 및 관리 목적)
 * POST /api/cron/air-quality-collector
 * 
 * 사용 예시:
 * ```bash
 * curl -X POST https://your-domain.com/api/cron/air-quality-collector \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 * ```
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔧 대기질 수집 수동 실행 시작');
    
    // Vercel Cron Secret 검증
    const authHeader = request.headers.get('authorization');
    const cronSecret = env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ 수동 실행 인증 실패');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // 시간 체크 없이 즉시 실행
    const allUserLocations = await db
      .select()
      .from(userLocations);

    console.log(`👥 총 ${allUserLocations.length}명의 사용자 위치 정보 조회 완료`);

    if (allUserLocations.length === 0) {
      console.log('⚠️ 위치 정보가 등록된 사용자가 없습니다.');
      return NextResponse.json({
        success: true,
        message: '위치 정보가 등록된 사용자가 없습니다.',
        processedUsers: 0,
        totalTime: Date.now() - startTime,
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ userId: string; error: string }>,
    };

    for (const userLocation of allUserLocations) {
      try {
        const latitude = parseFloat(userLocation.latitude);
        const longitude = parseFloat(userLocation.longitude);
        
        console.log(`🌬️ 사용자 ${userLocation.clerkUserId} 데이터 수집 시작: ${latitude}, ${longitude}`);
        
        await googleAirQualityService.collectAndStore90HourDataForUser(
          userLocation.clerkUserId,
          latitude,
          longitude
        );
        
        results.success++;
        console.log(`✅ 사용자 ${userLocation.clerkUserId} 데이터 수집 완료 (${results.success}/${allUserLocations.length})`);
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push({
          userId: userLocation.clerkUserId,
          error: errorMessage,
        });
        console.error(`❌ 사용자 ${userLocation.clerkUserId} 데이터 수집 실패:`, errorMessage);
      }
    }

    const totalTime = Date.now() - startTime;
    
    console.log(`✅ 수동 실행 완료 - 총 ${allUserLocations.length}명, 성공 ${results.success}명, 실패 ${results.failed}명 (${totalTime}ms)`);
    
    return NextResponse.json({
      success: true,
      message: '대기질 데이터 수집 수동 실행 완료',
      data: {
        processedUsers: allUserLocations.length,
        successCount: results.success,
        failedCount: results.failed,
        executedAt: new Date().toISOString(),
      },
      errors: results.errors,
      totalTime,
      timezone: 'Asia/Seoul'
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ 대기질 수집 수동 실행 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: '대기질 수집 수동 실행 실패',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      totalTime,
      executedAt: new Date().toISOString()
    }, { status: 500 });
  }
}

