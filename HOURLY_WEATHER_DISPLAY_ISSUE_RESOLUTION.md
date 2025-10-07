# 시간별 날씨 표시 문제 해결 가이드

## 문제 개요

### 증상
- **데이터베이스**: `hourly_weather_data` 테이블에 10월 7일 16시부터 10월 8일 3시까지 12시간의 날씨 데이터 존재
- **화면 표시**: 날씨 페이지에서 16시, 17시, 18시만 표시 (3시간만 표시)
- **기대 결과**: 16시부터 다음날 3시까지 12시간 모두 표시되어야 함

### 환경
- **프레임워크**: Next.js 15.5.2 + TypeScript
- **데이터베이스**: PostgreSQL (Drizzle ORM)
- **시간대**: KST (한국 표준시)

## 문제 원인

### 1. 시간대 처리 오류
PostgreSQL의 `timestamp` 타입은 시간대 정보를 저장하지 않지만, JavaScript는 이를 UTC로 해석하여 조회 범위가 잘못 계산됨

### 2. 데이터베이스 조회 범위 불일치
- **데이터베이스**: KST 16:00 ~ 다음날 03:00 (12시간)
- **조회 범위**: UTC 기준으로 계산되어 KST 20:00 이후 데이터 제외

### 3. TTL 만료 문제
10분으로 설정된 짧은 캐시 유효 시간으로 인해 데이터가 빠르게 만료됨

## 해결 방법

### 1. KST 기준 조회 범위 설정

```typescript
// ✅ 최종 해결 코드 (src/actions/weather.ts)
// 현재 KST 시간을 정시로 내림 (예: 16:39 → 16:00)
const now = new Date();
const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC + 9시간 = KST
const kstCurrentHour = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate(), kstNow.getHours(), 0, 0, 0);

// KST 기준 조회 범위 설정 (12시간)
const kstMaxForecastTime = new Date(kstCurrentHour.getTime() + (hours * 60 * 60 * 1000));

// 데이터베이스 조회용 Date 객체 생성 (KST 시간을 직접 사용)
const currentHour = new Date(kstCurrentHour.getFullYear(), kstCurrentHour.getMonth(), kstCurrentHour.getDate(), kstCurrentHour.getHours(), 0, 0, 0);
const maxForecastTime = new Date(kstMaxForecastTime.getFullYear(), kstMaxForecastTime.getMonth(), kstMaxForecastTime.getDate(), kstMaxForecastTime.getHours(), 0, 0, 0);

// 데이터베이스 조회
const dbRecords = await db
  .select()
  .from(hourlyWeatherData)
  .where(and(
    eq(hourlyWeatherData.clerkUserId, userId),
    gte(hourlyWeatherData.forecastDateTime, currentHour),
    lte(hourlyWeatherData.forecastDateTime, maxForecastTime)
  ))
  .orderBy(hourlyWeatherData.forecastDateTime)
  .limit(hours);
```

### 2. TTL 설정 최적화

```typescript
// ✅ 수정된 TTL 설정 (src/lib/services/weather-db.ts)
// 시간별 날씨 데이터: 10분 → 60분 (1시간)
ttlMinutes: number = 60

// 일별 날씨 데이터: 30분 → 120분 (2시간)
ttlMinutes: number = 120
```

### 3. 데이터 변환 로직 수정

```typescript
// ✅ forecast_datetime에서 직접 시간 추출
const weatherData: HourlyWeatherData[] = dbRecords.map(record => {
  // PostgreSQL timestamp는 KST로 저장되어 있지만 JavaScript에서 UTC로 해석됨
  // 따라서 getUTCHours()를 사용하여 실제 저장된 KST 시간을 추출
  const hour = record.forecastDateTime.getUTCHours();

  return {
    location: record.locationName,
    timestamp: record.forecastDateTime.toISOString(),
    hour: `${hour.toString().padStart(2, '0')}시`,
    forecastDate: record.forecastDateTime.toISOString().split('T')[0], // YYYY-MM-DD
    forecastHour: hour, // 0-23
    temperature: record.temperature,
    conditions: record.conditions,
    weatherIcon: record.weatherIcon,
    humidity: record.humidity || 0,
    precipitation: parseFloat(record.precipitation || '0'),
    precipitationProbability: record.precipitationProbability || 0,
    rainProbability: record.rainProbability || 0,
    windSpeed: record.windSpeed || 0,
    units: record.units as 'metric' | 'imperial',
  };
});
```

