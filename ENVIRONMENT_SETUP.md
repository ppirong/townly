# 환경변수 설정 가이드

미세먼지 정보 조회 기능을 사용하기 위해서는 환경변수 설정이 필요합니다.

## .env.local 파일 생성

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Clerk 인증 설정 (필수)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# 데이터베이스 설정 (필수)
DATABASE_URL=your_database_url

# AI API 키들
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# 카카오 API 설정
KAKAO_API_KEY=your_kakao_api_key
KAKAO_REST_API_KEY=your_kakao_rest_api_key
KAKAO_ADMIN_KEY=your_kakao_admin_key
KAKAO_CHANNEL_ID=your_kakao_channel_id
KAKAO_SENDER_KEY=your_kakao_sender_key
KAKAO_TEMPLATE_ID=your_kakao_template_id

# AccuWeather API (날씨 정보)
ACCUWEATHER_API_KEY=your_accuweather_api_key

# 한국환경공단 에어코리아 API (미세먼지 정보) - 필수
AIRKOREA_API_KEY=your_airkorea_api_key

# 서버 설정
NODE_ENV=development
PORT=3000
```

## 에어코리아 API 키 발급 방법

1. [한국환경공단 에어코리아 API 페이지](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15073861)에 접속
2. 회원가입 후 로그인
3. 활용신청 클릭
4. 신청 정보 입력 (보통 즉시 승인)
5. 마이페이지에서 발급된 API 키 확인
6. `.env.local` 파일에 `AIRKOREA_API_KEY=발급받은키` 추가

## 주의사항

- `.env.local` 파일은 절대 Git에 커밋하지 마세요 (이미 .gitignore에 포함됨)
- API 키는 외부에 노출되지 않도록 주의하세요
- 환경변수 변경 후에는 개발 서버를 재시작하세요 (`npm run dev`)

## 에러 해결

### "AIRKOREA_API_KEY가 설정되지 않았습니다" 에러
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. `AIRKOREA_API_KEY=` 형태로 올바르게 설정했는지 확인
3. API 키에 공백이나 따옴표가 없는지 확인
4. 개발 서버 재시작 (`Ctrl+C` 후 `npm run dev`)

### API 호출 실패 에러
1. API 키가 올바르게 발급되었는지 확인
2. API 키의 사용량 제한을 초과하지 않았는지 확인
3. 네트워크 연결 상태 확인
