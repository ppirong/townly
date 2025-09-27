# 시간 처리 정책 (Time Handling Policy)

## 원칙

### 1. 단일 변환 지점 (Single Conversion Point)
- **모든 시간 변환은 `src/lib/utils/datetime.ts`에서만 수행**
- 다른 파일에서는 절대 추가 변환 금지

### 2. 변환 흐름 (Conversion Flow)
```
AccuWeather API DateTime 
→ convertAccuWeatherDateTimeToKST() [datetime.ts]
→ KST timestamp [weather.ts에서 저장]
→ 모든 곳에서 동일하게 사용 (추가 변환 없음)
```

### 3. 데이터 저장 형식
- `timestamp`: KST ISO 8601 형식 (예: "2025-09-27T01:00:00.000Z")
- `forecastDate`: YYYY-MM-DD 형식 (예: "2025-09-27")
- `forecastHour`: 0-23 정수 (예: 1)
- `forecastDateTime`: KST Date 객체

## 구현

### 파일별 역할

#### `src/lib/utils/datetime.ts`
- ✅ **유일한 시간 변환 지점**
- `convertAccuWeatherDateTimeToKST()`: AccuWeather DateTime → KST 변환
- `formatKSTTime()`: KST 시간 포맷팅
- `detectAccuWeatherTimezone()`: 시간대 자동 감지

#### `src/lib/services/weather.ts`
- ✅ `convertAccuWeatherDateTimeToKST()` 호출하여 KST 변환
- ✅ 변환된 KST 시간을 `timestamp`에 저장
- ❌ 추가 시간 변환 금지

#### `src/lib/services/weather-db.ts`
- ✅ `timestamp`를 그대로 사용 (이미 KST)
- ✅ `forecastDate`, `forecastHour` 직접 추출
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

### 3. 예상 결과
- `forecast_datetime`: 2025-09-27 01:00:00 → `forecast_hour`: 1
- `forecast_datetime`: 2025-09-27 02:00:00 → `forecast_hour`: 2
- **절대로** 10, 11시가 나오면 안됨 (9시간 중복 변환 오류)

## 문제 해결

### 기존 잘못된 데이터 수정
```bash
POST /api/debug/fix-forecast-hour
```

### 새로운 데이터 확인
```bash
GET /api/debug/analyze-existing-time
```

## 주의사항

1. **절대 금지**: 여러 곳에서 시간 변환
2. **절대 금지**: UTC +9 중복 적용
3. **필수**: 모든 시간은 KST 기준으로 통일
4. **필수**: 한 번 변환된 시간은 그대로 사용

## 개발 가이드

### 새로운 시간 관련 기능 추가 시
1. `datetime.ts`에 유틸리티 함수 추가
2. 다른 파일에서는 해당 함수만 사용
3. 직접 시간 변환 로직 작성 금지

### 코드 리뷰 체크리스트
- [ ] 시간 변환이 `datetime.ts`에서만 수행되는가?
- [ ] 중복 변환 로직이 없는가?
- [ ] KST 시간을 그대로 사용하는가?
- [ ] `+9` 시간 계산이 중복되지 않는가?
