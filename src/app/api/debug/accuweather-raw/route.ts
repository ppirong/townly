import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 서울의 LocationKey (고정값 - 테스트용)
    const seoulLocationKey = '226081';
    
    // AccuWeather API 원본 응답 확인
    const hourlyUrl = `https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${seoulLocationKey}`;
    const response = await fetch(`${hourlyUrl}?apikey=${env.ACCUWEATHER_API_KEY}&metric=true&details=true`);
    
    if (!response.ok) {
      throw new Error(`AccuWeather API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 현재 시간 정보
    const now = new Date();
    const nowUtc = now.toISOString();
    const nowKst = new Date(now.getTime() + (9 * 60 * 60 * 1000)).toISOString();
    
    // 첫 번째 시간별 예보 분석
    const firstForecast = data[0];
    const firstDateTime = new Date(firstForecast.DateTime);
    const firstUtcAssumed = firstDateTime.toISOString();
    const firstKstFromUtc = new Date(firstDateTime.getTime() + (9 * 60 * 60 * 1000)).toISOString();
    
    return NextResponse.json({
      success: true,
      message: 'AccuWeather 원본 응답 분석',
      currentTime: {
        serverTime: nowUtc,
        serverTimeKst: nowKst,
        serverLocalTime: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      },
      firstForecast: {
        original: firstForecast,
        dateTime: firstDateTime.toISOString(),
        assumedUtc: firstUtcAssumed,
        convertedToKst: firstKstFromUtc,
        directKstDisplay: firstDateTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      },
      allForecasts: data.slice(0, 3).map((forecast: any) => ({
        dateTime: forecast.DateTime,
        parsed: new Date(forecast.DateTime).toISOString(),
        kstDisplay: new Date(forecast.DateTime).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        temperature: forecast.Temperature.Value,
        conditions: forecast.IconPhrase
      }))
    });
  } catch (error) {
    console.error('AccuWeather 원본 응답 분석 실패:', error);
    
    return NextResponse.json(
      { error: 'AccuWeather 원본 응답 분석에 실패했습니다' },
      { status: 500 }
    );
  }
}
