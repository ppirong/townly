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
        clerkUserId: weatherEmbeddings.clerkUserId,
        contentType: weatherEmbeddings.contentType,
        locationName: weatherEmbeddings.locationName,
        forecastDate: weatherEmbeddings.forecastDate,
        forecastHour: weatherEmbeddings.forecastHour,
        createdAt: weatherEmbeddings.createdAt
      })
      .from(weatherEmbeddings)
      .orderBy(desc(weatherEmbeddings.createdAt))
      .limit(20);

    // 특정 사용자 데이터 (있는 경우)
    let userSpecificData: any = [];
    if (userId) {
      userSpecificData = await db
        .select({
          id: weatherEmbeddings.id,
          clerkUserId: weatherEmbeddings.clerkUserId,
          contentType: weatherEmbeddings.contentType,
          locationName: weatherEmbeddings.locationName,
          forecastDate: weatherEmbeddings.forecastDate,
          forecastHour: weatherEmbeddings.forecastHour,
          createdAt: weatherEmbeddings.createdAt
        })
        .from(weatherEmbeddings)
        .where(eq(weatherEmbeddings.clerkUserId, userId))
        .orderBy(desc(weatherEmbeddings.createdAt))
        .limit(10);
    }

    // clerkUserId별 통계
    const userStats = allEmbeddings.reduce((acc, embedding) => {
      const userId = embedding.clerkUserId || 'null';
      acc[userId] = (acc[userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      message: '사용자별 날씨 데이터 분석',
      totalEmbeddings: allEmbeddings.length,
      userStats,
      requestedUserId: userId,
      userSpecificCount: userSpecificData.length,
      allEmbeddings: allEmbeddings.map(e => ({
        id: e.id.substring(0, 8) + '...',
        clerkUserId: e.clerkUserId,
        contentType: e.contentType,
        locationName: e.locationName,
        forecastDate: e.forecastDate,
        forecastHour: e.forecastHour,
        createdAt: e.createdAt
      })),
      userSpecificData: userSpecificData.map((e: any) => ({
        id: e.id.substring(0, 8) + '...',
        clerkUserId: e.clerkUserId,
        contentType: e.contentType,
        locationName: e.locationName,
        forecastDate: e.forecastDate,
        forecastHour: e.forecastHour,
        createdAt: e.createdAt
      })),
      availableUserIds: Object.keys(userStats).filter(id => id !== 'null'),
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
