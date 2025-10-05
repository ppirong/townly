# 날씨 안내 이메일 작성 에이전트 가이드

## 개요

이 시스템은 **Claude Sonnet 3.5**와 **Claude Sonnet 4.5** 두 개의 AI 에이전트가 협업하여 고품질의 날씨 안내 이메일을 자동으로 작성합니다.

### 에이전트 역할

- **Claude Sonnet 3.5** (작성자): 날씨 데이터를 기반으로 이메일 내용을 작성
- **Claude Sonnet 4.5** (검토자): 작성된 내용을 평가하고 개선 방향을 제시

### 작동 방식

1. Claude Sonnet 3.5가 날씨 안내 이메일을 작성합니다.
2. Claude Sonnet 4.5가 작성된 내용을 검토하고 점수를 매깁니다.
3. 점수가 80점 이상이면 승인하고, 그렇지 않으면 개선 방향을 제시합니다.
4. 이 과정을 **최대 5회** 반복하여 최종 이메일을 확정합니다.

## 시스템 구성

### 1. 핵심 서비스 클래스

#### WeatherEmailWriter
- **파일**: `src/lib/services/weather-email-writer.ts`
- **모델**: Claude Sonnet 3.5
- **역할**: 날씨 안내 이메일 내용 작성
- **입력**: 날씨 데이터 (기온, 강우확률, 적설확률 등)
- **출력**: 작성된 이메일 내용

#### WeatherEmailReviewer
- **파일**: `src/lib/services/weather-email-reviewer.ts`
- **모델**: Claude Sonnet 4.5
- **역할**: 작성된 이메일 검토 및 평가
- **입력**: 작성된 이메일 내용, 날씨 데이터
- **출력**: 점수, 승인 여부, 개선 피드백

#### WeatherEmailAgent
- **파일**: `src/lib/services/weather-email-agent.ts`
- **역할**: 작성자와 검토자 간의 순환 프로세스 관리
- **기능**: 최대 5회 순환, 80점 이상 승인, 실행 리포트 생성

#### WeatherEmailDataPreparer
- **파일**: `src/lib/services/weather-email-data-preparer.ts`
- **역할**: 데이터베이스에서 날씨 데이터 조회 및 변환
- **기능**: 사용자별 위치, 시간별/일별 날씨 데이터 준비

### 2. API 및 Server Actions

#### Server Actions
- **파일**: `src/actions/weather-email-agent.ts`
- **함수**:
  - `generateWeatherEmailForUser`: 특정 사용자의 날씨 안내 이메일 생성
  - `generateTestWeatherEmail`: 테스트용 샘플 이메일 생성

#### API 엔드포인트
- **POST** `/api/weather-email-agent`: 실제 사용자 이메일 생성
- **POST** `/api/weather-email-agent/test`: 테스트용 이메일 생성

### 3. 관리자 페이지
- **경로**: `/admin/weather-email-agent`
- **파일**: `src/app/admin/weather-email-agent/page.tsx`
- **컴포넌트**: `src/components/admin/WeatherEmailAgentDemo.tsx`

## 평가 기준

Claude Sonnet 4.5가 작성된 이메일을 평가할 때 사용하는 기준:

### 1. 강우 정보 (필수)
- 강우 확률 70% 이상인 시간을 **모두** 제공
- 형식: "시간: 강우량, 강우확률"
- 예시: "11시: 강우량 10mm, 강우 확률 75%"

### 2. 적설 정보 (조건부)
- 겨울철(12월, 1월, 2월): 항상 제공
- 기타 계절: 적설 확률 70% 이상일 때만 제공
- 형식: "시간: 적설량, 적설확률"
- 예시: "15시: 적설량 3mm, 적설 확률 75%"

### 3. 시간 표시
- 모든 시간은 **KST (한국 표준시)** 기준
- UTC나 다른 시간대 사용 금지

### 4. 주의사항 (발송 시간 및 날씨 기반)
- **밤(18시~다음날 6시) + 비**: 창문 관련 주의사항
- **낮(6시~18시) + 비**: 우산 관련 주의사항
- **아침 출근 시간 + 눈**: 일찍 출근 주의사항 (전날 18시 발송)
- **폭염(35도 이상)** 또는 **한파(-10도 이하)**: 적절한 주의사항

### 5. 가독성
- 날씨 안내 항목 사이에 적절한 빈 라인
- 여러 항목이 한 줄로 연결되지 않도록

### 6. 필수 항목
- 제목: "[Townly 날씨 안내]" 포함
- 날짜 및 시간 범위
- 사용자 위치 (주소)
- 기온 (최저~최고)
- AccuWeather 헤드라인 (있는 경우)
- 날씨 정보 확인 주소: https://townly.vercel.app/weather
- 생성 방법: "날씨 안내 정보를 Claude 4.5 sonnet을 이용해서 작성했습니다"

## 날씨 안내 작성 규칙

Claude Sonnet 3.5가 이메일을 작성할 때 따르는 규칙:

### 제목
```
[Townly 날씨 안내] YYYY-MM-DD HH시부터 HH시까지 날씨 안내
```

### 발송 시간별 안내 범위
- **6시 발송**: 6시부터 18시까지 (당일 낮 날씨)
- **18시 발송**: 18시부터 다음 날 6시까지 (밤~다음날 아침 날씨)

