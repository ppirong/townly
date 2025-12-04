# 🚀 프로덕션 웹훅 설정 가이드

## 📋 현재 상황

### ✅ 확인된 사항
- **프로덕션 도메인**: `https://towny-kr.vercel.app`
- **웹훅 엔드포인트**: `https://towny-kr.vercel.app/api/webhooks/clerk`
- **엔드포인트 상태**: ✅ 접근 가능 (405 Method Not Allowed는 정상)
- **로컬 시크릿**: `whsec_LBzpdRqXgu4cFWz0oYGN0GiSTd2bRJ3N` (형식 올바름)

### ❌ 해결 필요한 문제
- **프로덕션 환경변수**: `CLERK_WEBHOOK_SECRET`이 설정되지 않음
- **오류 메시지**: "Webhook secret not configured"

## 🔧 해결 방법

### 1단계: Vercel 환경변수 설정

1. **Vercel 대시보드 접속**:
   ```
   https://vercel.com/dashboard
   ```

2. **프로젝트 선택**: `towny-kr` 프로젝트 클릭

3. **Settings 탭** → **Environment Variables** 클릭

4. **새 환경변수 추가**:
   ```
   Name: CLERK_WEBHOOK_SECRET
   Value: whsec_LBzpdRqXgu4cFWz0oYGN0GiSTd2bRJ3N
   Environment: Production, Preview, Development (모두 선택)
   ```

5. **Save** 버튼 클릭

### 2단계: Clerk 대시보드 웹훅 설정

1. **Clerk 대시보드 접속**:
   ```
   https://dashboard.clerk.com
   ```

2. **프로젝트 선택** → **Webhooks** 메뉴

3. **웹훅 엔드포인트 설정**:
   - **URL**: `https://towny-kr.vercel.app/api/webhooks/clerk`
   - **Events**: `user.created` 활성화

4. **Signing Secret 확인**:
   - 현재 시크릿이 `whsec_LBzpdRqXgu4cFWz0oYGN0GiSTd2bRJ3N`와 일치하는지 확인
   - 다르다면 새 시크릿을 복사하여 Vercel 환경변수 업데이트

### 3단계: 배포 및 테스트

1. **재배포 트리거**:
   - Vercel에서 환경변수 변경 후 자동 재배포됨
   - 또는 GitHub에 새 커밋 푸시

2. **웹훅 테스트**:
   ```bash
   curl -X POST https://towny-kr.vercel.app/api/webhooks/clerk \
     -H "Content-Type: application/json" \
     -H "svix-id: test_id" \
     -H "svix-timestamp: $(date +%s)" \
     -H "svix-signature: test_signature" \
     -d '{"type": "test", "data": {"test": true}}'
   ```

   **예상 응답**: `{"error":"Invalid webhook signature"}` (시크릿 설정됨을 의미)

3. **실제 사용자 테스트**:
   - 새 브라우저에서 회원가입 진행
   - 데이터베이스에 사용자 추가 확인

## 📊 검증 방법

### 환경변수 확인
```bash
# Vercel CLI 사용 (설치된 경우)
vercel env ls

# 또는 Vercel 대시보드에서 확인
```

### 웹훅 로그 확인
- Vercel 대시보드 → Functions 탭에서 웹훅 실행 로그 확인
- 성공적인 웹훅 호출 시 다음 로그가 나타남:
  ```
  🔔 Clerk 웹훅 호출됨 - 시작
  ✅ 웹훅 시크릿 확인됨
  📋 웹훅 페이로드: { eventType: 'user.created', userId: '...' }
  ✅ Clerk 웹훅 처리 완료
  ```

### 데이터베이스 동기화 확인
```bash
# 로컬에서 실행
DATABASE_URL="..." npx tsx scripts/test-production-webhook.js
```

## 🚨 문제 해결

### "Webhook secret not configured" 오류
- **원인**: Vercel 환경변수 미설정
- **해결**: 위 1단계 수행

### "Invalid webhook signature" 오류
- **원인**: 시크릿 키 불일치
- **해결**: Clerk 대시보드에서 올바른 시크릿 복사

### 웹훅이 호출되지 않음
- **원인**: Clerk에서 웹훅 URL 미설정 또는 잘못된 URL
- **해결**: Clerk 대시보드에서 정확한 URL 설정

### 사용자가 DB에 추가되지 않음
- **원인**: 웹훅 처리 중 오류 발생
- **해결**: Vercel 함수 로그에서 오류 확인

## ✅ 체크리스트

- [ ] Vercel 환경변수 `CLERK_WEBHOOK_SECRET` 설정
- [ ] Clerk 웹훅 URL을 `https://towny-kr.vercel.app/api/webhooks/clerk`로 설정
- [ ] `user.created` 이벤트 활성화
- [ ] 시크릿 키 일치 확인
- [ ] 재배포 완료
- [ ] 테스트 사용자로 검증

---

**다음 단계**: 위 체크리스트를 순서대로 수행한 후 새 사용자 가입으로 테스트
