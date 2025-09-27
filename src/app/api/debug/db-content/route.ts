/**
 * 벡터 DB 내용 직접 조회 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { weatherEmbeddings } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('📊 벡터 DB 내용 직접 조회');
    
    // 최근 10개 임베딩 조회
    const embeddings = await db
      .select({
        id: weatherEmbeddings.id,
        contentType: weatherEmbeddings.contentType,
        locationName: weatherEmbeddings.locationName,
        forecastDate: weatherEmbeddings.forecastDate,
        forecastHour: weatherEmbeddings.forecastHour,
        content: weatherEmbeddings.content,
        createdAt: weatherEmbeddings.createdAt
      })
      .from(weatherEmbeddings)
      .orderBy(desc(weatherEmbeddings.createdAt))
      .limit(10);
    
    console.log(`✅ ${embeddings.length}개 임베딩 조회됨`);
    
    // 통계는 생략하고 기본 데이터만 조회
    const locationStats: any[] = [];
    const typeStats: any[] = [];
    
    return NextResponse.json({
      success: true,
      recentEmbeddings: embeddings.map(e => ({
        id: e.id,
        contentType: e.contentType,
        locationName: e.locationName,
        forecastDate: e.forecastDate,
        forecastHour: e.forecastHour,
        contentPreview: e.content?.substring(0, 100) + '...',
        createdAt: e.createdAt
      })),
      statistics: {
        total: embeddings.length,
        byLocation: locationStats,
        byType: typeStats
      },
      sampleQueries: [
        '서울 날씨',
        '오늘 날씨',
        '내일 날씨',
        '9월 28일 날씨'
      ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ DB 내용 조회 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'DB 내용 조회 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
