# 📧 이메일 발송 스케줄 설정 가이드

이 문서는 한국시간 기준으로 이메일 발송 스케줄을 설정하는 방법을 설명합니다.

## 🕐 설정된 발송 시간

### 한국시간 (KST) 기준
- **오전 06:00** - ☀️ 좋은 아침! 오늘의 날씨
- **오후 18:00** - 🌤️ 오늘 저녁 날씨 안내  
- **오후 19:00** - 🌤️ 오늘 저녁 날씨 안내
- **오후 23:00** - 🌙 내일 날씨 미리보기
- **새벽 01:00** - 🌃 새벽 날씨 안내

### UTC 변환 (Vercel 크론잡용)
- **KST 06:00** → **UTC 21:00** (전날)
- **KST 18:00** → **UTC 09:00**
- **KST 19:00** → **UTC 10:00**
- **KST 23:00** → **UTC 14:00**
- **KST 01:00** → **UTC 16:00** (전날)

## ⚙️ 크론잡 설정

### Vercel 크론잡 (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/email-scheduler",
      "schedule": "0 9,10,14,16,21 * * *"
    }
  ]
}
```

### 크론 표현식 설명
- `0 9,10,14,16,21 * * *`: 매일 UTC 09:00, 10:00, 14:00, 16:00, 21:00에 실행
- 이는 한국시간으로 18:00, 19:00, 23:00, 01:00, 06:00에 해당

## 🗄️ 데이터베이스 스케줄 생성

### 1. API를 통한 생성
```bash
# POST 요청으로 스케줄 생성
curl -X POST http://localhost:3000/api/admin/create-email-schedules \
  -H "Content-Type: application/json"
```

### 2. 스크립트를 통한 생성
```bash
# 이메일 스케줄 생성 스크립트 실행
npm run email:create-schedules

# 테스트 스크립트 실행
npm run email:test-schedules
```

### 3. 생성되는 스케줄 정보
각 시간대별로 다음 정보가 데이터베이스에 저장됩니다:

```typescript
{
  title: '아침 날씨 안내 (06:00)',
  description: '아침 6시 오늘 날씨 안내 이메일',
  emailSubject: '☀️ 좋은 아침! 오늘의 날씨',
  emailTemplate: 'weather_summary',
  scheduleTime: '06:00',
  timezone: 'Asia/Seoul',
  targetType: 'all_users',
  isActive: true,
  nextSendAt: '계산된 다음 발송 시간 (UTC)',
}
```

## 📊 모니터링 및 관리

### 스케줄 상태 확인
```bash
# 현재 스케줄 조회
curl -X GET http://localhost:3000/api/admin/create-email-schedules
```

### 크론잡 실행 로그 확인
- **Vercel 대시보드**: Functions → Cron Jobs 섹션
- **서버 로그**: 콘솔에서 실시간 확인
- **데이터베이스**: `email_send_logs` 테이블에서 발송 이력 확인

### 주요 테이블
1. **`email_schedules`**: 이메일 발송 스케줄 정보
2. **`email_send_logs`**: 이메일 발송 로그
3. **`individual_email_logs`**: 개별 사용자 발송 상세 로그

## 🔧 설정 변경

### 발송 시간 변경
1. `vercel.json`에서 크론 스케줄 수정
2. 데이터베이스의 `email_schedules` 테이블에서 `schedule_time` 수정
3. `next_send_at` 필드 재계산

### 스케줄 활성화/비활성화
```sql
-- 특정 시간대 스케줄 비활성화
UPDATE email_schedules 
SET is_active = false 
WHERE schedule_time = '01:00';

-- 모든 스케줄 활성화
UPDATE email_schedules 
SET is_active = true;
```

## ⚠️ 주의사항

### 시간대 처리
- **데이터베이스**: `schedule_time`은 한국시간(KST) 기준으로 저장
- **크론잡**: UTC 기준으로 실행
- **변환**: 시스템에서 자동으로 KST → UTC 변환 처리

### 중복 실행 방지
- 크론잡은 동일한 스케줄에 대해 중복 실행을 방지
- `next_send_at` 필드를 통해 다음 발송 시간 관리

### 환경변수 필요
- `CRON_SECRET`: 크론잡 인증용 시크릿 키
- `GMAIL_*`: Gmail API 관련 환경변수들

## 🚀 배포 후 확인사항

1. **Vercel 크론잡 등록 확인**
   - Vercel 대시보드에서 크론잡이 정상 등록되었는지 확인

2. **데이터베이스 스케줄 생성**
   - API를 통해 이메일 스케줄 생성

3. **첫 실행 테스트**
   - 수동으로 크론잡 API 호출하여 정상 작동 확인

4. **로그 모니터링**
   - 실제 발송 시간에 로그 확인

## 📞 문제 해결

### 크론잡이 실행되지 않는 경우
1. `CRON_SECRET` 환경변수 확인
2. Vercel 크론잡 설정 확인
3. API 엔드포인트 경로 확인

### 이메일이 발송되지 않는 경우
1. Gmail API 인증 상태 확인
2. 사용자 이메일 설정 확인
3. 이메일 템플릿 확인

### 시간대 문제
1. 서버 시간대 설정 확인
2. 데이터베이스 시간대 설정 확인
3. 크론 표현식 UTC 변환 확인
