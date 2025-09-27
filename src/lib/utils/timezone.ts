/**
 * 시간대 변환 유틸리티
 */

/**
 * UTC 시간을 한국 시간(KST, UTC+9)으로 변환
 * @param utcDate UTC 시간 Date 객체 또는 ISO 문자열
 * @returns 한국 시간으로 변환된 Date 객체
 */
export function utcToKst(utcDate: Date | string): Date {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
}

/**
 * 한국 시간을 UTC 시간으로 변환
 * @param kstDate 한국 시간 Date 객체
 * @returns UTC 시간으로 변환된 Date 객체
 */
export function kstToUtc(kstDate: Date): Date {
  return new Date(kstDate.getTime() - (9 * 60 * 60 * 1000)); // UTC+9를 빼서 UTC로
}

/**
 * 날짜를 한국 시간 기준 요일로 변환
 * @param date Date 객체 또는 ISO 문자열
 * @param isUtc true면 UTC를 KST로 변환 후 요일 계산, false면 그대로 계산
 * @returns 한국어 요일 문자열
 */
export function getKoreanDayOfWeek(date: Date | string, isUtc: boolean = true): string {
  const targetDate = isUtc ? utcToKst(date) : (typeof date === 'string' ? new Date(date) : date);
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  return dayOfWeek[targetDate.getDay()];
}

/**
 * 날짜를 한국 시간 기준 YYYY-MM-DD 형식으로 변환
 * @param date Date 객체 또는 ISO 문자열
 * @param isUtc true면 UTC를 KST로 변환 후 포맷, false면 그대로 포맷
 * @returns YYYY-MM-DD 형식 문자열
 */
export function formatKoreanDate(date: Date | string, isUtc: boolean = true): string {
  const targetDate = isUtc ? utcToKst(date) : (typeof date === 'string' ? new Date(date) : date);
  return targetDate.toISOString().split('T')[0];
}

/**
 * 현재 한국 시간 가져오기
 * @returns 한국 시간 Date 객체
 */
export function getCurrentKoreanTime(): Date {
  return utcToKst(new Date());
}

/**
 * 시간을 한국 시간 기준으로 포맷
 * @param date Date 객체 또는 ISO 문자열
 * @param isUtc true면 UTC를 KST로 변환 후 포맷, false면 그대로 포맷
 * @returns 한국 시간 포맷 문자열
 */
export function formatKoreanTime(date: Date | string, isUtc: boolean = true): string {
  const targetDate = isUtc ? utcToKst(date) : (typeof date === 'string' ? new Date(date) : date);
  return targetDate.toLocaleTimeString('ko-KR', { 
    hour: '2-digit',
    minute: '2-digit',
    hour12: false 
  });
}
