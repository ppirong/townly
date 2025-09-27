import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { utcToKst, getKoreanDayOfWeek, formatKoreanDate, getCurrentKoreanTime } from '@/lib/utils/timezone';

export async function GET(_request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 테스트용 UTC 시간들 (AccuWeather 형식)
    const testUtcTimes = [
      '2025-09-25T00:00:00Z',
      '2025-09-26T00:00:00Z',
      '2025-09-27T00:00:00Z',
      '2025-09-28T00:00:00Z',
      '2025-09-29T00:00:00Z',
      '2025-09-30T00:00:00Z',
    ];

    const results = testUtcTimes.map(utcTime => {
      const kstDate = utcToKst(utcTime);
      const dayOfWeek = getKoreanDayOfWeek(utcTime, true);
      const formattedDate = formatKoreanDate(utcTime, true);
      
      return {
        originalUtc: utcTime,
        kstDate: kstDate.toISOString(),
        formattedDate,
        dayOfWeek,
        kstDisplayTime: kstDate.toLocaleString('ko-KR', { 
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          weekday: 'short'
        })
      };
    });

    return NextResponse.json({
      success: true,
      message: '시간대 변환 테스트 결과',
      currentKoreanTime: getCurrentKoreanTime().toISOString(),
      currentUtc: new Date().toISOString(),
      testResults: results,
    });
  } catch (error) {
    console.error('시간대 테스트 실패:', error);
    
    return NextResponse.json(
      { error: '시간대 테스트에 실패했습니다' },
      { status: 500 }
    );
  }
}
