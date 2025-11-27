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
 * 환경에 상관없이 항상 KST 시간대를 기준으로 변환합니다.
 */
export function convertAccuWeatherDateTimeToKST(accuWeatherDateTime: string): {
  kstDateTime: Date;
  forecastDate: string;
  forecastHour: number;
} {
  
  // AccuWeather DateTime을 UTC로 파싱
  const utcDateTime = new Date(accuWeatherDateTime);
  
  
  // KST 시간대로 포맷팅하여 날짜와 시간 추출 (환경 무관)
  const kstString = utcDateTime.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }); // YYYY-MM-DD HH:mm:ss
  const forecastDate = kstString.split(' ')[0]; // YYYY-MM-DD
  const forecastHour = parseInt(kstString.split(' ')[1].split(':')[0], 10); // KST 시간 (0-23)
  
  // ✅ 핵심 수정: KST 시간을 PostgreSQL timestamp로 저장하기 위해
  // KST 문자열을 Date 객체로 변환 (시간대 정보 없이)
  const kstDateTime = new Date(kstString.replace(' ', 'T') + '.000Z');
  
  
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
 * 환경에 상관없이 일관된 형식 사용
 */
export function formatKSTTime(kstDateTime: Date): {
  hour: string;
  date: string;
  dayOfWeek: string;
} {
  // KST DateTime에서 환경 무관하게 시간 추출
  const hour = parseInt(kstDateTime.toISOString().split('T')[1].split(':')[0], 10);
  const hourString = `${hour.toString().padStart(2, '0')}시`;
  
  // 환경 무관하게 날짜 포맷팅
  const date = kstDateTime.toISOString().split('T')[0];
  
  // 요일 계산 (환경 무관)
  const dayOfWeekNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = dayOfWeekNames[kstDateTime.getUTCDay()];
  
  return {
    hour: hourString,
    date: date,
    dayOfWeek: dayOfWeek
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
 * Google Air Quality API DateTime을 KST로 변환하는 함수
 * Google API는 UTC 시간을 반환하므로 KST(UTC+9)로 변환합니다.
 * 
 * @param googleDateTime - Google API의 dateTime 필드 (UTC 기준)
 * @returns KST로 변환된 Date 객체와 관련 정보
 */
export function convertGoogleDateTimeToKST(googleDateTime: string): {
  kstDateTime: Date;
  forecastDate: string;
  forecastHour: number;
} {
  
  // Google API DateTime을 UTC로 파싱
  const utcDateTime = new Date(googleDateTime);
  
  // 명시적으로 KST로 변환 (UTC+9)
  const kstDateTime = new Date(utcDateTime.getTime() + (9 * 60 * 60 * 1000));
  
  
  // KST 기준으로 날짜와 시간 추출 (환경 무관하게 ISO 문자열 파싱)
  const forecastDate = kstDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const forecastHour = parseInt(kstDateTime.toISOString().split('T')[1].split(':')[0], 10); // KST 시간 (0-23)
  
  
  return {
    kstDateTime,
    forecastDate,
    forecastHour
  };
}

/**
 * 범용 UTC → KST 변환 함수
 * 모든 외부 API에서 UTC 시간을 받을 때 사용
 * 
 * @param utcDateTime - UTC 시간 문자열 또는 Date 객체
 * @returns KST로 변환된 Date 객체와 관련 정보
 */
export function convertUTCToKST(utcDateTime: string | Date): {
  kstDateTime: Date;
  forecastDate: string;
  forecastHour: number;
} {
  
  // UTC DateTime 파싱
  const utcDate = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
  
  // 명시적으로 KST로 변환 (UTC+9)
  const kstDateTime = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
  
  
  // KST 기준으로 날짜와 시간 추출 (환경 무관하게 ISO 문자열 파싱)
  const forecastDate = kstDateTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const forecastHour = parseInt(kstDateTime.toISOString().split('T')[1].split(':')[0], 10); // KST 시간 (0-23)
  
  
  return {
    kstDateTime,
    forecastDate,
    forecastHour
  };
}

/**
 * 시간 변환 디버깅 로그
 */
export function logTimeConversion(step: string, original: string, converted: Date): void {
  // 디버깅 로그 제거됨
}
