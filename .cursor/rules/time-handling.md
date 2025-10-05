# 시간 처리 규칙 (Time Handling Rules)

## 핵심 원칙

### 1. 모든 외부 API 시간 데이터는 UTC → KST 변환 후 저장
**외부 API에서 받은 시간 데이터는 데이터베이스에 저장하기 전에 반드시 KST(한국 표준시, UTC+9)로 변환해야 합니다.**

### 2. 데이터베이스에는 항상 KST 시간 저장
**데이터베이스의 모든 시간 필드는 KST 기준으로 저장됩니다.**

### 3. 페이지에서는 추가 변환 없이 표시
**날씨 페이지, 미세먼지 페이지 등 사용자 화면에서는 데이터베이스에 저장된 KST 시간을 그대로 표시합니다. 페이지 내에서 추가로 시간을 변경하지 않습니다.**

## 구현 가이드

### 1. 시간 변환 전용 유틸리티 위치
**모든 시간 변환 로직은 `src/lib/utils/datetime.ts`에만 존재해야 합니다.**

```typescript
// src/lib/utils/datetime.ts

/**
 * AccuWeather API용 UTC → KST 변환
 */
export function convertAccuWeatherDateTimeToKST(accuWeatherDateTime: string): {
  kstDateTime: Date;
  forecastDate: string;
  forecastHour: number;
}

/**
 * Google API용 UTC → KST 변환
 */
export function convertGoogleDateTimeToKST(googleDateTime: string): {
  kstDateTime: Date;
  forecastDate: string;
  forecastHour: number;
}

/**
 * 범용 UTC → KST 변환 (모든 외부 API에 적용 가능)
 */
export function convertUTCToKST(utcDateTime: string | Date): {
  kstDateTime: Date;
  forecastDate: string;
  forecastHour: number;
}
```

### 2. 서비스 레이어에서 시간 변환 적용

#### AccuWeather API (src/lib/services/weather.ts)
```typescript
import { convertAccuWeatherDateTimeToKST } from '@/lib/utils/datetime';

// API 응답을 처리할 때 UTC → KST 변환
const hourlyData = data.map((forecast: any) => {
  const { kstDateTime } = convertAccuWeatherDateTimeToKST(forecast.DateTime);
  
  return {
    location: locationName,
    timestamp: kstDateTime.toISOString(), // KST 시간 저장
    // ...
  };
});
```

#### Google Air Quality API (src/lib/services/google-air-quality.ts)
```typescript
import { convertGoogleDateTimeToKST } from '@/lib/utils/datetime';

// 데이터베이스 저장 시 UTC → KST 변환
for (const data of processedData) {
  const { kstDateTime, forecastDate, forecastHour } = convertGoogleDateTimeToKST(data.dateTime);
  
  const dbData = {
    forecastDate,        // KST 기준 날짜 (YYYY-MM-DD)
    forecastHour,        // KST 기준 시간 (0-23)
    forecastDateTime: kstDateTime, // KST 기준 DateTime
    // ...
  };
}
```

### 3. 페이지에서 시간 표시

#### 날씨 페이지 (src/app/weather/page.tsx)
```typescript
// ✅ 올바른 방법: 데이터베이스의 KST 시간을 그대로 사용
export default async function WeatherPage() {
  const weatherData = await getHourlyWeather(params);
  
  return (
    <div>
      {/* timestamp는 이미 KST이므로 그대로 표시 */}
      <p>{new Date(weatherData.timestamp).toLocaleString('ko-KR')}</p>
    </div>
  );
}
```

#### 미세먼지 페이지 (src/app/airquality-google/page.tsx)
```typescript
// ✅ 올바른 방법: 데이터베이스의 KST 시간을 그대로 사용
export default async function AirQualityPage() {
  const airQualityData = await getHourlyAirQuality(params);
  
  return (
    <div>
      {/* forecastDateTime은 이미 KST이므로 그대로 표시 */}
      <p>{new Date(airQualityData.forecastDateTime).toLocaleString('ko-KR')}</p>
    </div>
  );
}
```

## API별 시간 형식

### AccuWeather API
- **응답 형식**: UTC 시간 (예: "2025-10-05T12:00:00Z")
- **변환 함수**: `convertAccuWeatherDateTimeToKST()`
- **저장 형식**: KST DateTime

### Google Air Quality API
- **응답 형식**: UTC 시간 (예: "2025-10-05T12:00:00Z")
- **변환 함수**: `convertGoogleDateTimeToKST()`
- **저장 형식**: KST DateTime

### 기타 외부 API
- **새로운 API 추가 시**: `convertUTCToKST()` 범용 함수 사용
- **변환 시점**: 데이터베이스 저장 직전
- **저장 형식**: 항상 KST DateTime

## 데이터베이스 스키마 요구사항

### 시간 관련 필드 명명 규칙
```typescript
{
  forecastDate: string;        // YYYY-MM-DD (KST 기준)
  forecastHour: number;        // 0-23 (KST 기준)
  forecastDateTime: Date;      // KST 기준 전체 날짜/시간
  timestamp: string;           // ISO 8601 형식 (KST 기준)
  createdAt: Date;            // 생성 시간 (KST)
  updatedAt: Date;            // 수정 시간 (KST)
}
```

