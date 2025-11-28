import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { hourlyWeatherData } from '@/db/schema';
import { desc, isNotNull } from 'drizzle-orm';

export async function GET(_request: NextRequest) {
  try {
    // 개발 환경에서는 인증 없이 테스트 가능
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!isDevelopment) {
      const { userId } = await auth();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('📊 기존 날씨 데이터 시간 분석 시작');
    
    // 현재 서버 시간 정보
    const now = new Date();
    const serverTime = {
      iso: now.toISOString(),
      utc: now.toUTCString(),
      kst: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      kstIso: new Date(now.getTime() + (9 * 60 * 60 * 1000)).toISOString(),
      timestamp: now.getTime(),
      description: '현재 한국 시간: 2025-09-27 11:42 기준'
    };
    
    console.log('🕐 현재 서버 시간:', serverTime);
    
    // 최근 저장된 날씨 데이터 조회 (최대 10개)
    const recentRecords = await db
      .select()
      .from(hourlyWeatherData)
      .where(isNotNull(hourlyWeatherData.forecastDatetime))
      .orderBy(desc(hourlyWeatherData.createdAt))
      .limit(10);

    console.log(`📦 총 ${recentRecords.length}개 레코드 발견`);

    // 각 레코드의 시간 정보 분석
    const timeAnalysis = recentRecords.map((record, index) => {
      const forecastDateTime = record.forecastDatetime;
      
      return {
        index,
        id: record.id,
        locationName: record.locationName,
        createdAt: record.createdAt?.toISOString(),
        storedData: {
          forecastDate: record.forecastDate,
          forecastHour: record.forecastHour,
          forecastDatetime: forecastDateTime.toISOString(),
        },
        timeAnalysis: {
          utcTime: forecastDateTime.toUTCString(),
          kstTime: forecastDateTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          rawTimestamp: forecastDateTime.getTime(),
        },
        // forecastDateTime이 이미 KST인지 UTC인지 추정
        assumingKST: {
          date: forecastDateTime.toISOString().split('T')[0],
          hour: forecastDateTime.getHours(),
          description: 'forecastDateTime을 KST로 가정했을 때'
        },
        assumingUTC: {
          kstDateTime: new Date(forecastDateTime.getTime() + (9 * 60 * 60 * 1000)).toISOString(),
          date: new Date(forecastDateTime.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0],
          hour: new Date(forecastDateTime.getTime() + (9 * 60 * 60 * 1000)).getHours(),
          description: 'forecastDateTime을 UTC로 가정하고 KST로 변환했을 때'
        }
      };
    });
    
    console.log('📊 시간 분석 결과:', timeAnalysis);
    
    // 패턴 분석
    const patterns = {
      forecastHourVsDateTime: timeAnalysis.map(record => ({
        id: record.id,
        storedForecastHour: record.storedData.forecastHour,
        dateTimeHourKST: record.assumingKST.hour,
        dateTimeHourUTCtoKST: record.assumingUTC.hour,
        match_KST: record.storedData.forecastHour === record.assumingKST.hour,
        match_UTC: record.storedData.forecastHour === record.assumingUTC.hour,
      }))
    };
    
    return NextResponse.json({
      success: true,
      currentTime: serverTime,
      analysis: {
        totalRecords: recentRecords.length,
        timeAnalysis,
        patterns,
        conclusion: {
          description: 'stored forecast_hour가 dateTimeHourKST와 일치하면 forecastDateTime은 이미 KST, dateTimeHourUTCtoKST와 일치하면 UTC입니다.',
          instruction: '현재 한국 시간 11:42와 비교해서 forecastDateTime이 어떤 시간대인지 판단하세요.'
        }
      }
    });
    
  } catch (error) {
    console.error('시간 분석 실패:', error);
    return NextResponse.json({ 
      error: '시간 분석에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
