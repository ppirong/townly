import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { hourlyWeatherData } from '@/db/schema';
import { eq, isNotNull } from 'drizzle-orm';

export async function POST(_request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔧 forecast_hour 수정 시작...');

    // 모든 시간별 날씨 데이터 조회
    const allRecords = await db
      .select()
      .from(hourlyWeatherData)
      .where(isNotNull(hourlyWeatherData.forecastDateTime));

    console.log(`📊 총 ${allRecords.length}개 레코드 발견`);

    let fixedCount = 0;
    const fixPromises = allRecords.map(async (record) => {
      // forecast_datetime을 기준으로 올바른 forecast_date와 forecast_hour 계산
      const correctForecastDate = record.forecastDateTime.toISOString().split('T')[0];
      const correctForecastHour = record.forecastDateTime.getHours();

      // 현재 저장된 값과 다른 경우만 업데이트
      if (record.forecastDate !== correctForecastDate || record.forecastHour !== correctForecastHour) {
        console.log(`🔄 수정: ${record.id}`);
        console.log(`  - 기존 날짜: ${record.forecastDate} -> ${correctForecastDate}`);
        console.log(`  - 기존 시간: ${record.forecastHour} -> ${correctForecastHour}`);
        console.log(`  - forecast_datetime: ${record.forecastDateTime.toISOString()}`);

        await db
          .update(hourlyWeatherData)
          .set({
            forecastDate: correctForecastDate,
            forecastHour: correctForecastHour,
            updatedAt: new Date(),
          })
          .where(eq(hourlyWeatherData.id, record.id));

        fixedCount++;
      }
    });

    await Promise.all(fixPromises);

    console.log(`✅ ${fixedCount}개 레코드 수정 완료`);

    // 수정 후 샘플 데이터 확인
    const sampleRecords = await db
      .select()
      .from(hourlyWeatherData)
      .orderBy(hourlyWeatherData.forecastDateTime)
      .limit(5);

    return NextResponse.json({
      success: true,
      message: `forecast_hour 수정 완료: ${fixedCount}개 레코드 수정`,
      totalRecords: allRecords.length,
      fixedRecords: fixedCount,
      sampleData: sampleRecords.map(record => ({
        id: record.id,
        forecastDate: record.forecastDate,
        forecastHour: record.forecastHour,
        forecastDateTime: record.forecastDateTime.toISOString(),
        temperature: record.temperature,
      })),
    });
  } catch (error) {
    console.error('forecast_hour 수정 실패:', error);
    
    return NextResponse.json(
      { error: 'forecast_hour 수정에 실패했습니다' },
      { status: 500 }
    );
  }
}
