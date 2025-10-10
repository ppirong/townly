# Claude API 설정 가이드

할인 전단지 OCR 분석을 위해 Claude API를 사용합니다.

## 환경 변수 확인

이 프로젝트는 이미 `.env.local` 파일에 설정된 `ANTHROPIC_API_KEY`를 사용합니다. 별도의 추가 설정이 필요하지 않습니다.

## 참고: API 키가 없는 경우

만약 `ANTHROPIC_API_KEY`가 설정되어 있지 않다면:

1. [Anthropic Console](https://console.anthropic.com/)에 가입하고 로그인합니다.
2. API 키 섹션으로 이동하여 새 API 키를 생성합니다.
3. 생성된 API 키를 안전한 곳에 복사합니다.
4. `.env.local` 파일에 다음 환경 변수를 추가합니다:

```
ANTHROPIC_API_KEY=your_api_key_here
```

실제 API 키로 `your_api_key_here` 부분을 대체하세요.

## 주의사항

- API 키를 공개 저장소에 커밋하지 마세요.
- API 사용량을 모니터링하고 요금제 한도를 확인하세요.
- Claude API는 요청당 비용이 발생할 수 있습니다.

## 문제 해결

OCR 분석 중 오류가 발생하면 다음을 확인하세요:

1. `.env.local` 파일에 `ANTHROPIC_API_KEY`가 올바르게 설정되어 있는지 확인
2. 네트워크 연결 상태 확인
3. API 할당량 초과 여부 확인
4. 서버 로그에서 자세한 오류 메시지 확인
