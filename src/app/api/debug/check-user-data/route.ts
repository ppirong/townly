/**
 * 사용자별 날씨 데이터 확인 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { weatherEmbeddings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('🔍 사용자별 날씨 데이터 확인:', { userId });

    // 전체 임베딩에서 clerkUserId 정보 확인
    const allEmbeddings = await db
      .select({
        id: weatherEmbeddings.id,
        locationKey: weatherEmbeddings.locationKey,
        weatherType: weatherEmbeddings.weatherType,
        dataDate: weatherEmbeddings.dataDate,
        content: weatherEmbeddings.content,
        createdAt: weatherEmbeddings.createdAt
      })
      .from(weatherEmbeddings)
      .orderBy(desc(weatherEmbeddings.createdAt))
      .limit(20);

    // 특정 사용자 데이터 (weatherEmbeddings 테이블에는 clerkUserId가 없으므로 생략)
    let userSpecificData: any = [];

    // locationKey별 통계 (clerkUserId가 없으므로 locationKey로 대체)
    const locationStats = allEmbeddings.reduce((acc, embedding) => {
      const locationKey = embedding.locationKey || 'null';
      acc[locationKey] = (acc[locationKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      message: '사용자별 날씨 데이터 분석',
      totalEmbeddings: allEmbeddings.length,
      locationStats,
      requestedUserId: userId,
      userSpecificCount: userSpecificData.length,
      allEmbeddings: allEmbeddings.map(e => ({
        id: e.id.substring(0, 8) + '...',
        locationKey: e.locationKey,
        weatherType: e.weatherType,
        dataDate: e.dataDate,
        content: e.content.substring(0, 100) + '...',
        createdAt: e.createdAt
      })),
      userSpecificData: [],
      availableLocationKeys: Object.keys(locationStats).filter(id => id !== 'null'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 사용자 데이터 확인 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '사용자 데이터 확인 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
