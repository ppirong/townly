/**
 * 날씨 캐시 디버깅 API
 * 개발 환경에서 날씨 캐시 상태를 확인하기 위한 디버그 엔드포인트
 */

import { NextResponse } from 'next/server';
import { weatherDbService } from '@/lib/services/weather-db';

export async function GET() {
  try {
    // DB 캐시 통계
    const dbStats = await weatherDbService.getCacheStats();
    
    // 메모리 캐시는 private이므로 간접적으로 상태 확인
    const memoryStats = {
      available: true,
      note: '메모리 캐시는 내부 구현이므로 상세 통계를 제공하지 않습니다.'
    };
    
    const cacheInfo = {
      database: {
        hourlyRecords: dbStats.hourlyRecords,
        dailyRecords: dbStats.dailyRecords,
        locationKeys: dbStats.locationKeys,
        total: dbStats.hourlyRecords + dbStats.dailyRecords + dbStats.locationKeys
      },
      memory: memoryStats,
      cacheStrategy: {
        description: '2단계 캐싱 전략',
        levels: [
          {
            level: 1,
            type: 'Memory Cache',
            ttl: {
              hourly: '10분',
              daily: '30분',
              locationKeys: '24시간'
            },
            purpose: '빠른 응답을 위한 단기 캐시'
          },
          {
            level: 2,
            type: 'Database Cache',
            ttl: {
              hourly: '1시간',
              daily: '2시간',
              locationKeys: '7일'
            },
            purpose: 'API 호출 절약을 위한 중기 캐시'
          }
        ]
      },
      apiOptimization: {
        description: 'AccuWeather API 호출 최적화 현황',
        features: [
          '메모리 + DB 이중 캐싱',
          '위치 키 장기 캐싱 (7일)',
          '날씨 데이터 단계별 TTL',
          '레이트 리미팅',
          'API 호출 추적',
          '자동 캐시 정리'
        ]
      }
    };
    
    return NextResponse.json({
      success: true,
      cache: cacheInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('날씨 캐시 디버그 정보 조회 실패:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: '날씨 캐시 정보 조회 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
