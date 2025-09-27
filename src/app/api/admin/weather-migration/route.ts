/**
 * 날씨 데이터 벡터 DB 마이그레이션 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { weatherDataMigrationService } from '@/lib/services/weather-data-migration';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 날씨 데이터 마이그레이션 API 시작');
    
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'migrate':
        const result = await weatherDataMigrationService.migrateAllWeatherData();
        return NextResponse.json({
          success: true,
          message: '날씨 데이터 마이그레이션 완료',
          result
        });

      case 'stats':
        const stats = await weatherDataMigrationService.getEmbeddingStats();
        return NextResponse.json({
          success: true,
          message: '임베딩 통계 조회 완료',
          stats
        });

      case 'cleanup':
        const removed = await weatherDataMigrationService.removeDuplicateEmbeddings();
        return NextResponse.json({
          success: true,
          message: `중복 임베딩 ${removed}개 제거 완료`,
          removed
        });

      default:
        return NextResponse.json(
          { error: '지원하지 않는 액션입니다. action: migrate|stats|cleanup' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ 마이그레이션 API 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '마이그레이션 처리 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = await weatherDataMigrationService.getEmbeddingStats();
    
    return NextResponse.json({
      success: true,
      message: '벡터 DB 상태 조회',
      stats,
      actions: {
        migrate: 'POST /api/admin/weather-migration {"action": "migrate"}',
        stats: 'POST /api/admin/weather-migration {"action": "stats"}',
        cleanup: 'POST /api/admin/weather-migration {"action": "cleanup"}'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 상태 조회 오류:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '상태 조회 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
