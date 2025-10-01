import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { emailSchedules } from '@/db/schema';
import { desc } from 'drizzle-orm';

/**
 * 이메일 스케줄 데이터 디버그 조회 API (인증 불필요)
 * GET /api/debug/email-schedules-check
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 이메일 스케줄 데이터 디버그 조회 시작');

    // 모든 이메일 스케줄 조회
    const allSchedules = await db
      .select()
      .from(emailSchedules)
      .orderBy(desc(emailSchedules.createdAt));

    console.log(`📧 총 ${allSchedules.length}개 이메일 스케줄 발견`);

    // 각 스케줄의 targetUserIds 상태 분석
    const scheduleAnalysis = allSchedules.map(schedule => {
      const targetUserIdsType = typeof schedule.targetUserIds;
      const targetUserIdsValue = schedule.targetUserIds;
      const isNull = schedule.targetUserIds === null;
      const isUndefined = schedule.targetUserIds === undefined;
      const isArray = Array.isArray(schedule.targetUserIds);
      
      return {
        id: schedule.id,
        title: schedule.title,
        scheduleTime: schedule.scheduleTime,
        targetType: schedule.targetType,
        targetUserIds: {
          value: targetUserIdsValue,
          type: targetUserIdsType,
          isNull,
          isUndefined,
          isArray,
          length: isArray ? schedule.targetUserIds.length : 'N/A'
        },
        isActive: schedule.isActive,
        nextSendAt: schedule.nextSendAt,
        lastSentAt: schedule.lastSentAt,
        totalSentCount: schedule.totalSentCount,
        createdAt: schedule.createdAt
      };
    });

    // 통계 정보
    const stats = {
      total: allSchedules.length,
      active: allSchedules.filter(s => s.isActive).length,
      inactive: allSchedules.filter(s => !s.isActive).length,
      targetUserIds: {
        null: allSchedules.filter(s => s.targetUserIds === null).length,
        undefined: allSchedules.filter(s => s.targetUserIds === undefined).length,
        array: allSchedules.filter(s => Array.isArray(s.targetUserIds)).length,
        other: allSchedules.filter(s => 
          s.targetUserIds !== null && 
          s.targetUserIds !== undefined && 
          !Array.isArray(s.targetUserIds)
        ).length
      },
      targetTypes: {
        all_users: allSchedules.filter(s => s.targetType === 'all_users').length,
        active_users: allSchedules.filter(s => s.targetType === 'active_users').length,
        specific_users: allSchedules.filter(s => s.targetType === 'specific_users').length
      }
    };

    // 문제가 있는 스케줄 식별
    const problemSchedules = allSchedules.filter(schedule => {
      // targetType이 'specific_users'인데 targetUserIds가 null이거나 빈 배열인 경우
      if (schedule.targetType === 'specific_users') {
        return !schedule.targetUserIds || 
               !Array.isArray(schedule.targetUserIds) || 
               schedule.targetUserIds.length === 0;
      }
      return false;
    });

    return NextResponse.json({
      success: true,
      message: '이메일 스케줄 데이터 분석 완료',
      stats,
      schedules: scheduleAnalysis,
      problemSchedules: problemSchedules.map(s => ({
        id: s.id,
        title: s.title,
        targetType: s.targetType,
        targetUserIds: s.targetUserIds,
        issue: 'specific_users 타입인데 targetUserIds가 비어있음'
      })),
      recommendations: [
        'targetType이 all_users인 경우 targetUserIds는 null이어도 정상입니다.',
        'targetType이 specific_users인 경우 targetUserIds는 배열이어야 합니다.',
        '현재 크론잡 오류는 Zod 스키마에서 null 값을 처리하지 못해서 발생했습니다.'
      ],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 이메일 스케줄 디버그 조회 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: '이메일 스케줄 디버그 조회 실패',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}