## 수정된 파일

### 1. `src/actions/weather.ts`
- KST 기준 조회 범위 계산 로직 수정
- `forecastDate`, `forecastHour` 속성 추가

### 2. `src/lib/services/weather-db.ts`
- TTL 설정 최적화 (10분 → 60분, 30분 → 120분)
- `getHourlyWeatherData` 함수에서 `forecastDate`, `forecastHour` 속성 추가

## 테스트 결과

### 성공 로그 예시
```
🕐 KST 조회 시작: 2025-10-07T16:00:00.000
🕐 KST 조회 종료: 2025-10-08T04:00:00.000
📊 2단계 - 시간 범위 조건 적용: 13개
📊 3단계 - limit(12) 적용: 12개
✅ 시간별 날씨 조회 완료: 12개 항목
```

### 화면 표시 결과
- ✅ 16시부터 다음날 3시까지 12시간 모두 표시
- ✅ 각 시간대의 온도, 날씨 상태 정상 표시

## 핵심 해결책

**PostgreSQL timestamp + JavaScript Date 객체 시간대 불일치 해결**

1. **KST 기준 조회 범위 설정**: UTC 변환 없이 직접 KST 시간으로 계산
2. **TTL 최적화**: 캐시 유효 시간을 충분히 연장
3. **데이터 변환 로직 수정**: `getUTCHours()` 사용하여 정확한 시간 추출

이 수정을 통해 데이터베이스에 저장된 12시간의 날씨 데이터가 모두 정상적으로 표시됩니다.

## 추가 발견: forecast_date와 forecast_hour 9시간 오차 문제

### 문제 증상
- **데이터베이스**: `forecast_datetime`은 정확한 KST 시간으로 저장됨
- **문제**: `forecast_date`와 `forecast_hour` 필드가 9시간 늦게 저장됨
- **예시**: KST 2시 → `forecast_hour`에 11시로 저장 (2 + 9 = 11)

### 문제 원인
**스마트 TTL 시스템의 시간 추출 로직 오류**

`src/lib/services/smart-weather-db.ts`의 77번 라인에서 `getHours()` 메서드 사용:

```typescript
// ❌ 문제가 된 코드
const forecastHour = forecastTime.getHours();
```

**문제 분석:**
1. `data.timestamp`는 KST 시간이지만 `"2025-10-08T02:00:00.000Z"` 형태로 저장됨
2. `new Date(data.timestamp)`로 생성된 `forecastTime`은 JavaScript에서 UTC로 해석됨
3. **`getHours()`**는 **서버의 로컬 시간대(KST)**를 적용하여 **UTC+9** 결과를 반환함
4. 따라서 KST 2시 → UTC 2시로 해석 → 서버 로컬 시간대 적용 → **11시**가 됨

### 해결 방법

```typescript
// ✅ 수정된 코드 (src/lib/services/smart-weather-db.ts)
const forecastHour = forecastTime.getUTCHours(); // getHours() → getUTCHours() 수정
```

**해결 원리:**
- PostgreSQL `timestamp`는 시간대 정보 없이 저장되므로 JavaScript에서 UTC로 해석됨
- `getUTCHours()`를 사용하여 실제 저장된 KST 값을 정확히 추출
- 서버의 로컬 시간대 영향을 받지 않음

### 수정된 파일

#### 3. `src/lib/services/smart-weather-db.ts`
- 77번 라인: `getHours()` → `getUTCHours()` 수정
- 스마트 TTL 시스템에서 정확한 KST 시간 추출

### 테스트 결과
```
📅 최종 결과: {
  forecastDate: '2025-10-08',
  forecastHour: 2,  // ✅ 정확한 KST 시간 (이전: 11시)
  kstDateTime: '2025-10-08T02:00:00.000Z'
}
```

## 전체 해결책 요약

**두 가지 주요 문제와 해결책:**

1. **시간별 날씨 표시 제한 문제**: KST 기준 조회 범위 설정으로 해결
2. **forecast_date/forecast_hour 9시간 오차**: `getUTCHours()` 사용으로 해결

이제 모든 시간대 관련 문제가 완전히 해결되어 정확한 KST 기준으로 날씨 데이터가 저장되고 표시됩니다.
