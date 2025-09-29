# 날씨 안내 이메일 시스템 설정 가이드

매일 정해진 시간에 모든 사용자에게 날씨 안내 이메일을 자동으로 발송하는 시스템입니다.

## 🌟 주요 기능

### 1. 자동 스케줄 발송
- **아침 6시, 저녁 6시** 자동 발송
- **12시간 후까지의 시간별 날씨 정보** 포함
- **일별 날씨 정보** (5일 예보) 포함
- **AI 날씨 요약**: 사용자에게 꼭 필요한 기상 상황 요약

### 2. 계절별 맞춤 정보
- **여름(7-8월)**: 폭염 정보, 최고 온도 강조
- **겨울(12-2월)**: 한파 정보, 최저 온도 강조
- **장마철**: 강수 확률, 강수량 중점 분석
- **환절기**: 일교차, 적절한 의복 선택 조언

### 3. 실용적 조언
- 🌧️ **비/눈 예보**: 우산 준비, 출근 시간 조정 안내
- 💨 **강풍 예보**: 강풍 대비 안내
- 🌡️ **온도 변화**: 적절한 의복 선택 조언
- 🏠 **생활 팁**: 창문 개폐, 세탁물 건조 등

### 4. 관리자 기능
- **스케줄 관리**: 발송 시간 수정, 활성화/비활성화
- **수동 발송**: 즉시 발송, 테스트 발송
- **발송 현황**: 발송 통계, 성공/실패 현황
- **구독자 관리**: 구독자 목록, 수신 설정 관리

## 🔧 시스템 구성

### 데이터베이스 테이블
- `email_schedules`: 이메일 발송 스케줄 관리
- `email_send_logs`: 이메일 발송 로그
- `user_email_settings`: 사용자별 이메일 수신 설정
- `individual_email_logs`: 개별 이메일 발송 기록

### 핵심 서비스
- `WeatherAISummaryService`: AI 날씨 요약 생성
- `GmailService`: Gmail API를 통한 이메일 발송
- `EmailTemplateService`: 이메일 템플릿 생성
- `WeatherDataCollectorService`: 날씨 데이터 수집

### API 엔드포인트
- `GET /api/cron/email-scheduler`: 크론 작업 실행
- `POST /api/cron/email-scheduler`: 수동 크론 트리거 (개발용)

## 📧 Gmail API 설정

### 1. 환경변수 설정
`.env.local` 파일에 다음 변수들을 추가하세요:

```bash
# Gmail API 설정 (필수)
GMAIL_CLIENT_ID=your_gmail_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/auth/gmail/callback
GMAIL_FROM_EMAIL=your_email@gmail.com

# 클라이언트용 환경변수 (웹 인증용)
NEXT_PUBLIC_GMAIL_CLIENT_ID=your_gmail_client_id.apps.googleusercontent.com

# 인증 후 발급받는 토큰들 (웹 인터페이스에서 자동 생성)
GMAIL_REFRESH_TOKEN=1//04xxxxx-xxxxxxxxxxxxxxxxxxxx
GMAIL_ACCESS_TOKEN=ya29.xxxxxxxxxxxxxxxxxxxxxxx

# 크론 작업 보안
CRON_SECRET=your_secure_cron_secret_key
```

**중요**: 
- `GMAIL_REFRESH_TOKEN`과 `GMAIL_ACCESS_TOKEN`은 `/auth/gmail` 페이지에서 인증 후 자동으로 생성됩니다
- 콘솔에 출력된 토큰 값들을 복사해서 환경변수에 추가하세요

### 2. Gmail API 인증 설정

1. **Google Cloud Console**에서 프로젝트 생성
2. **Gmail API** 활성화
3. **OAuth 2.0 클라이언트 ID** 생성
4. **리디렉션 URI** 설정:
   - 개발환경: `http://localhost:3000/auth/gmail/callback`
   - 운영환경: `https://your-domain.vercel.app/auth/gmail/callback`
5. **OAuth 동의 화면** 설정
6. **웹 인터페이스에서 토큰 획득** (아래 참조)

### 3. OAuth 2.0 토큰 획득 방법

#### 방법 1: 웹 인터페이스 사용 (권장) ✨
```bash
1. 웹사이트에서 /auth/gmail 페이지 접속
2. "Gmail 인증하기" 버튼 클릭
3. Google 계정으로 로그인 및 권한 승인
4. 자동으로 토큰 발급 및 콘솔에 환경변수 출력
5. 출력된 환경변수를 .env.local 파일에 복사
6. 서버 재시작
```

#### 방법 2: Google OAuth 2.0 Playground 사용
```javascript
// 1. https://developers.google.com/oauthplayground 접속
// 2. Gmail API v1 스코프 선택: https://www.googleapis.com/auth/gmail.send
// 3. 인증 후 Refresh Token 획득
```

### 🔐 토큰 자동 갱신 시스템

**중요**: Access Token은 24시간마다 자동으로 만료되지만, **수동으로 갱신할 필요가 없습니다!**

- **Refresh Token**: 반영구적, 한 번만 발급받으면 됨
- **Access Token**: 24시간 유효, 자동으로 갱신됨
- **googleapis 라이브러리**: 토큰 만료 시 자동으로 새 토큰 발급

따라서 **Refresh Token만 .env.local에 설정하면 모든 것이 자동으로 처리됩니다!**