### 내용 구성
1. 날씨 헤드라인 (AccuWeather)
2. 사용자 위치
3. 기온 (최저~최고)
4. 비가 내리는 시간 (강우 확률 70% 이상)
5. 눈이 내리는 시간 (겨울철 또는 적설 확률 70% 이상)
6. 비와 눈이 내리는 시간 (섞여 있을 때, 시간순 정렬)
7. 주의사항
8. 날씨 정보 확인 주소
9. 생성 방법 소개

## 사용 방법

### 1. 환경변수 설정

`.env.local` 파일에 다음 환경변수를 추가:

```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. 관리자 페이지에서 테스트

1. 브라우저에서 `/admin/weather-email-agent` 접속
2. 발송 시간 선택 (아침 6시 또는 저녁 18시)
3. "날씨 안내 이메일 생성" 버튼 클릭
4. 결과 확인:
   - **이메일 내용** 탭: 최종 생성된 이메일
   - **실행 리포트** 탭: 순환 과정 상세 정보

### 3. API 호출

#### 테스트용 이메일 생성

```bash
curl -X POST http://localhost:3000/api/weather-email-agent/test \
  -H "Content-Type: application/json" \
  -d '{"sendTime": 6}'
```

#### 실제 사용자 이메일 생성

```bash
curl -X POST http://localhost:3000/api/weather-email-agent \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_xxxxx",
    "sendTime": 18
  }'
```

### 4. Server Action에서 호출

```typescript
import { generateWeatherEmailForUser } from '@/actions/weather-email-agent';

const result = await generateWeatherEmailForUser({
  userId: 'user_xxxxx',
  sendTime: 6,
});

if (result.success) {
  console.log('생성된 이메일:', result.email);
  console.log('최종 점수:', result.score);
  console.log('순환 횟수:', result.iterations);
}
```

## 실행 결과 예시

### 성공 응답

```json
{
  "success": true,
  "email": "[Townly 날씨 안내] 2025-10-05 6시부터 18시까지 날씨 안내\n\n...",
  "iterations": 3,
  "score": 92,
  "isApproved": true,
  "executionTime": 45230,
  "report": "============================================================\n날씨 안내 이메일 작성 에이전트 실행 리포트\n..."
}
```

### 실패 응답

```json
{
  "success": false,
  "error": "사용자 위치 정보를 찾을 수 없습니다."
}
```

## 데이터베이스 요구사항

이 시스템은 다음 테이블의 데이터가 필요합니다:

### 1. hourlyWeatherData
- 시간별 날씨 정보 (기온, 강우확률, 강수량 등)
- `clerkUserId`로 사용자별 필터링

### 2. dailyWeatherData
- 일별 날씨 정보 (헤드라인 포함)

### 3. userLocations
- 사용자 위치 정보 (주소, 도시명)

### 4. userEmailSettings
- 사용자 이메일 수신 설정
- 구독 상태, 발송 시간별 수신 여부

## 성능 및 비용

### 예상 실행 시간
- 1회 순환: 약 15-20초
- 평균 3회 순환: 약 45-60초
- 최대 5회 순환: 약 75-100초

### 토큰 사용량 (예상)
- Claude Sonnet 3.5 (1회): 약 1,000-2,000 토큰
- Claude Sonnet 4.5 (1회): 약 1,500-2,500 토큰
- 평균 총 사용량 (3회 순환): 약 10,000-15,000 토큰

### 비용 절감 팁
1. `maxIterations`를 3으로 제한
2. `minApprovalScore`를 70-75로 낮춤
3. 캐싱을 통한 날씨 데이터 재사용

## 트러블슈팅

### 문제: "ANTHROPIC_API_KEY is not configured"
**해결**: `.env.local` 파일에 `ANTHROPIC_API_KEY` 추가 후 서버 재시작

### 문제: "사용자 위치 정보를 찾을 수 없습니다"
**해결**: `userLocations` 테이블에 해당 사용자의 위치 데이터 추가

### 문제: "날씨 데이터를 준비할 수 없습니다"
**해결**: 
1. `hourlyWeatherData` 테이블에 최신 날씨 데이터 확인
2. AccuWeather API 호출 및 데이터 저장 확인

### 문제: 순환이 5회 모두 사용되었지만 점수가 낮음
**해결**: 
1. 날씨 데이터가 완전한지 확인 (모든 필수 필드 포함)
2. 평가 기준을 완화 (`minApprovalScore` 낮춤)
3. 로그를 확인하여 어떤 항목에서 감점되는지 분석

## 향후 개선 계획

- [ ] Gmail API 연동하여 실제 이메일 발송
- [ ] 크론 작업으로 매일 자동 발송
- [ ] 사용자별 맞춤형 스타일 적용
- [ ] 다국어 지원 (영어, 일본어 등)
- [ ] 이메일 템플릿 시각화 (HTML)
- [ ] A/B 테스트 및 사용자 피드백 수집

## 참고 자료

- [Anthropic API 문서](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Claude Sonnet 3.5 모델 정보](https://www.anthropic.com/news/claude-3-5-sonnet)
- [Claude Sonnet 4.5 모델 정보](https://www.anthropic.com/news/claude-4-5-sonnet)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
