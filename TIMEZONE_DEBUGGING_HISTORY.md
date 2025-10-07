# 시간대 처리 오류 디버깅 히스토리

## 문제 개요

**발생 일시**: 2025-10-07  
**문제 설명**: `hourly_weather_data` 테이블에서 `forecast_datetime`은 정확한 KST 시간이지만, `forecast_date`와 `forecast_hour` 필드가 9시간 차이나는 문제

### 핵심 증상
- `forecast_datetime`: `2025-10-08 00:00:00` (KST, 정확함)
- `forecast_date`: `2025-10-07` (잘못됨, 하루 전)
- `forecast_hour`: `15` (잘못됨, 9시간 차이)

**예상 결과**: 모든 필드가 동일한 KST 시간을 나타내야 함

---

## 해결 시도 1차: weather-db.ts 수정

### 가설
`src/lib/services/weather-db.ts`에서 `forecast_date`와 `forecast_hour`를 계산할 때 시간대 변환 오류

### 시도한 해결책
```typescript
// 기존 (문제 코드)
const forecastDate = kstDateTime.toISOString().split('T')[0];
const forecastHour = parseInt(kstDateTime.toISOString().split('T')[1].split(':')[0], 10);

// 수정 시도
const forecastDate = kstDateTime.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).split(' ')[0];
const forecastHour = parseInt(kstDateTime.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).split(' ')[1].split(':')[0], 10);
```

### 결과
**실패** - 문제 지속

### 원인 분석
`kstDateTime` 자체가 이미 잘못된 값을 가지고 있었음

---

## 해결 시도 2차: fix-forecast-hour API 수정

### 가설
기존 데이터베이스의 잘못된 데이터를 수정하는 API에서도 동일한 로직 오류

### 시도한 해결책
```typescript
// 수정된 계산 로직
const correctForecastDate = record.forecastDateTime.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).split(' ')[0];
const correctForecastHour = parseInt(record.forecastDateTime.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).split(' ')[1].split(':')[0], 10);
```

### 결과
**실패** - 문제 지속

### 원인 분석
근본적인 문제는 `datetime.ts`에서 발생하고 있었음

---

## 해결 시도 3차: datetime.ts 근본 원인 수정

### 가설
`src/lib/utils/datetime.ts`의 `convertAccuWeatherDateTimeToKST` 함수에서 KST 변환 로직 오류

### 발견된 문제
```typescript
// 문제 코드
const kstDateTime = new Date(utcDateTime.getTime() + (9 * 60 * 60 * 1000));
// 이후 kstDateTime.toISOString()을 사용하여 날짜/시간 추출
const forecastDate = kstDateTime.toISOString().split('T')[0];
const forecastHour = parseInt(kstDateTime.toISOString().split('T')[1].split(':')[0], 10);
```

### 문제 분석
1. `utcDateTime.getTime() + (9 * 60 * 60 * 1000)`로 KST 시간을 만듦
2. 하지만 `toISOString()`은 항상 UTC로 변환하여 출력
3. 결과적으로 KST+9 시간이 UTC로 해석되어 다시 9시간 차이 발생

### 시도한 해결책 1
```typescript
// toLocaleString 사용
const kstString = utcDateTime.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
const forecastDate = kstString.split(' ')[0];
const forecastHour = parseInt(kstString.split(' ')[1].split(':')[0], 10);

// 여전히 잘못된 kstDateTime 생성
const kstDateTime = new Date(utcDateTime.getTime() + (9 * 60 * 60 * 1000));
```

### 결과
**부분 성공** - `forecastDate`와 `forecastHour`는 올바르지만 `kstDateTime` 여전히 문제

---

## 해결 시도 4차: PostgreSQL timestamp 해석 문제

### 새로운 가설
PostgreSQL `timestamp` 타입은 시간대 정보를 저장하지 않음. JavaScript에서 이를 읽을 때 UTC로 해석하는 문제

### 발견된 핵심 문제
```typescript
// PostgreSQL에 저장: 2025-10-08 00:00:00 (KST 의미)
// JavaScript에서 읽기: 2025-10-08T00:00:00.000Z (UTC로 해석)
// 서버가 KST 환경에서 getHours() 호출: 9시간 추가되어 09:00 반환
```

### 시도한 해결책
```typescript
// UTC 메서드 사용으로 시간대 영향 제거
const forecastDate = record.forecastDateTime.toISOString().split('T')[0];
const forecastHour = record.forecastDateTime.getUTCHours();
```

### 결과
**실패** - 여전히 문제 지속

---

## 해결 시도 5차: kstDateTime 생성 방식 변경

### 최종 가설
`kstDateTime` 생성 시 KST 문자열을 직접 Date 객체로 변환해야 함

