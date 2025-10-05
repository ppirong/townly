# 날씨 안내 이메일 작성 에이전트 통합 가이드

## 개요

날씨 안내 이메일 작성 에이전트가 **이메일 관리 페이지**에 완전히 통합되었습니다. 이제 "이메일 관리" 페이지에서 에이전트를 사용하여 고품질의 날씨 안내 이메일을 자동으로 생성하고 발송할 수 있습니다.

## 주요 변경사항

### 1. 이메일 생성 방식 선택 가능

이메일 관리 페이지에서 두 가지 방식 중 하나를 선택할 수 있습니다:

#### A. 에이전트 방식 (기본값, 권장)
- **Claude Sonnet 3.5**: 날씨 안내 이메일 작성
- **Claude Sonnet 4.5**: 작성된 내용 검토 및 개선 지시
- 최대 5회 순환하여 고품질 이메일 생성
- 강우/적설 확률 70% 이상인 시간 모두 제공
- 사용자별 데이터베이스 저장 날씨 정보 활용

#### B. 기존 템플릿 방식
- 템플릿 기반 이메일 생성
- 빠른 처리 속도
- 기존 기능 유지

### 2. 데이터 소스

두 방식 모두 **데이터베이스에 저장된 사용자별 시간별 날씨 정보**를 사용합니다:

- `hourlyWeatherData` 테이블: 사용자별 시간별 날씨 데이터
- `dailyWeatherData` 테이블: 사용자별 일별 날씨 데이터
- `userLocations` 테이블: 사용자별 위치 정보 (주소)

## 사용 방법

### 1. 이메일 관리 페이지 접속

```
http://localhost:3000/admin/email-management
```

### 2. "수동 발송" 탭 선택

### 3. 에이전트 옵션 설정

화면에 보이는 **"🤖 AI 에이전트 사용 (Claude 3.5 + 4.5)"** 스위치를 확인하세요:

- **ON (기본값)**: 에이전트가 이메일 작성 및 검토
- **OFF**: 기존 템플릿 방식으로 이메일 생성

### 4. 발송 설정

1. **이메일 제목** 입력
2. **지역** 선택 (서울, 부산 등)
3. **시간대** 선택:
   - 아침 (6시 기준): 6시~18시 날씨 안내
   - 저녁 (18시 기준): 18시~다음날 6시 날씨 안내
4. **발송 대상** 선택:
   - 모든 사용자
   - 활성 사용자
   - 테스트 발송 (본인에게만)

### 5. 발송 실행

"이메일 발송" 버튼을 클릭하면:

#### 에이전트 사용 시:
1. 각 사용자별 날씨 데이터 준비
2. Claude Sonnet 3.5가 이메일 작성
3. Claude Sonnet 4.5가 내용 검토
4. 점수가 80점 미만이면 재작성 (최대 5회)
5. 최종 이메일 발송

**예상 소요 시간**: 사용자당 약 45-90초

#### 기존 템플릿 사용 시:
1. 각 사용자별 날씨 데이터 준비
2. 템플릿 기반으로 이메일 생성
3. 즉시 발송

**예상 소요 시간**: 사용자당 약 5-10초

## 발송 결과 확인

### 에이전트 사용 시 결과

```
이메일이 발송되었습니다. (성공: 5, 실패: 0) - 평균 점수: 92.5/100
```

- **성공 수**: 성공적으로 발송된 이메일 수
- **실패 수**: 발송 실패한 이메일 수
- **평균 점수**: 에이전트가 부여한 품질 점수의 평균 (0-100)

### 기존 템플릿 사용 시 결과

```
이메일이 발송되었습니다. (성공: 5, 실패: 0)
```

## 주요 기능

### 1. 사용자별 개인화

에이전트는 각 사용자마다 다음 정보를 개인화합니다:

- **사용자 주소**: `userLocations` 테이블의 `address` 필드
- **날씨 데이터**: 사용자별로 저장된 시간별/일별 날씨 정보
- **발송 시간**: 아침(6시) 또는 저녁(18시)에 맞는 시간 범위

### 2. 에이전트 품질 평가

Claude Sonnet 4.5는 다음 기준으로 평가합니다:

- ✅ 강우 확률 70% 이상인 시간을 모두 제공했는지
- ✅ 적설 확률 70% 이상인 시간을 모두 제공했는지 (겨울철 필수)
- ✅ 모든 시간이 KST 기준인지
- ✅ 적절한 주의사항이 포함되었는지
- ✅ 가독성이 좋은지
- ✅ 필수 항목이 모두 포함되었는지

### 3. 자동 폴백

사용자별 날씨 데이터가 없거나 에이전트 처리 실패 시:
- 자동으로 기본 메시지로 폴백
- 사용자는 여전히 이메일을 받음
- 오류 로그 기록

## 크론 작업 설정 (자동 발송)

### 현재 상태

크론 작업은 **기존 템플릿 방식**을 사용합니다 (빠른 처리를 위해):

```typescript
useAgent: false, // 크론잡에서는 기존 템플릿 방식 사용
```

### 에이전트 방식으로 변경하기

크론 작업에서도 에이전트를 사용하려면 `src/actions/email-schedules.ts`의 `executeScheduledEmail` 함수를 수정하세요:

