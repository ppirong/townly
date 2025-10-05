# 시간 처리 정책 (Time Handling Policy)

## 원칙

### 1. 단일 변환 지점 (Single Conversion Point)
- **모든 시간 변환은 `src/lib/utils/datetime.ts`에서만 수행**
- 다른 파일에서는 절대 추가 변환 금지

### 2. 변환 흐름 (Conversion Flow)
```
AccuWeather API DateTime (UTC)
→ convertAccuWeatherDateTimeToKST() [datetime.ts]
→ KST timestamp [weather.ts에서 저장]
→ 모든 곳에서 동일하게 사용 (추가 변환 없음)

Google Air Quality API dateTime (UTC)
→ convertGoogleDateTimeToKST() [datetime.ts]
→ KST timestamp [google-air-quality.ts에서 저장]
→ 모든 곳에서 동일하게 사용 (추가 변환 없음)

기타 외부 API (UTC)
→ convertUTCToKST() [datetime.ts]
→ KST timestamp [서비스 파일에서 저장]
→ 모든 곳에서 동일하게 사용 (추가 변환 없음)
```

### 3. 데이터 저장 형식
- `timestamp`: KST ISO 8601 형식 (예: "2025-09-27T13:00:00.000Z")
- `forecastDate`: YYYY-MM-DD 형식 (예: "2025-09-27")
- `forecastHour`: 0-23 정수 (예: 13) - **환경 무관 KST 시간**
- `forecastDateTime`: KST Date 객체

## 구현

### 파일별 역할

#### `src/lib/utils/datetime.ts`
- ✅ **유일한 시간 변환 지점**
- `convertAccuWeatherDateTimeToKST()`: AccuWeather DateTime → KST 변환 (**환경 무관**)
- `convertGoogleDateTimeToKST()`: Google API dateTime → KST 변환 (**환경 무관**)
- `convertUTCToKST()`: 범용 UTC → KST 변환 (**모든 외부 API에 적용 가능**)
- `formatKSTTime()`: KST 시간 포맷팅 (**환경 무관**)
- `detectAccuWeatherTimezone()`: 시간대 자동 감지

#### `src/lib/services/weather.ts`
- ✅ `convertAccuWeatherDateTimeToKST()` 호출하여 KST 변환
- ✅ 변환된 KST 시간을 `timestamp`에 저장
- ❌ 추가 시간 변환 금지

#### `src/lib/services/google-air-quality.ts`
- ✅ `convertGoogleDateTimeToKST()` 호출하여 KST 변환
- ✅ 변환된 KST 시간을 `forecastDateTime`에 저장
- ✅ `forecastDate`, `forecastHour`도 KST 기준으로 추출
- ❌ 추가 시간 변환 금지

#### `src/lib/services/weather-db.ts`
- ✅ `timestamp`를 그대로 사용 (이미 KST)
- ✅ `forecastDate`, `forecastHour` **환경 무관 ISO 파싱으로 추출**
- ❌ `.getHours()` 등 환경 의존적 메서드 사용 금지
- ❌ 추가 시간 변환 절대 금지

#### 기타 파일들
- ✅ KST로 변환된 시간을 그대로 사용
- ❌ 시간 변환 절대 금지

## 검증 방법

### 1. 현재 시간 확인
```bash
# 한국 시간: 2025-09-27 11:42
date
```

### 2. 저장된 데이터 확인
```sql
SELECT 
  forecast_date,
  forecast_hour,
  forecast_datetime,
  temperature
FROM hourly_weather_data 
ORDER BY forecast_datetime 
LIMIT 5;
```

### 3. 예상 결과 (환경 무관)
- `forecast_datetime`: 2025-09-27 13:00:00 → `forecast_hour`: 13
- `forecast_datetime`: 2025-09-27 14:00:00 → `forecast_hour`: 14
- **로컬과 Vercel에서 동일한 결과** (환경 무관 구현)

## 문제 해결

### 기존 잘못된 데이터 수정
```bash
POST /api/debug/fix-forecast-hour
```

### 시간대 일관성 테스트
```bash
GET /api/debug/timezone-test
```

## 주의사항

1. **절대 금지**: 여러 곳에서 시간 변환
2. **절대 금지**: UTC +9 중복 적용
3. **절대 금지**: `.getHours()`, `.toLocaleTimeString()` 등 환경 의존적 메서드
4. **필수**: 모든 시간은 KST 기준으로 통일
5. **필수**: 한 번 변환된 시간은 그대로 사용
6. **필수**: ISO 문자열 파싱으로 환경 무관 구현

## 개발 가이드

### 새로운 시간 관련 기능 추가 시
1. 외부 API의 시간 형식 확인 (UTC인지 확인)
2. `datetime.ts`에 API 전용 변환 함수 추가 또는 `convertUTCToKST()` 범용 함수 사용
3. 서비스 레이어에서 API 응답을 받을 때 즉시 KST 변환
4. 변환된 KST 시간을 데이터베이스에 저장
5. 페이지에서는 추가 변환 없이 그대로 표시
6. 직접 시간 변환 로직 작성 금지

### 코드 리뷰 체크리스트
- [ ] 시간 변환이 `datetime.ts`에서만 수행되는가?
- [ ] 중복 변환 로직이 없는가?
- [ ] KST 시간을 그대로 사용하는가?
- [ ] `+9` 시간 계산이 중복되지 않는가?
- [ ] **환경 의존적 메서드 사용 금지**: `.getHours()`, `.toLocaleTimeString()` 등
- [ ] **ISO 문자열 파싱 사용**: 환경 무관 시간 추출
- [ ] **로컬과 Vercel에서 동일한 결과 보장**
- [ ] **외부 API가 UTC 시간을 반환하는지 확인**
- [ ] **데이터베이스 저장 전 KST 변환 확인**
- [ ] **페이지에서 추가 시간 변환 없음 확인**