## 금지 사항

### ❌ 절대 하지 말아야 할 것들

1. **페이지에서 시간 변환 금지**
```typescript
// ❌ 잘못된 예시
function WeatherComponent({ timestamp }: { timestamp: string }) {
  // 페이지에서 UTC → KST 변환 금지
  const kstTime = new Date(timestamp).getTime() + (9 * 60 * 60 * 1000);
  return <div>{new Date(kstTime).toLocaleString()}</div>;
}
```

2. **중복 변환 금지**
```typescript
// ❌ 잘못된 예시
const utcTime = new Date(apiResponse.dateTime);
const kstTime1 = new Date(utcTime.getTime() + (9 * 60 * 60 * 1000)); // 첫 번째 변환
const kstTime2 = new Date(kstTime1.getTime() + (9 * 60 * 60 * 1000)); // 중복 변환 (18시간 추가!)
```

3. **환경 의존적 메서드 사용 금지**
```typescript
// ❌ 잘못된 예시
const hour = new Date(timestamp).getHours(); // 서버 시간대에 의존적
const localeString = new Date(timestamp).toLocaleString(); // 서버 로케일에 의존적

// ✅ 올바른 예시
const hour = parseInt(timestamp.split('T')[1].split(':')[0], 10); // ISO 문자열 파싱
```

4. **datetime.ts 외부에서 시간 변환 로직 작성 금지**
```typescript
// ❌ 잘못된 예시 - 다른 파일에서 직접 변환
const kstTime = new Date(utcTime.getTime() + (9 * 60 * 60 * 1000));

// ✅ 올바른 예시 - datetime.ts의 함수 사용
import { convertUTCToKST } from '@/lib/utils/datetime';
const { kstDateTime } = convertUTCToKST(utcTime);
```

## 새 API 추가 시 체크리스트

### 1. API 시간 형식 확인
- [ ] API가 UTC 시간을 반환하는지 확인
- [ ] API 응답의 시간 필드명 확인 (예: `dateTime`, `timestamp`, `date`)
- [ ] 샘플 응답으로 시간대 테스트

### 2. 시간 변환 함수 추가 또는 사용
- [ ] `src/lib/utils/datetime.ts`에 API 전용 변환 함수 추가 또는 `convertUTCToKST()` 사용
- [ ] 변환 함수가 `forecastDate`, `forecastHour`, `kstDateTime` 반환하는지 확인

### 3. 서비스 레이어 구현
- [ ] API 응답 파싱 시 시간 변환 함수 호출
- [ ] 변환된 KST 시간을 데이터베이스에 저장
- [ ] 로그로 변환 전/후 시간 확인

### 4. 데이터베이스 스키마 확인
- [ ] `forecastDate`, `forecastHour`, `forecastDateTime` 필드 존재 확인
- [ ] 모든 시간 필드가 KST 기준임을 주석으로 명시

### 5. 페이지 구현
- [ ] 데이터베이스에서 가져온 시간을 그대로 표시
- [ ] 페이지 내에서 시간 변환 로직 없음을 확인

### 6. 테스트
- [ ] 로컬 환경과 Vercel 환경에서 동일한 시간 표시 확인
- [ ] 자정 전후 시간 경계값 테스트
- [ ] 서머타임 전환 시기 테스트 (필요 시)

## 예시: 새 API 통합

```typescript
// 1. datetime.ts에 변환 함수 추가 (선택적)
export function convertNewAPIDateTimeToKST(apiDateTime: string): {
  kstDateTime: Date;
  forecastDate: string;
  forecastHour: number;
} {
  return convertUTCToKST(apiDateTime); // 범용 함수 사용
}

// 2. 서비스 레이어에서 사용
import { convertNewAPIDateTimeToKST } from '@/lib/utils/datetime';

async function fetchNewAPIData() {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  
  // UTC → KST 변환
  const { kstDateTime, forecastDate, forecastHour } = convertNewAPIDateTimeToKST(data.timestamp);
  
  // 데이터베이스에 KST 시간 저장
  await db.insert(newApiData).values({
    forecastDate,      // KST 기준
    forecastHour,      // KST 기준
    forecastDateTime: kstDateTime, // KST 기준
    // ...
  });
}

// 3. 페이지에서 그대로 표시
async function NewAPIPage() {
  const data = await getNewAPIData();
  
  return (
    <div>
      {/* 이미 KST이므로 그대로 표시 */}
      <p>{data.forecastDateTime.toLocaleString('ko-KR')}</p>
    </div>
  );
}
```

## 참고 문서
- [docs/TIME_HANDLING_POLICY.md](../docs/TIME_HANDLING_POLICY.md): 상세 시간 처리 정책
- [src/lib/utils/datetime.ts](../src/lib/utils/datetime.ts): 시간 변환 유틸리티
- [src/lib/services/weather.ts](../src/lib/services/weather.ts): AccuWeather API 예시
- [src/lib/services/google-air-quality.ts](../src/lib/services/google-air-quality.ts): Google API 예시
