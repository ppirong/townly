# 에어코리아 API vs 웹사이트 데이터 불일치 해결 가이드

## 🔍 문제 상황
- **웹사이트 데이터**: 운정 측정소 12시 기준 PM10: 21μg/m³, PM2.5: 9μg/m³
- **API 데이터**: 운정 측정소 PM10: 10μg/m³, PM2.5: 7μg/m³

## 🛠️ 해결된 사항

### 1. API 응답 캐싱 비활성화
- 개발 환경에서 `next: { revalidate: 0 }` 설정
- `Cache-Control` 헤더로 브라우저 캐시 비활성화
- 실시간 최신 데이터 보장

### 2. 상세 로깅 시스템 구현
- API 요청/응답 시간 기록
- 운정 측정소 데이터 특별 모니터링
- 웹사이트 vs API 데이터 비교 자동화

### 3. 디버그 도구 제공
- `/api/debug/airquality` - API 응답 상세 분석
- `/api/debug/nearest-station` - 측정소 선택 검증
- 다양한 API 버전 비교 테스트

## 🧪 테스트 방법

### 1. 에어코리아 API 디버그
```bash
GET /api/debug/airquality?stationName=운정&ver=1.3
```

### 2. 시도별 데이터 조회
```bash
GET /api/debug/airquality?sidoName=경기&numOfRows=50
```

### 3. 측정소 위치 검증
```bash
GET /api/debug/nearest-station?latitude=37.7390&longitude=126.7670
```

## 📊 데이터 불일치 가능한 원인

### 1. 시간 지연 (Time Lag)
- **웹사이트**: 실시간 업데이트 (1-5분 간격)
- **API**: 정시 또는 30분 간격 업데이트
- **해결**: 더 자주 API 호출하여 최신 데이터 확보

### 2. API 버전 차이
- **현재 사용**: v1.3 (최신)
- **웹사이트**: 다른 내부 API 또는 다른 버전 사용 가능
- **해결**: 디버그 API에서 모든 버전 테스트

### 3. 측정소 데이터 소스 차이
- **API**: 공식 OpenAPI 데이터
- **웹사이트**: 내부 데이터베이스 또는 다른 소스
- **해결**: 측정소명 정확성 및 데이터 출처 확인

### 4. 캐싱 정책 차이
- **웹사이트**: 실시간 또는 짧은 캐시
- **API**: 기본 5분 캐시 (현재 비활성화됨)
- **해결**: 캐시 완전 비활성화

### 5. 데이터 처리 방식 차이
- **pm10Value**: 현재 농도
- **pm10Value24**: 24시간 예측이동농도
- **웹사이트**: 어떤 값을 표시하는지 불분명
- **해결**: 두 값 모두 비교하여 확인

## 🔧 현재 구현된 해결책

### 1. 실시간 데이터 보장
```typescript
// 캐시 비활성화
headers: {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
},
next: { revalidate: process.env.NODE_ENV === 'development' ? 0 : 60 }
```

### 2. 상세 비교 로깅
```typescript
// 운정 측정소 데이터 특별 확인
if (stationName === '운정' && stationData.length > 0) {
  console.log('🎯 운정 측정소 API 원본 데이터:');
  console.log(`  📊 PM10: ${unjeongItem.pm10Value}μg/m³`);
  console.log(`  📊 PM2.5: ${unjeongItem.pm25Value}μg/m³`);
  console.log(`  🌐 웹사이트 비교 - PM10: 21μg/m³, PM2.5: 9μg/m³`);
  
  const pm10Diff = 21 - parseInt(unjeongItem.pm10Value || '0');
  const pm25Diff = 9 - parseInt(unjeongItem.pm25Value || '0');
  console.log(`  📈 차이분석 - PM10 차이: ${pm10Diff}, PM2.5 차이: ${pm25Diff}`);
}
```

### 3. UI에서 비교 정보 표시
- 운정 측정소 선택 시 웹사이트 값과 API 값 동시 표시
- 데이터 소스 및 업데이트 시간 명시
- 차이점 시각적 표시

## 📈 다음 단계

### 1. 실시간 모니터링
```bash
# 1분마다 데이터 확인
watch -n 60 'curl "http://localhost:3000/api/debug/airquality?stationName=운정"'
```

### 2. 다양한 API 엔드포인트 테스트
- 측정소별 직접 조회: `getMsrstnAcctoRltmMesureDnsty`
- 시도별 조회: `getCtprvnRltmMesureDnsty`
- 근접측정소 조회: `getNearbyMsrstnList`

### 3. 웹사이트 데이터 소스 분석
- 브라우저 개발자 도구로 웹사이트 API 호출 확인
- 웹사이트가 사용하는 실제 API 엔드포인트 파악
- 동일한 엔드포인트 사용 검토

## 🚨 즉시 확인 가능한 사항

1. **콘솔 로그 확인**: 대기질 페이지에서 운정 측정소 선택 시
2. **디버그 API 호출**: 현재 시점의 정확한 API 응답 확인
3. **시간별 추적**: 웹사이트와 API 데이터의 업데이트 주기 비교
4. **다른 측정소 비교**: 운정 외 다른 측정소에서도 차이 발생하는지 확인

이제 실제 데이터를 비교하여 정확한 원인을 파악할 수 있습니다! 🔍
