/**
 * 직접 사용자 데이터 검색 테스트
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { weatherEmbeddings } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId가 필요합니다',
      });
    }

    console.log('🔍 직접 사용자 검색 테스트:', { userId });

    // 1단계: 사용자 ID만으로 검색
    console.log('1️⃣ 사용자 ID만으로 검색');
    const userOnlyFilter = await db
      .select()
      .from(weatherEmbeddings)
      .where(eq(weatherEmbeddings.clerkUserId, userId))
      .orderBy(desc(weatherEmbeddings.createdAt))
      .limit(10);

    console.log(`🎯 사용자 ID만으로: ${userOnlyFilter.length}개 결과`);

    // 2단계: 사용자 ID + 콘텐츠 타입 필터
    console.log('2️⃣ 사용자 ID + 콘텐츠 타입 필터');
    const userWithTypeFilter = await db
      .select()
      .from(weatherEmbeddings)
      .where(and(
        eq(weatherEmbeddings.clerkUserId, userId),
        eq(weatherEmbeddings.contentType, 'hourly')
      ))
      .orderBy(desc(weatherEmbeddings.createdAt))
      .limit(10);

    console.log(`🎯 사용자 ID + hourly: ${userWithTypeFilter.length}개 결과`);

    // 3단계: 다중 콘텐츠 타입 필터 (기존 방식)
    console.log('3️⃣ 다중 콘텐츠 타입 필터 테스트');
    const multiTypeFilter = await db
      .select()
      .from(weatherEmbeddings)
      .where(and(
        eq(weatherEmbeddings.clerkUserId, userId),
        eq(weatherEmbeddings.contentType, 'hourly')
      ))
      .orderBy(desc(weatherEmbeddings.createdAt))
      .limit(10);

    console.log(`🎯 다중 타입 필터: ${multiTypeFilter.length}개 결과`);

    return NextResponse.json({
      success: true,
      userId,
      testResults: {
        userOnlyCount: userOnlyFilter.length,
        userWithHourlyCount: userWithTypeFilter.length,
        multiTypeCount: multiTypeFilter.length,
        userOnlyData: userOnlyFilter.slice(0, 3).map(e => ({
          id: e.id.substring(0, 8) + '...',
          contentType: e.contentType,
          locationName: e.locationName,
          forecastDate: e.forecastDate,
          forecastHour: e.forecastHour
        })),
        userWithHourlyData: userWithTypeFilter.slice(0, 3).map(e => ({
          id: e.id.substring(0, 8) + '...',
          contentType: e.contentType,
          locationName: e.locationName,
          forecastDate: e.forecastDate,
          forecastHour: e.forecastHour
        }))
      },
      analysis: {
        userDataExists: userOnlyFilter.length > 0,
        filteringWorking: userWithTypeFilter.length > 0,
        issue: userOnlyFilter.length > 0 && userWithTypeFilter.length === 0 
          ? '콘텐츠 타입 필터링 문제' 
          : userOnlyFilter.length === 0 
          ? '사용자 데이터 자체가 없음'
          : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 직접 사용자 검색 테스트 실패:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: '테스트 실패',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
