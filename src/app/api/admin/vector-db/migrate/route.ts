/**
 * 벡터 데이터베이스 마이그레이션 API
 * 기존 날씨 데이터를 임베딩하여 벡터 DB에 저장합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherVectorDBService } from '@/lib/services/weather-vector-db';
import { auth } from '@clerk/nextjs/server';

export async function POST(_request: NextRequest) {
  try {
    // 관리자 권한 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 벡터 DB 마이그레이션 시작...');

    // 기존 날씨 데이터를 임베딩하여 저장
    const embeddedCount = await weatherVectorDBService.migrateExistingWeatherData();

    console.log('✅ 벡터 DB 마이그레이션 완료:', embeddedCount);

    return NextResponse.json({
      success: true,
      message: '벡터 DB 마이그레이션이 완료되었습니다.',
      embeddedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 벡터 DB 마이그레이션 실패:', error);

    return NextResponse.json({
      success: false,
      error: '벡터 DB 마이그레이션에 실패했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // 벡터 DB 통계 조회
    const stats = await weatherVectorDBService.getVectorDBStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 벡터 DB 통계 조회 실패:', error);

    return NextResponse.json({
      success: false,
      error: '벡터 DB 통계 조회에 실패했습니다.',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
