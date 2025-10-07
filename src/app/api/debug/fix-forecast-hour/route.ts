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
      // forecast_datetime이 이미 KST 시간으로 저장되어 있으므로 직접 파싱
      // PostgreSQL timestamp는 시간대 정보 없이 저장되므로 JavaScript에서 UTC로 해석됨
      // 따라서 UTC 메서드를 사용하여 실제 저장된 KST 값을 추출
      const correctForecastDate = record.forecastDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
      const correctForecastHour = record.forecastDateTime.getUTCHours(); // KST 시간 (UTC로 해석된 값의 시간 부분)

      // 디버깅: 모든 계산 방법 비교
      console.log(`\n=== 레코드 ${record.id} 분석 ===`);
      console.log(`원본 forecast_datetime: ${record.forecastDateTime}`);
      console.log(`toISOString(): ${record.forecastDateTime.toISOString()}`);
      console.log(`getTimezoneOffset(): ${record.forecastDateTime.getTimezoneOffset()}`);
      
      // 다양한 방법으로 계산
      const utcDate = record.forecastDateTime.toISOString().split('T')[0];
      const utcHour = record.forecastDateTime.getUTCHours();
      const localDate = `${record.forecastDateTime.getFullYear()}-${String(record.forecastDateTime.getMonth() + 1).padStart(2, '0')}-${String(record.forecastDateTime.getDate()).padStart(2, '0')}`;
      const localHour = record.forecastDateTime.getHours();
      
      console.log(`UTC 방법: ${utcDate}, ${utcHour}시`);
      console.log(`로컬 방법: ${localDate}, ${localHour}시`);
      console.log(`현재 저장된 값: ${record.forecastDate}, ${record.forecastHour}시`);
      
      // 현재 저장된 값과 다른 경우만 업데이트
      if (record.forecastDate !== correctForecastDate || record.forecastHour !== correctForecastHour) {
        console.log(`🔄 수정 필요: ${record.id}`);
        console.log(`  - 기존 날짜: ${record.forecastDate} -> ${correctForecastDate}`);
        console.log(`  - 기존 시간: ${record.forecastHour} -> ${correctForecastHour}`);

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