### 시도한 해결책
```typescript
// 기존 (문제)
const kstDateTime = new Date(utcDateTime.getTime() + (9 * 60 * 60 * 1000));

// 수정
const kstString = utcDateTime.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' });
const kstDateTime = new Date(kstString.replace(' ', 'T') + '.000Z');
```

### 결과
**실패** - 로그에서 여전히 동일한 패턴 확인

---

## 현재 상황 분석

### 로그 분석 결과
```
🕐 AccuWeather DateTime 처리 시작: 2025-10-08T00:00:00+09:00
🕐 UTC 시간: 2025-10-07T15:00:00.000Z
🕐 KST 포맷팅: 2025-10-08 00:00:00
🕐 KST 문자열 → Date: 2025-10-08T00:00:00.000Z
📅 최종 결과: {
  forecastDate: '2025-10-08',
  forecastHour: 0,
  kstDateTime: '2025-10-08T00:00:00.000Z',
  kstDateTimeForDB: '2025-10-08 00:00:00'
}
```

### 문제점
1. `datetime.ts`에서는 올바른 값을 생성하고 있음
2. 하지만 데이터베이스에 저장된 후 다시 읽을 때 문제 발생
3. `weather-db.ts`에서 여전히 잘못된 계산 로직 사용 중

---

## 미해결 원인 추정

### 1. weather-db.ts의 계산 로직
현재 `weather-db.ts`에서 `data.forecastDate`, `data.forecastHour`를 사용하지 않고 `kstDateTime`에서 재계산하고 있을 가능성

### 2. 데이터베이스 저장/읽기 과정
- 저장: KST 시간으로 저장
- 읽기: UTC로 해석되어 시간대 차이 발생

### 3. 서버 환경의 시간대 설정
서버가 KST 환경에서 실행되어 추가적인 시간대 변환이 발생할 가능성

---

## 향후 해결 방향

### 1. 우선순위 높음
1. **weather-db.ts 완전 수정**: `data.forecastDate`, `data.forecastHour` 직접 사용
2. **PostgreSQL 시간대 설정 확인**: `timestamp with time zone` 사용 검토
3. **서버 환경 시간대 확인**: `TZ=UTC` 환경변수 설정 검토

### 2. 대안 접근법
1. **문자열 기반 저장**: 시간을 문자열로 저장하여 시간대 문제 회피
2. **UTC 기준 통일**: 모든 시간을 UTC로 저장하고 표시할 때만 KST 변환
3. **라이브러리 사용**: `date-fns-tz` 또는 `moment-timezone` 사용

### 3. 디버깅 도구
1. **상세 로깅**: 각 단계별 시간 값 추적
2. **데이터베이스 직접 쿼리**: 실제 저장된 값 확인
3. **환경 변수 확인**: 서버 시간대 설정 점검

---

## 교훈 및 주의사항

### 1. JavaScript Date 객체의 함정
- `new Date(timestamp + offset)`는 위험함
- `toISOString()`은 항상 UTC로 변환
- 시간대 처리는 전용 라이브러리 사용 권장

### 2. PostgreSQL timestamp 타입
- `timestamp`는 시간대 정보 없음
- `timestamp with time zone` 사용 검토 필요
- JavaScript에서 읽을 때 UTC로 해석됨

### 3. 서버 환경 고려사항
- 서버의 로컬 시간대가 계산에 영향
- 환경 변수로 UTC 설정 권장
- 개발/운영 환경 일관성 중요

### 4. 디버깅 접근법
- 단계별 로깅으로 정확한 문제점 파악
- 가정보다는 실제 데이터 확인
- 근본 원인 파악 후 수정

---

## 참고 자료

### 관련 파일
- `src/lib/utils/datetime.ts` - 시간 변환 로직
- `src/lib/services/weather-db.ts` - 데이터베이스 저장 로직
- `src/lib/services/weather.ts` - 날씨 데이터 처리
- `src/app/api/debug/fix-forecast-hour/route.ts` - 데이터 수정 API

### 핵심 함수
- `convertAccuWeatherDateTimeToKST()` - AccuWeather 시간 변환
- `saveHourlyWeatherData()` - 시간별 데이터 저장
- `getHourlyWeather()` - 날씨 데이터 조회

### 데이터베이스 스키마
```sql
forecast_datetime TIMESTAMP NOT NULL,  -- KST 시간 (시간대 정보 없음)
forecast_date TEXT NOT NULL,           -- YYYY-MM-DD 형식
forecast_hour INTEGER NOT NULL         -- 0-23 시간
```

---

**작성일**: 2025-10-07  
**상태**: 미해결  
**다음 단계**: weather-db.ts에서 직접 계산 로직 제거 및 전달받은 값 사용
