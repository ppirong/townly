# 🤖 Claude API 설정 가이드

카카오 챗봇에 Claude-3.5-Sonnet을 연결하기 위한 설정 가이드입니다.

## 1. Claude API 키 발급

### Anthropic 콘솔에서 API 키 생성
1. [Anthropic Console](https://console.anthropic.com/)에 접속
2. 계정 생성 또는 로그인
3. "API Keys" 섹션으로 이동
4. "Create Key" 버튼 클릭
5. API 키 복사

## 2. 환경변수 설정

### 로컬 개발 환경
`.env.local` 파일에 다음 환경변수 추가:

```bash
# Claude API 설정
ANTHROPIC_API_KEY=your_claude_api_key_here
```

### Vercel 배포 환경
1. Vercel 대시보드에서 프로젝트 선택
2. Settings → Environment Variables
3. 새 환경변수 추가:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: (발급받은 Claude API 키)
   - **Environment**: Production, Preview, Development 모두 체크

## 3. 현재 구성 상태

### ✅ 완료된 작업
- Anthropic SDK 설치 (`@anthropic-ai/sdk`)
- Claude 서비스 모듈 생성 (`src/lib/services/claude.ts`)
- 웹훅에서 OpenAI → Claude로 교체
- 환경변수 타입 정의 추가
- 에러 핸들링 및 fallback 로직

### 🔧 사용 중인 모델
- **Model**: `claude-3-5-sonnet-20241022` (최신 Claude 3.5 Sonnet)
- **Max Tokens**: 500 (카카오톡 메시지 길이 제한 고려)
- **Temperature**: 0.7 (적당한 창의성)

## 4. 테스트 방법

### API 키 설정 전 (현재 상태)
```bash
npm run test:webhook "테스트 메시지"
# → "AI 서비스 설정에 문제가 있습니다" 응답 (fallback)
```

### API 키 설정 후
```bash
npm run test:webhook "강남역 맛집 추천해줘"
# → Claude가 생성한 실제 맛집 추천 응답
```

## 5. Claude vs ChatGPT 비교

| 특성 | Claude 3.5 Sonnet | ChatGPT 3.5 Turbo |
|------|------------------|-------------------|
| **응답 품질** | 더 자연스럽고 일관성 있음 | 좋음 |
| **한국어 지원** | 매우 우수 | 좋음 |
| **컨텍스트 이해** | 뛰어남 | 좋음 |
| **안전성** | 높음 | 높음 |
| **비용** | 약간 높음 | 저렴 |
| **속도** | 빠름 | 빠름 |

## 6. 모니터링

### 로그 확인
개발 서버 콘솔에서 다음 로그 확인:
```
🔧 로컬 개발 환경에서 실행 중
👤 사용자 test_user_xxx: "테스트 메시지"
🤖 claude 응답: "Claude가 생성한 응답"
⏱️ AI 응답 생성 시간: 1234ms
```

### 데이터베이스 로그
모든 Claude 응답은 `kakao_messages` 테이블에 저장:
- `response_type`: 'claude' (성공 시) 또는 'fallback' (실패 시)
- `processing_time`: API 호출 시간

## 7. 트러블슈팅

### API 키 관련 에러
```
"AI 서비스 설정에 문제가 있습니다"
```
→ ANTHROPIC_API_KEY 환경변수 확인

### 사용량 초과 에러
```
"AI 서비스 사용량이 초과되었습니다"
```
→ Anthropic 콘솔에서 사용량 및 결제 정보 확인

### 응답 속도 문제
```
"응답 처리 시간이 초과되었습니다"
```
→ 네트워크 상태 확인 또는 메시지를 더 간단하게 작성

## 8. 다음 단계

API 키 설정 후:
1. 다양한 메시지 유형으로 테스트
2. 응답 품질 확인
3. 필요시 프롬프트 미세 조정
4. 프로덕션 배포 및 모니터링

---

Claude API 키 설정이 완료되면 더 나은 챗봇 경험을 제공할 수 있습니다! 🚀