## ⏰ 크론 작업 설정

### Vercel Cron Jobs
`vercel.json` 파일 설정:

```json
{
  "crons": [
    {
      "path": "/api/cron/email-scheduler",
      "schedule": "0 6,18 * * *"
    }
  ]
}
```

### 크론 스케줄 설명
- `0 6,18 * * *`: 매일 06:00, 18:00 (한국시간 기준)
- `0 6 * * *`: 매일 06:00만
- `0 18 * * *`: 매일 18:00만

### 외부 크론 서비스 사용 시
```bash
# cURL 예시
curl -X GET "https://your-domain.com/api/cron/email-scheduler" \
  -H "Authorization: Bearer your_cron_secret_key"
```

## 🎯 사용 방법

### 1. Gmail 인증 설정 (최우선)
```bash
1. http://localhost:3000/auth/gmail 접속
2. "Gmail 인증하기" 버튼 클릭
3. Google 계정 로그인 및 권한 승인
4. 콘솔에 출력된 토큰을 .env.local에 복사
5. 서버 재시작 (npm run dev)
6. /admin/email-management에서 인증 상태 확인
```

### 2. 기본 스케줄 생성
```typescript
// 아침 6시 날씨 안내
await createEmailSchedule({
  title: "아침 날씨 안내",
  emailSubject: "[날씨 안내] 아침 날씨 정보 - {{date}}",
  scheduleTime: "06:00",
  emailTemplate: "weather_summary",
  targetType: "all_users",
  isActive: true,
});

// 저녁 6시 날씨 안내
await createEmailSchedule({
  title: "저녁 날씨 안내",
  emailSubject: "[날씨 안내] 저녁 날씨 정보 - {{date}}",
  scheduleTime: "18:00",
  emailTemplate: "weather_summary",
  targetType: "all_users",
  isActive: true,
});
```

### 2. 수동 이메일 발송
```typescript
await sendManualEmail({
  subject: "[날씨 안내] 긴급 날씨 정보",
  location: "서울",
  timeOfDay: "morning",
  targetType: "all_users",
  forceRefreshWeather: true,
});
```

### 3. 테스트 발송
```typescript
await sendManualEmail({
  subject: "[테스트] 날씨 안내 이메일",
  location: "서울",
  timeOfDay: "morning",
  targetType: "test",
  testEmail: "test@example.com",
});
```

## 📊 관리자 페이지

### 접속 방법
1. 웹사이트 로그인
2. 상단 메뉴 → **이메일 관리** 클릭
3. 또는 직접 접속: `/admin/email-management`

### 주요 기능
- **스케줄 관리**: 새 스케줄 생성, 기존 스케줄 수정/삭제
- **수동 발송**: 즉시 이메일 발송, 테스트 발송
- **구독자 관리**: 구독자 목록, 수신 설정 현황
- **발송 이력**: 과거 발송 결과, 성공/실패 통계

## 🛡️ 보안 고려사항

### 1. 크론 작업 보안
- `CRON_SECRET` 환경변수로 인증
- Production 환경에서 수동 트리거 비활성화

### 2. 사용자 데이터 보호
- 구독 해지 기능 제공
- 개인정보 처리 최소화
- GDPR 준수

### 3. API 할당량 관리
- Gmail API 일일 할당량 모니터링
- 배치 크기 제한 (한 번에 10개씩 발송)
- 발송 간 지연 시간 설정

## 📈 모니터링 및 로깅

### 1. 발송 통계
- 총 발송 수
- 성공/실패 비율
- 실행 시간
- 에러 로그

### 2. 사용자 통계
- 총 구독자 수
- 수신 설정별 통계
- 구독 해지 비율

### 3. 시스템 성능
- API 응답 시간
- 데이터베이스 쿼리 성능
- 메모리 사용량

## 🔧 문제 해결

### 1. 이메일 발송 실패
```bash
# Gmail API 연결 테스트
curl -X POST "http://localhost:3000/api/test/gmail" \
  -H "Content-Type: application/json"
```

### 2. 크론 작업 확인
```bash
# 수동 크론 실행 (개발 환경)
curl -X POST "http://localhost:3000/api/cron/email-scheduler" \
  -H "Content-Type: application/json" \
  -d '{"forceExecution": true}'
```

### 3. 로그 확인
- Vercel Dashboard → Functions → Logs
- 또는 `console.log` 출력 확인

## 📋 체크리스트

### 초기 설정
- [ ] Gmail API 인증 설정 완료
- [ ] 환경변수 설정 완료
- [ ] 데이터베이스 마이그레이션 실행
- [ ] 크론 작업 설정 완료

### 테스트
- [ ] 테스트 이메일 발송 성공
- [ ] 크론 작업 수동 실행 성공
- [ ] 관리자 페이지 접속 가능
- [ ] 스케줄 생성/수정/삭제 가능

### 운영
- [ ] 일일 발송 로그 모니터링
- [ ] 에러 알림 설정
- [ ] 사용자 피드백 수집
- [ ] API 할당량 모니터링

## 🆘 지원

문제가 발생하거나 추가 기능이 필요한 경우:
1. GitHub Issues에 문제 보고
2. 로그 파일 첨부
3. 재현 단계 상세 기술
4. 기대 결과와 실제 결과 비교

---

**설정 완료 후 첫 번째 이메일 발송까지 약 24시간이 소요될 수 있습니다.**

