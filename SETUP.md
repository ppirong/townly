# Townly 설정 가이드

하이퍼 로컬 기반 정보 제공 에이전트 설정 방법입니다.

## 1. 카카오 개발자 계정 설정

### 1.1 카카오 디벨로퍼스 앱 생성
1. [카카오 디벨로퍼스](https://developers.kakao.com/)에 접속
2. 내 애플리케이션 > 애플리케이션 추가하기
3. 앱 이름: "Townly"
4. 회사명: 본인 회사명 입력

### 1.2 카카오 로그인 설정
1. 제품 설정 > 카카오 로그인 활성화
2. OpenID Connect 활성화 (권장)
3. Redirect URI 설정:
   - 개발환경: `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`
   - 운영환경: `https://your-production-domain.com/v1/oauth_callback`
   
   **중요**: Clerk Dashboard의 Social connections에서 정확한 callback URL 확인 필요

### 1.2.1 Client Secret 생성
1. 제품 설정 > 카카오 로그인 > 보안
2. Client Secret 코드 생성 활성화
3. Client Secret 코드 생성 후 안전하게 보관 (한 번만 표시됨)

### 1.3 동의항목 설정
필수 동의항목:
- 닉네임
- 프로필 사진
- 카카오계정(이메일)

선택 동의항목:
- 카카오계정(이메일)
- 성별
- 연령대

## 2. Clerk 설정

### 2.1 Clerk 계정 생성
1. [Clerk](https://clerk.com/) 회원가입
2. 새 애플리케이션 생성: "Townly"

### 2.2 소셜 로그인 설정

#### 카카오 OAuth 수동 설정 (권장)
카카오는 Discovery Endpoint를 완전히 지원하지 않으므로 수동 설정을 사용합니다:

1. Clerk Dashboard > Authentication > Social connections
2. "Add connection" > "Custom OIDC" 또는 "Custom OAuth" 선택
3. 다음 정보를 정확히 입력:

**기본 설정:**
- **Provider Name**: `Kakao`
- **Client ID**: 카카오 앱의 REST API 키
- **Client Secret**: 카카오에서 생성한 Client Secret

**OAuth 엔드포인트 (수동 입력):**
- **Authorization URL**: `https://kauth.kakao.com/oauth/authorize`
- **Token URL**: `https://kauth.kakao.com/oauth/token`
- **Userinfo URL**: `https://kapi.kakao.com/v2/user/me`

**추가 설정:**
- **Scopes**: `profile_nickname profile_image account_email`
- **Response Type**: `code`
- **Grant Type**: `authorization_code`

4. "Save connection" 클릭

**중요**: 카카오 앱에서 OpenID Connect를 활성화해야 합니다.

### 2.3 기타 로그인 방법 비활성화
1. Email/Password 로그인 비활성화
2. Phone number 로그인 비활성화
3. 다른 소셜 로그인 모두 비활성화

## 3. 환경 변수 설정

`.env.local` 파일에 다음 값들을 실제 키로 교체:

```bash
# Clerk 환경 변수
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# 카카오 OAuth 환경 변수
KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# 외부 API 키들
ACCUWEATHER_API_KEY=your_accuweather_api_key
AIRKOREA_API_KEY=your_airkorea_api_key
OPENAI_API_KEY=your_openai_api_key
```

## 4. 카카오톡 채널 설정

### 4.1 카카오톡 채널 생성
1. [카카오톡 채널 관리자센터](https://center-pf.kakao.com/) 접속
2. 새 채널 생성: "Townly 정보봇"
3. 채널 ID 확인 및 저장

### 4.2 카카오 i 오픈빌더 설정
1. [카카오 i 오픈빌더](https://i.kakao.com/) 접속
2. 새 봇 생성 및 채널 연결
3. 웹훅 스킬 서버 URL 설정: `https://your-domain.com/api/kakao/webhook`

## 5. 외부 API 설정

### 5.1 AccuWeather API
1. [AccuWeather API](https://developer.accuweather.com/) 가입
2. API Key 발급
3. 무료 플랜 제한: 일 50회 호출

### 5.2 에어코리아 API
1. [에어코리아 OpenAPI](https://www.airkorea.or.kr/web/contents/contentView/?pMENU_NO=138&cntnts_no=74) 신청
2. 인증키 발급
3. 일일 호출 제한 확인

### 5.3 OpenAI API
1. [OpenAI Platform](https://platform.openai.com/) 가입
2. API Key 발급
3. 사용량 모니터링 설정

## 6. 개발 서버 실행

```bash
npm install
npm run dev
```

http://localhost:3000 접속하여 카카오 로그인 테스트

## 7. 배포 (Vercel)

1. GitHub에 코드 푸시
2. Vercel 연결 및 자동 배포
3. 환경 변수 Vercel에 설정
4. 도메인 설정 후 카카오 Redirect URI 업데이트

## 다음 단계

- [ ] 데이터베이스 스키마 설계
- [ ] 위치 서비스 구현
- [ ] 외부 API 통합
- [ ] 카카오톡 챗봇 구현
- [ ] 알림 시스템 구축
