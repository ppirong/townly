# Clerk 웹훅 설정 가이드

## 🔍 현재 웹훅 시크릿 검증 결과

**현재 `.env.local`에 설정된 값**: `whsec_LBzpdRqXgu4cFWz0oYGN0GiSTd2bRJ3N`

✅ **형식 검증**: 올바른 형식 (`whsec_`로 시작, 38자)
✅ **Svix 호환성**: 웹훅 라이브러리에서 정상 인식
⚠️ **실제 유효성**: Clerk 대시보드에서 확인 필요

## 📚 Clerk 대시보드에서 웹훅 시크릿 확인 방법

### 1단계: Clerk 대시보드 접속
```
🌐 https://dashboard.clerk.com
```

### 2단계: 프로젝트 선택
- 로그인 후 해당 프로젝트 선택
- 프로젝트명 확인 (townly 관련)

### 3단계: 웹훅 설정 페이지 이동
```
좌측 메뉴 → "Webhooks" 클릭
```

### 4단계: 웹훅 엔드포인트 확인/생성

#### 기존 웹훅이 있는 경우:
1. 기존 웹훅 엔드포인트 클릭
2. "Signing Secret" 섹션 찾기
3. "Reveal" 또는 "Show" 버튼 클릭
4. 전체 시크릿 복사

#### 새 웹훅 생성이 필요한 경우:
1. "Add Endpoint" 또는 "+ Create" 버튼 클릭
2. 엔드포인트 URL 입력:
   - **로컬 개발**: `http://localhost:3000/api/webhooks/clerk` (또는 ngrok URL)
   - **프로덕션**: `https://towny-kr.vercel.app/api/webhooks/clerk`
3. 이벤트 선택:
   - ✅ `user.created` (필수)
   - ✅ `user.updated` (선택사항)
   - ✅ `user.deleted` (선택사항)

### 5단계: 시크릿 키 복사 및 적용
1. "Signing Secret" 값 전체 복사
2. `.env.local` 파일 업데이트:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_새로운시크릿값
   ```

## 🚨 일반적인 문제점들

### 1. 웹훅이 설정되지 않음
- **증상**: 사용자 생성 시 데이터베이스에 추가되지 않음
- **해결**: 위 가이드대로 웹훅 새로 생성

### 2. 잘못된 엔드포인트 URL
- **증상**: 웹훅 호출되지 않음
- **확인사항**:
  - 로컬: `http://localhost:3000/api/webhooks/clerk`
  - 프로덕션: 올바른 도메인 사용

### 3. 시크릿 키 불일치
- **증상**: "Invalid webhook signature" 오류
- **해결**: 대시보드에서 최신 시크릿 복사

### 4. 이벤트 미선택
- **증상**: 특정 이벤트에서만 웹훅 미작동
- **해결**: `user.created` 이벤트 활성화 확인

## 🔧 환경별 설정

### 프로덕션 환경
- **웹훅 URL**: `https://towny-kr.vercel.app/api/webhooks/clerk`
- **상태**: ✅ 엔드포인트 접근 가능
- **이슈**: 환경변수 `CLERK_WEBHOOK_SECRET` 설정 필요

### 로컬 개발 환경 (ngrok 권장)
```bash
# ngrok 설치
npm install -g ngrok

# 터널 생성
ngrok http 3000

# 출력된 HTTPS URL을 Clerk 웹훅 엔드포인트로 설정
# 예: https://abc123.ngrok.io/api/webhooks/clerk
```

### 환경변수 확인
```bash
# .env.local 파일 확인
cat .env.local | grep CLERK_WEBHOOK_SECRET

# 서버 재시작 필요
npm run dev
```

## ✅ 검증 방법

### 1. 웹훅 로그 확인
```bash
# 서버 콘솔에서 다음 로그 확인:
🔔 Clerk 웹훅 호출됨 - 시작
✅ 웹훅 시크릿 확인됨
📋 웹훅 페이로드: { eventType: 'user.created', userId: '...' }
✅ Clerk 웹훅 처리 완료
```

### 2. 테스트 사용자 생성
1. 새 브라우저/시크릿 모드에서 회원가입
2. 서버 로그에서 웹훅 호출 확인
3. 데이터베이스에서 사용자 생성 확인

### 3. 수동 검증 스크립트
```bash
# 사용자 데이터 확인
npm run tsx scripts/check-user-data.js

# Clerk-DB 동기화
npm run tsx scripts/sync-clerk-users.js
```

## 🎯 체크리스트

- [ ] Clerk 대시보드에서 웹훅 엔드포인트 존재 확인
- [ ] 올바른 URL 설정 (로컬/프로덕션)
- [ ] `user.created` 이벤트 활성화
- [ ] 최신 시크릿 키 복사 및 적용
- [ ] 서버 재시작
- [ ] 테스트 사용자로 검증

---

**참고**: 웹훅 설정 변경 후에는 반드시 서버를 재시작해야 합니다.
