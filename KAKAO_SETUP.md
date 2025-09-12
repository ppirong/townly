# 카카오 채널 관리자 페이지 설정 가이드

## 개요

카카오 채널 "Towny"로 수신되는 메시지를 실시간으로 모니터링하고 관리할 수 있는 관리자 페이지가 구현되었습니다.

## 주요 기능

### 📱 실시간 메시지 모니터링
- 카카오 채널로 수신된 모든 메시지를 실시간으로 확인
- 메시지 내용, 발신자, 수신 시간 표시
- 읽음/읽지 않음 상태 관리

### 🔍 메시지 필터링 및 검색
- 읽음 상태별 필터링 (전체/읽지 않음/읽음)
- 사용자 키로 특정 사용자 메시지 검색
- 메시지 통계 (전체/읽지 않음/읽음 수 표시)

### ⚡ 실시간 업데이트
- 30초마다 자동 새로고침
- 수동 새로고침 기능
- 읽음 처리 즉시 반영

### 🛠️ 관리 기능
- 개별 메시지 읽음 처리
- 모든 메시지 일괄 읽음 처리
- 페이지네이션 (더 불러오기)

## 접속 방법

1. **로그인**: Clerk 인증을 통해 로그인
2. **대시보드 접속**: `/dashboard` 페이지
3. **관리자 페이지**: 대시보드에서 "카카오 채널 관리자" 카드의 "관리자 페이지 →" 버튼 클릭
4. **직접 접속**: `/admin/kakao` URL로 직접 접속

## 필요한 환경변수

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경변수를 설정하세요:

```env
# Clerk 인증 설정
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Clerk 리다이렉트 URL
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# 데이터베이스 연결 (PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database_name
```

## 데이터베이스 마이그레이션

```bash
# Drizzle 설치 (이미 완료됨)
npm install drizzle-orm @neondatabase/serverless drizzle-kit

# 마이그레이션 파일 생성
npx drizzle-kit generate

# 마이그레이션 실행
npx drizzle-kit push
```

## 카카오 채널 설정 정보

### 채널 정보
- **채널명**: Towny
- **채널 주소**: https://pf.kakao.com/_wcyDn
- **챗봇 ID**: 68bef0501c4ef66e4f5d73be

### 웹훅 설정
- **웹훅 URL**: `https://your-domain.com/api/kakao/webhook`
- **현재 ngrok URL**: https://67edd5fab9ad.ngrok-free.app/api/kakao/webhook

## 개발/테스트 방법

### 1. 로컬 서버 실행
```bash
npm run dev
```

### 2. ngrok으로 터널링 (개발용)
```bash
# ngrok 설치 후
ngrok http 3000
```

### 3. 카카오 챗봇 스킬에 웹훅 URL 등록
- 카카오 i 오픈빌더에서 스킬 URL을 ngrok 또는 배포된 도메인으로 설정

### 4. 테스트 메시지 전송
- 카카오톡에서 "Towny" 채널로 메시지 전송
- 관리자 페이지에서 메시지 수신 확인

## 데이터베이스 스키마

### kakao_messages 테이블
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | 메시지 고유 ID |
| user_key | TEXT | 카카오 사용자 식별키 |
| message | TEXT | 메시지 내용 |
| message_type | TEXT | 메시지 타입 (text, image 등) |
| channel_id | TEXT | 카카오 챗봇 ID |
| received_at | TIMESTAMP | 메시지 수신 시간 |
| raw_data | JSONB | 카카오에서 받은 원본 데이터 |
| is_read | BOOLEAN | 관리자 읽음 여부 |
| created_at | TIMESTAMP | 레코드 생성 시간 |
| updated_at | TIMESTAMP | 레코드 수정 시간 |

## 보안 주의사항

1. **인증 확인**: 모든 관리자 기능은 Clerk 인증이 필요합니다
2. **환경변수 보안**: `.env.local` 파일은 절대 버전 관리에 포함하지 마세요
3. **데이터베이스 접근**: 데이터베이스 URL에는 강력한 패스워드를 사용하세요
4. **웹훅 보안**: 실제 서비스에서는 웹훅 검증 로직을 추가하는 것을 권장합니다

## 문제 해결

### 메시지가 저장되지 않는 경우
1. 데이터베이스 연결 확인
2. 웹훅 URL이 올바르게 설정되었는지 확인
3. 서버 로그에서 오류 메시지 확인

### 관리자 페이지에 접속할 수 없는 경우
1. Clerk 인증 설정 확인
2. 로그인 상태 확인
3. 환경변수 설정 확인

### 실시간 업데이트가 작동하지 않는 경우
1. 브라우저 콘솔에서 JavaScript 오류 확인
2. 네트워크 연결 상태 확인
3. 페이지 새로고침 시도

## 추가 개발 가능한 기능

1. **메시지 검색**: 메시지 내용으로 검색
2. **통계 대시보드**: 일별/월별 메시지 통계
3. **자동 응답**: AI 기반 자동 응답 시스템
4. **알림 시스템**: 새 메시지 알림 (이메일, 푸시 등)
5. **사용자 관리**: 사용자 프로필 및 히스토리 관리
6. **메시지 분류**: 문의 유형별 자동 분류
7. **응답 템플릿**: 자주 사용하는 응답 템플릿 관리

## 지원

추가 기능이나 문제가 있으시면 개발팀에 문의해주세요.
