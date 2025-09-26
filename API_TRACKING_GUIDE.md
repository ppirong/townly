# AccuWeather API 호출 추적 시스템

이 문서는 AccuWeather API 호출을 추적하고 관리하는 시스템에 대한 가이드입니다.

## 🔧 구현된 기능

### 1. API 호출 기록
- **자동 기록**: 모든 AccuWeather API 호출이 자동으로 데이터베이스에 기록됩니다
- **상세 정보**: 호출 시간, 응답 시간, 성공/실패 여부, 엔드포인트 등을 추적
- **실시간 통계**: 호출과 동시에 일일 통계가 업데이트됩니다

### 2. 일일 한도 관리
- **한도 추적**: 무료 플랜 500회 한도에 대한 실시간 사용량 추적
- **상태 알림**: 사용량에 따른 상태 표시 (정상/주의/위험)
- **권장사항**: 캐시 최적화, 플랜 업그레이드 등의 자동 추천

### 3. 통계 대시보드
- **실시간 현황**: 오늘의 사용량, 남은 호출 수, 성공률 등
- **시각적 표시**: 진행바와 배지를 통한 직관적인 상태 표시
- **트렌드 분석**: 최근 7일간의 사용 패턴 분석

### 4. 자동 초기화
- **매일 자정**: Vercel Cron을 통한 자동 통계 초기화
- **KST 시간대**: 한국 시간 기준으로 정확한 일일 리셋

## 📊 데이터베이스 스키마

### `api_call_logs` 테이블
```sql
- id: UUID (Primary Key)
- api_provider: 'accuweather' | 'airkorea' | 'openai' | 'kakao'
- api_endpoint: 호출된 API 엔드포인트
- http_method: HTTP 메서드 (GET, POST 등)
- call_date: 호출 날짜 (YYYY-MM-DD)
- call_time: 정확한 호출 시간
- http_status: HTTP 응답 상태코드
- response_time: 응답 시간 (milliseconds)
- is_successful: 성공 여부
- user_id: 사용자 ID (선택사항)
- request_params: 요청 파라미터 (JSON)
- error_message: 에러 메시지 (실패 시)
- user_agent: User-Agent
- ip_address: IP 주소 (익명화)
- created_at: 생성 시간
```

### `daily_api_stats` 테이블
```sql
- id: UUID (Primary Key)
- stat_date: 통계 날짜 (YYYY-MM-DD)
- api_provider: API 제공자
- total_calls: 총 호출 수
- successful_calls: 성공한 호출 수
- failed_calls: 실패한 호출 수
- avg_response_time: 평균 응답 시간
- max_response_time: 최대 응답 시간
- min_response_time: 최소 응답 시간
- endpoint_stats: 엔드포인트별 통계 (JSON)
- hourly_stats: 시간대별 통계 (JSON)
- last_updated: 마지막 업데이트 시간
- is_finalized: 확정 여부 (하루 종료 후)
- created_at: 생성 시간
- updated_at: 업데이트 시간
```

## 🛠️ API 엔드포인트

### 날씨 API 통계 조회
```
GET /api/weather/stats
GET /api/weather/stats?days=7
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "today": {
      "date": "2025-09-25",
      "totalCalls": 14,
      "successfulCalls": 14,
      "failedCalls": 0,
      "successRate": 100,
      "avgResponseTime": 388
    },
    "limit": {
      "current": 14,
      "limit": 500,
      "remaining": 486,
      "percentage": 3,
      "canMakeRequest": true,
      "status": "ok"
    },
    "recent": {
      "days": 7,
      "totalCalls": 14,
      "averageDaily": 2
    },
    "recommendations": {
      "shouldOptimizeCache": false,
      "shouldUpgradePlan": false
    }
  }
}
```

### 일일 통계 초기화 (크론 작업)
```
GET /api/cron/api-stats-reset
POST /api/cron/api-stats-reset
```

### 디버그 API
```
GET /api/debug/api-stats
GET /api/debug/api-stats?type=logs
GET /api/debug/api-stats?type=today
GET /api/debug/api-stats?type=recent&days=7
```

## 🔄 자동화된 워크플로

### 1. API 호출 시
1. AccuWeather API 호출
2. 응답 시간 측정
3. 호출 정보를 `api_call_logs`에 기록
4. `daily_api_stats` 테이블 자동 업데이트

### 2. 매일 자정 (KST)
1. Vercel Cron이 `/api/cron/api-stats-reset` 호출
2. 전날 통계를 확정 상태로 변경
3. 새로운 날의 통계 시작

### 3. 사용자 대시보드 접근 시
1. 실시간 통계 조회
2. 한도 상태 확인
3. 권장사항 생성
4. UI에 시각적으로 표시

## 📈 사용량 상태 분류

### 정상 (OK)
- 사용률 0-69%
- 상태: 초록색
- 메시지: "✅ 정상"

### 주의 (Warning)
- 사용률 70-89%
- 상태: 노란색
- 메시지: "⚡ 주의 필요"
- 권장사항: 캐시 최적화

### 위험 (Critical)
- 사용률 90-100%
- 상태: 빨간색
- 메시지: "⚠️ 한도 임박"
- 권장사항: 플랜 업그레이드

## 🔧 환경 설정

### 필수 환경변수
```bash
# .env.local
ACCUWEATHER_API_KEY=your_api_key_here
CRON_SECRET=your_cron_secret_here  # 운영 환경 필요
```

### Vercel Cron 설정
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/api-stats-reset",
      "schedule": "0 15 * * *"  // 매일 자정 KST (UTC+9)
    }
  ]
}
```

## 🚀 최적화 권장사항

### 1. 캐시 활용
- 위치 키: 24시간 캐시
- 시간별 날씨: 10분 캐시
- 일별 날씨: 30분 캐시

### 2. Rate Limiting
- 분당: 25회
- 시간당: 150회
- 일일: 450회 (여유분 50회)

### 3. 모니터링
- 사용률 80% 초과 시 알림
- 응답 시간 2초 초과 시 알림
- 실패율 5% 초과 시 알림

## 🔍 문제 해결

### 높은 사용량 시
1. 캐시 TTL 증가
2. 불필요한 호출 제거
3. 배치 처리 고려
4. 플랜 업그레이드 검토

### 응답 시간 증가 시
1. 네트워크 상태 확인
2. AccuWeather 서비스 상태 확인
3. 타임아웃 설정 조정

### 크론 작업 실패 시
1. Vercel 로그 확인
2. 환경변수 설정 확인
3. 수동 초기화 실행

## 📱 사용자 인터페이스

날씨 페이지에서 다음 정보를 확인할 수 있습니다:

1. **오늘 사용량**: 현재까지 사용한 API 호출 수
2. **남은 횟수**: 남은 일일 호출 한도
3. **성공률**: API 호출 성공률
4. **평균 응답시간**: API 응답 속도
5. **사용률 진행바**: 시각적 사용량 표시
6. **상태 배지**: 현재 상태와 권장사항
7. **최근 7일 트렌드**: 사용 패턴 분석

이 시스템을 통해 AccuWeather API 사용량을 효율적으로 관리하고 최적화할 수 있습니다.
