import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET(_request: NextRequest) {
  try {
    console.log('🕐 AccuWeather API 시간대 테스트 시작');
    
    // 현재 서버 시간 정보
    const now = new Date();
    const serverTime = {
      iso: now.toISOString(),
      utc: now.toUTCString(),
      kst: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      timestamp: now.getTime()
    };
    
    console.log('🕐 현재 서버 시간:', serverTime);
    
    if (!env.ACCUWEATHER_API_KEY) {
      return NextResponse.json({ error: 'AccuWeather API 키가 설정되지 않았습니다.' });
    }

    // 먼저 서울 위치 키를 조회
    const searchUrl = `https://dataservice.accuweather.com/locations/v1/cities/search`;
    const searchResponse = await fetch(`${searchUrl}?apikey=${env.ACCUWEATHER_API_KEY}&q=Seoul&language=ko-kr`);
    
    if (!searchResponse.ok) {
      return NextResponse.json({ 
        error: `위치 검색 API 오류: ${searchResponse.status} ${searchResponse.statusText}` 
      });
    }
    
    const locations = await searchResponse.json();
    if (!locations || locations.length === 0) {
      return NextResponse.json({ error: '서울 위치를 찾을 수 없습니다.' });
    }
    
    const seoulLocationKey = locations[0].Key;
    console.log('🏙️ 서울 위치 키:', seoulLocationKey);
    
    // 시간별 날씨 조회
    const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/hourly/3hour/${seoulLocationKey}`;
    
    console.log('🌐 AccuWeather API 호출:', forecastUrl);
    
    const response = await fetch(`${forecastUrl}?apikey=${env.ACCUWEATHER_API_KEY}&metric=true`);
    
    if (!response.ok) {
      return NextResponse.json({ 
        error: `AccuWeather API 오류: ${response.status} ${response.statusText}` 
      });
    }
    
    const data = await response.json();
    
    // 첫 3개 예보 데이터의 시간 분석
    const timeAnalysis = data.slice(0, 3).map((forecast: any, index: number) => {
      const dateTimeStr = forecast.DateTime;
      const parsedDate = new Date(dateTimeStr);
      
      return {
        index,
        original: dateTimeStr,
        parsed: {
          iso: parsedDate.toISOString(),
          utc: parsedDate.toUTCString(),
          kst: parsedDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          timestamp: parsedDate.getTime()
        },
        utcPlus9: {
          iso: new Date(parsedDate.getTime() + (9 * 60 * 60 * 1000)).toISOString(),
          kst: new Date(parsedDate.getTime() + (9 * 60 * 60 * 1000)).toLocaleString('ko-KR'),
        }
      };
    });
    
    console.log('📊 AccuWeather 시간 분석:', timeAnalysis);
    
    return NextResponse.json({
      success: true,
      serverTime,
      accuWeatherData: {
        totalForecasts: data.length,
        timeAnalysis
      },
      analysis: {
        description: '현재 한국 시간과 AccuWeather DateTime을 비교하여 시간대를 확인합니다.',
        currentKST: serverTime.kst,
        instruction: 'AccuWeather DateTime이 현재 한국 시간과 비슷하면 이미 KST, 9시간 차이가 나면 UTC입니다.'
      }
    });
    
  } catch (error) {
    console.error('AccuWeather 시간 테스트 실패:', error);
    return NextResponse.json({ 
      error: 'AccuWeather 시간 테스트에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
