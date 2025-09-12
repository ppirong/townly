# 환경 변수 설정 가이드

Townly 프로젝트의 환경 변수 설정 방법을 안내합니다.

## 필수 환경 변수

### 1. Clerk Authentication
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
```

### 2. OpenAI API
```bash
OPENAI_API_KEY=sk-your_openai_api_key
```

### 3. Kakao Channel Talk API
```bash
# Towny 채널 정보
KAKAO_CHANNEL_ID=실제_채널_ID        # 카카오 관리자에서 확인 필요
KAKAO_CHANNEL_PUBLIC_ID=_wcyDn      # Towny 채널 퍼블릭 ID
KAKAO_BOT_ID=68bef0501c4ef66e4f5d73be  # towny 챗봇 ID
KAKAO_API_KEY=your_kakao_api_key
KAKAO_SECRET_KEY=your_kakao_secret_key
```

### 4. Webhook Security
```bash
WEBHOOK_SECRET=your_webhook_secret_key
```

### 5. Application URL (선택사항)
```bash
# 자동으로 환경에 따라 설정됩니다
# Production: https://townly.vercel.app
# Development: http://localhost:3000

# 수동으로 설정하려면:
NEXT_PUBLIC_APP_URL=https://townly.vercel.app
```

## 환경별 설정

### 로컬 개발 환경
1. 프로젝트 루트에 `.env.local` 파일 생성
2. 위의 환경 변수들을 설정
3. 개발 모드 옵션 (선택사항):
   ```bash
   SKIP_WEBHOOK_VERIFICATION=true  # 웹훅 서명 검증 건너뛰기
   ```

### Vercel Production 환경
1. Vercel 대시보드에서 프로젝트 설정으로 이동
2. Environment Variables 섹션에서 환경 변수 추가
3. 모든 필수 환경 변수를 Production 환경에 설정

## 환경 변수 확인

애플리케이션 실행 시 콘솔에서 환경 변수 설정 상태를 확인할 수 있습니다:
- ✅ 정상 설정된 변수
- ⚠️ 누락되거나 기본값을 사용하는 변수
- ❌ 필수 변수 누락 (프로덕션 환경)

## Vercel 배포 설정

1. GitHub 연동을 통한 자동 배포가 설정되어 있습니다.
2. `main` 브랜치에 push하면 자동으로 배포됩니다.
3. 환경 변수가 누락된 경우 배포가 실패할 수 있습니다.

## 보안 주의사항

- `.env.local` 파일은 절대 git에 커밋하지 마세요
- API 키와 시크릿 키는 안전하게 보관하세요
- 프로덕션 환경에서는 반드시 실제 API 키를 사용하세요
