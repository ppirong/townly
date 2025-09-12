# 카카오 챗봇 ChatGPT 연동 가이드

카카오톡 챗봇에 ChatGPT를 연결하여 AI 기반 응답을 제공하는 기능이 구현되었습니다.

## 🎯 주요 기능

### 1. ChatGPT 기반 응답
- 사용자 메시지를 ChatGPT API로 전송하여 맞춤형 응답 생성
- Townly 브랜드 컨텍스트에 맞는 하이퍼 로컬 정보 제공
- 지역별 맛집, 카페, 편의시설 정보 추천

### 2. 스마트 컨텍스트 처리
- 메시지 유형에 따른 맞춤형 시스템 프롬프트 생성
- 맛집, 교통, 일반 질문별 특화된 응답 로직
- 한국어 기반 친근한 톤앤매너

### 3. 강력한 오류 처리
- ChatGPT API 실패 시 자동 폴백 응답
- API 키 오류, 할당량 초과, 타임아웃 등 상황별 에러 메시지
- 데이터베이스 저장 실패와 독립적인 웹훅 응답 처리

### 4. 상세한 로깅 시스템
- 모든 메시지와 AI 응답을 데이터베이스에 저장
- 응답 타입(chatgpt, fallback, error) 구분 기록
- AI 응답 생성 시간 측정 및 로깅

## 🚀 설정 방법

### 1. 환경변수 설정

`.env.local` 파일에 OpenAI API 키를 추가하세요:

```bash
# OpenAI API (ChatGPT 연동용)
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. 데이터베이스 마이그레이션

새로운 필드가 추가된 데이터베이스 스키마를 적용하세요:

```bash
# 마이그레이션 생성 (이미 완료됨)
npx drizzle-kit generate

# 마이그레이션 적용
npx drizzle-kit push
```

### 3. 패키지 설치

OpenAI 패키지가 설치되어 있는지 확인하세요:

```bash
npm install openai --legacy-peer-deps
```

## 📊 모니터링

### 1. 데이터베이스 로깅

`kakao_messages` 테이블에 다음 정보가 저장됩니다:

- `message`: 사용자 입력 메시지
- `aiResponse`: ChatGPT 생성 응답
- `responseType`: 응답 유형 (chatgpt/fallback/error)
- `processingTime`: AI 응답 생성 시간

### 2. 콘솔 로깅

실시간으로 다음 정보를 확인할 수 있습니다:

```
👤 사용자 user123: "강남역 맛집 추천해줘"
🤖 chatgpt 응답: "🍽️ 강남역 맛집을 추천드릴게요!..."
⏱️ AI 응답 생성 시간: 1234ms
💾 메시지와 AI 응답이 데이터베이스에 저장되었습니다. ID: abc-123
```

## 🧪 테스트 방법

### 1. 자동 테스트 실행

포함된 테스트 스크립트를 사용하여 통합 테스트를 실행하세요:

```bash
# Next.js 서버 시작 (별도 터미널)
npm run dev

# 테스트 실행
node test-chatgpt-integration.js
```

### 2. 수동 테스트

카카오톡 챗봇 또는 카카오 비즈니스 채널을 통해 직접 메시지를 보내서 테스트할 수 있습니다.

#### 추천 테스트 메시지:
- "안녕하세요" (인사말 테스트)
- "강남역 맛집 추천해줘" (맛집 추천 테스트)
- "홍대 카페 어디가 좋을까?" (카페 추천 테스트)
- "도움말" (기능 안내 테스트)

## 🔧 커스터마이징

### 1. 시스템 프롬프트 수정

`src/lib/services/openai.ts`에서 시스템 프롬프트를 수정할 수 있습니다:

```typescript
const defaultSystemPrompt = `당신은 "Townly"라는 하이퍼 로컬 정보 에이전트입니다...`;
```

### 2. ChatGPT 모델 변경

비용과 성능을 고려하여 모델을 변경할 수 있습니다:

```typescript
const completion = await openai.chat.completions.create({
  model: "gpt-3.5-turbo", // 또는 "gpt-4"로 변경
  // ...
});
```

### 3. 응답 길이 조절

카카오톡 메시지 특성에 맞게 응답 길이를 조절할 수 있습니다:

```typescript
max_tokens: 500, // 원하는 길이로 조절
```

## 📈 성능 최적화

### 1. 응답 속도 개선
- 적절한 `max_tokens` 설정으로 응답 시간 단축
- 자주 묻는 질문에 대한 캐싱 구현 (선택사항)

### 2. 비용 관리
- `gpt-3.5-turbo` 모델 사용으로 비용 효율성 확보
- 적절한 토큰 제한으로 과도한 API 사용 방지

### 3. 에러 처리 강화
- 다양한 에러 시나리오에 대한 맞춤형 폴백 응답
- 재시도 로직 구현 (필요시)

## 🔍 문제 해결

### 1. ChatGPT 응답이 없는 경우
- OpenAI API 키 확인
- API 할당량 및 결제 상태 확인
- 네트워크 연결 상태 확인

### 2. 응답이 느린 경우
- `max_tokens` 값 조정
- 시스템 프롬프트 길이 최적화
- 네트워크 지연 상황 확인

### 3. 부적절한 응답이 나오는 경우
- 시스템 프롬프트 수정
- 응답 검증 로직 강화
- 사용자 입력 필터링 추가

## 📚 관련 파일

### 주요 구현 파일
- `src/lib/services/openai.ts`: OpenAI API 연결 서비스
- `src/app/api/kakao/webhook/route.ts`: 카카오 웹훅 핸들러
- `src/db/schema.ts`: 데이터베이스 스키마 (업데이트됨)

### 설정 파일
- `.env.local`: 환경변수 설정
- `src/lib/env.ts`: 환경변수 타입 정의

### 테스트 파일
- `test-chatgpt-integration.js`: 통합 테스트 스크립트

## 🎉 결론

ChatGPT 연동을 통해 Townly 카카오톡 챗봇이 더욱 지능적이고 유용한 서비스를 제공할 수 있게 되었습니다. 

지역 맞춤형 정보 제공, 자연스러운 대화, 강력한 오류 처리를 통해 사용자 경험을 크게 향상시킬 수 있습니다.

추가 기능이나 개선사항이 필요하시면 언제든 문의해주세요! 🏘️✨
