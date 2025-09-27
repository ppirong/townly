import { NextRequest, NextResponse } from 'next/server';
import { convertAccuWeatherDateTimeToKST, formatKSTTime, getCurrentKST } from '@/lib/utils/datetime';

export async function GET(request: NextRequest) {
  try {
    // 현재 시간 정보
    const serverTime = new Date();
    const currentKST = getCurrentKST();
    
    // 테스트용 AccuWeather DateTime (현재 시간 기준)
    const testAccuWeatherDateTime = "2025-09-27T13:00:00";
    
    // 시간 변환 테스트
    const converted = convertAccuWeatherDateTimeToKST(testAccuWeatherDateTime);
    const formatted = formatKSTTime(converted.kstDateTime);
    
    // 환경 정보
    const timezoneInfo = {
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      serverTimezoneName: new Date().toTimeString().split(' ')[1],
      process_env_TZ: process.env.TZ || 'not set'
    };
    
    return NextResponse.json({
      success: true,
      data: {
        environment: {
          serverTime: serverTime.toISOString(),
          serverLocalTime: serverTime.toLocaleString('ko-KR'),
          currentKST: currentKST.toISOString(),
          timezone: timezoneInfo
        },
        conversion: {
          input: testAccuWeatherDateTime,
          output: {
            kstDateTime: converted.kstDateTime.toISOString(),
            forecastDate: converted.forecastDate,
            forecastHour: converted.forecastHour,
            formatted: formatted
          }
        },
        tests: [
          {
            name: "13시 입력 테스트",
            input: "2025-09-27T13:00:00",
            expected_hour: 13,
            actual_hour: convertAccuWeatherDateTimeToKST("2025-09-27T13:00:00").forecastHour,
            passed: convertAccuWeatherDateTimeToKST("2025-09-27T13:00:00").forecastHour === 13
          },
          {
            name: "04시 입력 테스트", 
            input: "2025-09-27T04:00:00",
            expected_hour: 4,
            actual_hour: convertAccuWeatherDateTimeToKST("2025-09-27T04:00:00").forecastHour,
            passed: convertAccuWeatherDateTimeToKST("2025-09-27T04:00:00").forecastHour === 4
          }
        ]
      }
    });
  } catch (error) {
    console.error('시간대 테스트 실패:', error);
    return NextResponse.json(
      { error: '시간대 테스트에 실패했습니다' },
      { status: 500 }
    );
  }
}