/**
 * 날씨 캐시 정리 API
 * 만료된 날씨 캐시 데이터를 정리하는 크론 작업용 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherDbService } from '@/lib/services/weather-db';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 날씨 캐시 정리 시작');
    
    // 인증 확인 (간단한 토큰 기반)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // 만료된 캐시 데이터 정리
    await weatherDbService.cleanupExpiredData();
    
    // 현재 캐시 통계 조회
    const stats = await weatherDbService.getCacheStats();
    
    console.log('✅ 날씨 캐시 정리 완료:', stats);
    
    return NextResponse.json({
      success: true,
      message: '날씨 캐시 정리가 완료되었습니다.',
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('날씨 캐시 정리 실패:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: '날씨 캐시 정리 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 캐시 통계만 조회
    const stats = await weatherDbService.getCacheStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('날씨 캐시 통계 조회 실패:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: '날씨 캐시 통계 조회 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
