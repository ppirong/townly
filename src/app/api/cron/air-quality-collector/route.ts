/**
 * 대기질 데이터 수집 Cron Job
 * 매일 6시, 12시, 18시, 24시에 실행되어 모든 사용자의 90시간 대기질 데이터를 수집합니다.
 * 
 * Vercel Cron 설정:
 * "0 6,12,18,0 * * *" - 매일 6시, 12시, 18시, 24시(자정)에 실행
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userLocations } from '@/db/schema';
import { googleAirQualityService } from '@/lib/services/google-air-quality';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5분 (여러 사용자 처리를 위해)

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
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

    console.log('🚀 대기질 데이터 수집 Cron Job 시작');
    console.log('⏰ 실행 시간:', new Date().toISOString());
    
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
    
    console.log('📊 대기질 데이터 수집 Cron Job 완료');
    console.log(`✅ 성공: ${results.success}명`);
    console.log(`❌ 실패: ${results.failed}명`);
    console.log(`⏱️ 총 소요 시간: ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      message: '대기질 데이터 수집 완료',
      processedUsers: allUserLocations.length,
      successCount: results.success,
      failedCount: results.failed,
      errors: results.errors,
      totalTime,
      timestamp: new Date().toISOString(),
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