```typescript
// 수정 전
useAgent: false,

// 수정 후
useAgent: true,
```

**주의**: 에이전트 방식은 처리 시간이 더 오래 걸리므로 크론 작업 타임아웃을 고려하세요.

## 데이터베이스 요구사항

에이전트가 정상 작동하려면 다음 테이블에 데이터가 있어야 합니다:

### 1. hourlyWeatherData
```sql
SELECT * FROM hourly_weather_data 
WHERE clerk_user_id = 'user_xxx' 
AND forecast_date = '2025-10-05';
```

필수 필드:
- `clerkUserId`: 사용자 ID
- `forecastDateTime`: 예보 시간 (KST)
- `forecastHour`: 예보 시간 (0-23)
- `temperature`: 온도
- `conditions`: 날씨 상태
- `rainProbability`: 강우 확률
- `precipitation`: 강수량

### 2. userLocations
```sql
SELECT * FROM user_locations 
WHERE clerk_user_id = 'user_xxx';
```

필수 필드:
- `clerkUserId`: 사용자 ID
- `address`: 사용자 주소 (예: "파주시 한빛로 11")

### 3. userEmailSettings
```sql
SELECT * FROM user_email_settings 
WHERE clerk_user_id = 'user_xxx' 
AND is_subscribed = true 
AND receive_weather_emails = true;
```

필수 필드:
- `email`: 이메일 주소
- `isSubscribed`: 구독 상태
- `receiveWeatherEmails`: 날씨 이메일 수신 여부

## 비용 및 성능

### 에이전트 방식

| 항목 | 값 |
|------|------|
| 평균 실행 시간 | 45-90초/사용자 |
| 평균 토큰 사용량 | 10,000-15,000 토큰/사용자 |
| 평균 순환 횟수 | 3회 |
| 권장 사용 시나리오 | 소수 사용자 대상, 고품질 필요 시 |

### 기존 템플릿 방식

| 항목 | 값 |
|------|------|
| 평균 실행 시간 | 5-10초/사용자 |
| 평균 토큰 사용량 | 500-1,000 토큰/사용자 |
| 권장 사용 시나리오 | 대량 발송, 빠른 처리 필요 시 |

## 트러블슈팅

### 문제: "날씨 데이터를 준비할 수 없습니다"

**원인**: 사용자의 날씨 데이터가 데이터베이스에 없음

**해결**:
1. `hourlyWeatherData` 테이블에 해당 사용자의 데이터 확인
2. AccuWeather API를 통해 최신 날씨 데이터 수집
3. 사용자 위치 정보가 `userLocations` 테이블에 있는지 확인

### 문제: 에이전트 처리가 너무 느림

**원인**: 여러 사용자를 동시에 처리하면 각 사용자마다 45-90초 소요

**해결**:
1. 테스트 발송으로 먼저 확인
2. 소수 사용자 대상으로 먼저 사용
3. 대량 발송은 기존 템플릿 방식 사용 고려

### 문제: "ANTHROPIC_API_KEY is not configured"

**원인**: Anthropic API 키가 설정되지 않음

**해결**:
1. `.env.local` 파일에 `ANTHROPIC_API_KEY` 추가
2. 서버 재시작

## API 엔드포인트

### POST /api/weather-email-agent

특정 사용자의 날씨 안내 이메일 생성 (에이전트 전용 테스트용):

```bash
curl -X POST http://localhost:3000/api/weather-email-agent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_xxx",
    "sendTime": 6
  }'
```

### POST /api/weather-email-agent/test

테스트용 샘플 이메일 생성:

```bash
curl -X POST http://localhost:3000/api/weather-email-agent/test \
  -H "Content-Type: application/json" \
  -d '{
    "sendTime": 18
  }'
```

## 코드 구조

```
src/
├── actions/
│   └── email-schedules.ts           # Server Actions
│       ├── sendManualEmail()         # 기존 템플릿 방식
│       └── sendManualEmailWithAgent() # 에이전트 방식 (NEW)
├── components/
│   └── email/
│       ├── EmailManagementDashboard.tsx # 메인 대시보드
│       └── ManualEmailSender.tsx        # 수동 발송 폼 (에이전트 옵션 추가)
├── lib/
│   ├── schemas/
│   │   └── email.ts                  # 스키마 (useAgent 추가)
│   └── services/
│       ├── weather-email-agent.ts    # 에이전트 오케스트레이터
│       ├── weather-email-writer.ts   # Claude 3.5 작성자
│       ├── weather-email-reviewer.ts # Claude 4.5 검토자
│       └── weather-email-data-preparer.ts # 날씨 데이터 준비
```

## 다음 단계

1. **테스트 발송**: 먼저 테스트 발송으로 에이전트 동작 확인
2. **소수 사용자**: 3-5명 정도에게 먼저 발송해보기
3. **결과 확인**: 발송 이력에서 평균 점수 및 실행 시간 확인
4. **전체 발송**: 문제 없으면 전체 사용자에게 발송

## 참고 문서

- [날씨 안내 이메일 작성 에이전트 가이드](./WEATHER_EMAIL_AGENT_GUIDE.md)
- [이메일 시스템 설정](./EMAIL_SYSTEM_SETUP.md)
- [환경 설정](./ENVIRONMENT_SETUP.md)
