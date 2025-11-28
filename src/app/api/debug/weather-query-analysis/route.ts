import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { hourlyWeatherData } from '@/db/schema';
import { eq, gte, lte, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`🔍 시간별 날씨 조회 디버그 시작 - 사용자: ${userId}`);

    // 1. 현재 시각 정보
    const now = new Date();
    const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
    const hours = 12;
    const maxForecastTime = new Date(currentHour.getTime() + (hours * 60 * 60 * 1000));

    console.log(`🕐 현재 시각: ${now.toISOString()} (${now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`);
    console.log(`🕐 조회 시작: ${currentHour.toISOString()} (${currentHour.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`);
    console.log(`🕐 조회 종료: ${maxForecastTime.toISOString()} (${maxForecastTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`);

    // 2. 사용자의 모든 시간별 날씨 데이터 조회 (조건 없이)
    const allUserData = await db
      .select({
        id: hourlyWeatherData.id,
        forecastDatetime: hourlyWeatherData.forecastDatetime,
        forecastDate: hourlyWeatherData.forecastDate,
        forecastHour: hourlyWeatherData.forecastHour,
        temperature: hourlyWeatherData.temperature,
        conditions: hourlyWeatherData.conditions,
        expiresAt: hourlyWeatherData.expiresAt,
        createdAt: hourlyWeatherData.createdAt,
      })
      .from(hourlyWeatherData)
      .where(eq(hourlyWeatherData.clerkUserId, userId))
      .orderBy(hourlyWeatherData.forecastDatetime);

    console.log(`📊 사용자의 전체 시간별 날씨 데이터: ${allUserData.length}개`);

    // 3. 각 조건별로 필터링 테스트
    const conditionTests = {
      // 조건 1: 시간 범위만
      timeRange: allUserData.filter(record => 
        record.forecastDatetime >= currentHour && 
        record.forecastDatetime <= maxForecastTime
      ),
      
      // 조건 2: TTL 체크만 (만료되지 않은 것)
      ttlValid: allUserData.filter(record => 
        record.expiresAt >= now
      ),
      
      // 조건 3: 시간 범위 + TTL 체크 (실제 쿼리 조건)
      combined: allUserData.filter(record => 
        record.forecastDatetime >= currentHour && 
        record.forecastDatetime <= maxForecastTime &&
        record.expiresAt >= now
      ),
      
      // 조건 4: 현재 시각 이후만 (이전 로직)
      afterNow: allUserData.filter(record => 
        record.forecastDatetime >= now
      ),
    };

    // 4. 실제 데이터베이스 쿼리 (현재 actions/weather.ts와 동일)
    const actualQuery = await db
      .select()
      .from(hourlyWeatherData)
      .where(and(
        eq(hourlyWeatherData.clerkUserId, userId),
        gte(hourlyWeatherData.forecastDatetime, currentHour),
        lte(hourlyWeatherData.forecastDatetime, maxForecastTime)
        // TTL 체크는 제거된 상태
      ))
      .orderBy(hourlyWeatherData.forecastDatetime)
      .limit(hours);

    // 5. 상세 분석 결과
    const analysis = {
      currentTime: {
        now: now.toISOString(),
        nowKST: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        currentHour: currentHour.toISOString(),
        currentHourKST: currentHour.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        maxForecastTime: maxForecastTime.toISOString(),
        maxForecastTimeKST: maxForecastTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      },
      
      dataCounts: {
        total: allUserData.length,
        timeRangeOnly: conditionTests.timeRange.length,
        ttlValidOnly: conditionTests.ttlValid.length,
        combined: conditionTests.combined.length,
        afterNowOnly: conditionTests.afterNow.length,
        actualQuery: actualQuery.length,
      },
      
      allData: allUserData.map(record => ({
        id: record.id,
        forecastDatetime: record.forecastDatetime.toISOString(),
        forecastDateTimeKST: record.forecastDatetime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        forecastDate: record.forecastDate,
        forecastHour: record.forecastHour,
        temperature: record.temperature,
        conditions: record.conditions,
        expiresAt: record.expiresAt.toISOString(),
        expiresAtKST: record.expiresAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        createdAt: record.createdAt.toISOString(),
        
        // 각 조건 통과 여부
        passesTimeRange: record.forecastDatetime >= currentHour && record.forecastDatetime <= maxForecastTime,
        passesTTL: record.expiresAt >= now,
        passesAfterNow: record.forecastDatetime >= now,
      })),
      
      actualQueryResult: actualQuery.map(record => ({
        id: record.id,
        forecastDatetime: record.forecastDatetime.toISOString(),
        forecastDateTimeKST: record.forecastDatetime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        temperature: record.temperature,
        conditions: record.conditions,
      })),
    };

    console.log(`📈 분석 결과:`);
    console.log(`  - 전체 데이터: ${analysis.dataCounts.total}개`);
    console.log(`  - 시간 범위 조건: ${analysis.dataCounts.timeRangeOnly}개`);
    console.log(`  - TTL 유효 조건: ${analysis.dataCounts.ttlValidOnly}개`);
    console.log(`  - 결합 조건: ${analysis.dataCounts.combined}개`);
    console.log(`  - 현재 시각 이후: ${analysis.dataCounts.afterNowOnly}개`);
    console.log(`  - 실제 쿼리 결과: ${analysis.dataCounts.actualQuery}개`);

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('❌ 시간별 날씨 조회 디버그 오류:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
