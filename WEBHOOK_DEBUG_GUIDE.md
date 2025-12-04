# 🔍 웹훅 디버그 및 사용자 프로필 동기화 가이드

## 📋 개요

카카오 회원가입 시 `user_profiles` 테이블에 사용자 정보가 저장되지 않는 문제를 해결하기 위한 종합적인 솔루션입니다.

## 🚀 구현된 기능

### 1. 웹훅 모니터링 대시보드
- **URL**: `/debug/webhook-monitor`
- **기능**: 
  - 실시간 웹훅 호출 로그 확인
  - 사용자 프로필 동기화 상태 모니터링
  - 웹훅 건강 상태 진단
  - 수동 프로필 동기화 실행
  - 테스트 웹훅 발송

### 2. 클라이언트 사이드 백업 동기화
- **자동 실행**: 사용자 로그인 시 프로필 존재 여부 확인 후 자동 생성
- **웹훅 실패 대비**: 웹훅이 실패하거나 지연될 경우의 백업 메커니즘

### 3. 디버그 API 엔드포인트
- `/api/debug/webhook-logs`: 웹훅 호출 로그 조회
- `/api/debug/user-profiles-status`: 사용자 프로필 동기화 상태
- `/api/debug/webhook-health`: 웹훅 시스템 건강 상태
- `/api/debug/sync-profiles`: 수동 프로필 동기화
- `/api/debug/test-webhook`: 테스트 웹훅 발송

## 🔧 해결 방법

### 방법 1: 웹훅 문제 해결 (권장)

1. **Clerk 대시보드 확인**:
   ```
   https://dashboard.clerk.com → Webhooks
   ```

2. **웹훅 엔드포인트 설정**:
   - **개발**: `http://localhost:3000/api/webhooks/clerk`
   - **운영**: `https://your-domain.com/api/webhooks/clerk`

3. **이벤트 활성화**:
   - ✅ `user.created` (필수)
   - ✅ `user.updated` (선택)

4. **환경변수 설정**:
   ```env
   CLERK_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### 방법 2: 클라이언트 사이드 동기화 (백업)

자동으로 실행되므로 별도 설정 불필요. 웹훅이 실패해도 사용자 로그인 시 자동으로 프로필이 생성됩니다.

### 방법 3: 수동 동기화

웹훅 모니터링 대시보드에서 "프로필 동기화" 버튼을 클릭하여 기존 사용자들의 프로필을 일괄 생성할 수 있습니다.

## 📊 모니터링 방법

### 1. 웹훅 모니터링 대시보드 접속
```
http://localhost:3000/debug/webhook-monitor
```

### 2. 확인 사항
- **웹훅 건강 상태**: 시크릿 설정, 엔드포인트 접근성, 성공률
- **최근 웹훅 로그**: 호출 시간, 상태, 처리 시간, 오류 메시지
- **사용자 프로필 상태**: 각 사용자별 프로필/역할 존재 여부

### 3. 문제 진단
- **웹훅이 호출되지 않음**: Clerk 대시보드 설정 확인
- **웹훅은 호출되지만 프로필 생성 실패**: 데이터베이스 연결 및 권한 확인
- **카카오 가입 감지 실패**: `external_accounts` 배열에서 카카오 정보 확인

## 🛠️ 문제 해결

### 웹훅 호출되지 않는 경우
1. Clerk 대시보드에서 웹훅 URL 확인
2. `user.created` 이벤트 활성화 확인
3. 네트워크 방화벽 설정 확인
4. 테스트 웹훅 발송으로 연결성 확인

### 프로필 생성 실패하는 경우
1. 데이터베이스 연결 상태 확인
2. `user_profiles` 테이블 존재 여부 확인
3. 웹훅 로그에서 구체적인 오류 메시지 확인
4. 수동 동기화로 문제 재현 및 해결

### 카카오 가입 감지 실패하는 경우
1. 웹훅 페이로드에서 `external_accounts` 배열 확인
2. `provider` 또는 `provider_slug` 값이 `oauth_kakao` 또는 `kakao`인지 확인
3. Clerk 카카오 OAuth 설정 재확인

## 🔍 로그 분석

### 성공적인 카카오 가입 로그 예시
```json
{
  "eventType": "user.created",
  "userId": "user_xxx",
  "email": "user@example.com",
  "signupMethod": "kakao",
  "status": "success",
  "processingTime": 150
}
```

### 실패한 가입 로그 예시
```json
{
  "eventType": "user.created",
  "userId": "user_xxx",
  "email": "user@example.com",
  "signupMethod": "kakao",
  "status": "error",
  "error": "데이터베이스 연결 실패",
  "processingTime": 50
}
```

## 📈 성능 모니터링

- **웹훅 응답 시간**: 일반적으로 100-500ms
- **성공률**: 95% 이상 권장
- **프로필 동기화율**: 100% 목표

## 🚨 알림 설정

개발 환경에서는 프로필 동기화 상태가 화면 우하단에 표시됩니다. 운영 환경에서는 자동으로 숨겨집니다.

## 📞 지원

문제가 지속되는 경우:
1. 웹훅 모니터링 대시보드에서 상세 로그 확인
2. 브라우저 개발자 도구에서 네트워크 탭 확인
3. 서버 로그에서 추가 오류 정보 확인
