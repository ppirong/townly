/**
 * 통합 날짜/시간 처리 유틸리티
 * 
 * 원칙:
 * 1. AccuWeather API에서 받은 DateTime을 한 번만 KST로 변환
 * 2. 변환된 KST 시간을 모든 곳에서 동일하게 사용
 * 3. 중복 변환 절대 금지
 */

/**
 * AccuWeather DateTime을 KST로 변환하는 단일 함수
 * 
 * 중요: 분석 결과 AccuWeather는 이미 KST 시간으로 응답을 제공함!
 * 따라서 추가 시간대 변환 없이 그대로 사용
 */
export function convertAccuWeatherDateTimeToKST(accuWeatherDateTime: string): {
  kstDateTime: Date;
  forecastDate: string;
  forecastHour: number;
} {
  console.log('🕐 AccuWeather DateTime 처리 시작:', accuWeatherDateTime);
  
  // AccuWeather DateTime을 그대로 파싱 (이미 KST)
  const kstDateTime = new Date(accuWeatherDateTime);
  
  console.log('🕐 KST 시간 (변환 없음):', kstDateTime.toISOString());
  
  // KST 기준으로 날짜와 시간 추출
  const forecastDate = kstDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const forecastHour = kstDateTime.getHours(); // 0-23
  
  console.log('📅 최종 결과:', {
    forecastDate,
    forecastHour,
    kstDateTime: kstDateTime.toISOString()
  });
  
  return {
    kstDateTime,
    forecastDate,
    forecastHour
  };
}

/**
 * AccuWeather DateTime이 이미 KST인지 확인하는 함수
 * 현재 한국 시간과 비교해서 판단
 */
export function detectAccuWeatherTimezone(accuWeatherDateTime: string): 'KST' | 'UTC' {
  const now = new Date();
  const currentKST = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  
  const parsedDate = new Date(accuWeatherDateTime);
  
  // 파싱된 시간과 현재 KST의 차이를 계산
  const diffHours = Math.abs(parsedDate.getTime() - currentKST.getTime()) / (1000 * 60 * 60);
  
  // 차이가 24시간 이내면 이미 KST일 가능성이 높음
  if (diffHours <= 24) {
    return 'KST';
  } else {
    return 'UTC';
  }
}

/**
 * KST 시간에서 표시용 시간 문자열 생성
 * 모든 곳에서 동일한 형식 사용
 */
export function formatKSTTime(kstDateTime: Date): {
  hour: string;
  date: string;
  dayOfWeek: string;
} {
  return {
    hour: kstDateTime.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      hour12: false 
    }),
    date: kstDateTime.toLocaleDateString('ko-KR'),
    dayOfWeek: kstDateTime.toLocaleDateString('ko-KR', { 
      weekday: 'short' 
    })
  };
}

/**
 * 현재 한국 시간 가져오기
 */
export function getCurrentKST(): Date {
  const now = new Date();
  return new Date(now.getTime() + (9 * 60 * 60 * 1000));
}

/**
 * 시간 변환 디버깅 로그
 */
export function logTimeConversion(step: string, original: string, converted: Date): void {
  console.log(`🕐 [${step}]`);
  console.log(`  - 원본: ${original}`);
  console.log(`  - 변환: ${converted.toISOString()}`);
  console.log(`  - KST: ${converted.toLocaleString('ko-KR')}`);
}
